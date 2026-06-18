/**
 * Realtime connection manager. Owns live WebSocket objects in a module-level
 * map keyed by tab id (live sockets are not serializable → never in the store).
 * Each connection carries a generation number so a stale socket's late
 * onmessage/onclose can't mutate a tab that has since reconnected. Connect is
 * idempotent (double-click safe). SSE is added in Lane B.
 */

export interface RtHandlers {
  onStatus: (status: 'connecting' | 'open' | 'closed' | 'error', info?: string) => void;
  onMessage: (dir: 'recv', text: string, bytes: number) => void;
}

interface LiveConn {
  ws: WebSocket;
  gen: number;
}

const conns = new Map<string, LiveConn>();
let genCounter = 0;

export function isConnected(tabId: string): boolean {
  const c = conns.get(tabId);
  return !!c && (c.ws.readyState === WebSocket.OPEN || c.ws.readyState === WebSocket.CONNECTING);
}

/** Open a WebSocket for a tab. No-op if one is already connecting/open (idempotent). */
export function openWebSocket(tabId: string, url: string, protocols: string[], handlers: RtHandlers): void {
  if (isConnected(tabId)) return;

  const gen = ++genCounter;
  let ws: WebSocket;
  try {
    ws = protocols.length ? new WebSocket(url, protocols) : new WebSocket(url);
  } catch (e) {
    handlers.onStatus('error', (e as Error).message);
    return;
  }
  conns.set(tabId, { ws, gen });

  // Stale-callback guard: only act if this socket is still the current one.
  const alive = () => conns.get(tabId)?.gen === gen;

  handlers.onStatus('connecting');
  ws.onopen = () => alive() && handlers.onStatus('open');
  ws.onmessage = (ev: MessageEvent) => {
    if (!alive()) return;
    const data: unknown = ev.data;
    if (typeof data === 'string') {
      handlers.onMessage('recv', data, byteLen(data));
    } else if (data instanceof Blob) {
      handlers.onMessage('recv', `[binary ${data.size} bytes]`, data.size);
    } else if (data instanceof ArrayBuffer) {
      handlers.onMessage('recv', `[binary ${data.byteLength} bytes]`, data.byteLength);
    } else {
      handlers.onMessage('recv', '[binary]', 0);
    }
  };
  ws.onerror = () => alive() && handlers.onStatus('error', 'WebSocket connection error');
  ws.onclose = (ev: CloseEvent) => {
    if (!alive()) return;
    conns.delete(tabId);
    handlers.onStatus('closed', `code ${ev.code}${ev.reason ? ` — ${ev.reason}` : ''}`);
  };
}

/** Send text on an open socket. Returns false if not open. */
export function sendWebSocket(tabId: string, text: string): boolean {
  const c = conns.get(tabId);
  if (c && c.ws.readyState === WebSocket.OPEN) {
    c.ws.send(text);
    return true;
  }
  return false;
}

/** Manually close a connection. Invalidates callbacks so onclose won't double-fire status. */
export function closeConnection(tabId: string): void {
  const c = conns.get(tabId);
  if (!c) return;
  conns.delete(tabId); // makes alive() false → late onclose/onmessage are ignored
  try {
    c.ws.close();
  } catch {
    // already closing/closed
  }
}

export function byteLen(s: string): number {
  return new Blob([s]).size;
}
