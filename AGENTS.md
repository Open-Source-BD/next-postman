<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [next-postman] recent context, 2026-06-19 2:16pm GMT+6

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 11 obs (5,918t read) | 643,446t work | 99% savings

### Jun 18, 2026
910 9:49p ⚖️ next-postman Phase 1+2 Plan — Collection Runner + Git-native Storage Architecture
915 9:51p 🔵 next-postman — Critical Code-Path Findings for Phase 1 Runner Plan
S134 Brutally honest technical review of next-postman Phase 1+2 plan — find logical gaps, unstated assumptions, feasibility risks, sequencing problems (Jun 18 at 9:51 PM)
916 11:51p ⚖️ next-postman Phase 4 Realtime Architecture — WebSocket + SSE Plan Locked
921 11:52p 🔵 next-postman Codebase Structure Mapped — All Source Under src/, No Top-Level app/lib/components
922 " 🔵 Existing Proxy Route Confirmed as Full-Buffer — Cannot Stream; executeRequest Pre-Request Bug Already Fixed
923 " 🔵 TabState Has No Protocol Field — Phase 4 Must Add protocol to Types and Update All Consumers
924 " 🔵 Next.js Route Handlers Support ReadableStream Natively — No runtime Export Required for Node.js
925 11:55p 🔵 next-postman Persistence Layer Mapped — Tabs Persisted to localStorage, No Protocol Field
926 " 🔵 UrlBar and RequestPane Are HTTP-Shaped — Phase 4 UI Requires Conditional Rendering or Protocol-Aware Components
927 " 🔵 next-postman Test Infrastructure — jsdom Environment Lacks WebSocket/EventSource; No E2E Setup
928 " 🔵 useApiStore closeTab Replaces Last Tab With Fresh Default — Phase 4 Must Handle Connection Cleanup On Tab Replacement
S136 next-postman Phase 4 (WebSocket + SSE) adversarial gap review — brutally honest critique of locked architectural decisions before implementation begins (Jun 18 at 11:56 PM)
**Investigated**: Deep codebase inspection across all major files relevant to Phase 4: proxyClient.ts (full HTTP request pipeline, auth handling, browser-API bound), executeRequest.ts (pre-request variable fix, AbortController+timeout), src/app/api/proxy/route.ts (confirmed full ArrayBuffer buffering), types.ts (TabState interface, no protocol field), useApiStore.ts (full store — close/replace/history/cleanup paths), persist.ts (localStorage serialization — tabs fully persisted with response stripped), UrlBar.tsx (HTTP method selector), RequestPane.tsx (HTTP sub-tabs), tabDirty.ts (requestKey — HTTP-shaped), useRequestRunner.ts (history write path), vitest.config.ts (jsdom environment), package.json (next 16.2.7, react 19.2.4, no Playwright), Next.js docs on route handlers, streaming, runtime config, maxDuration

**Learned**: - proxyClient.ts is 100% browser-bound (btoa, FormData, Blob, Headers, fetch) — cannot be server-imported for the new SSE stream route
    - executeRequest.ts already fixed the pre-request variable mutation bug (reads sandbox.currentVars() after runPreRequest)
    - The existing proxy route calls await targetRes.arrayBuffer() — fundamentally cannot stream; new route required
    - TabState has no protocol field; HttpMethod is HTTP-only; blast radius of adding protocol spans ~12 files
    - persist.ts stores full tabs to localStorage on every tab state change — any messages[] on TabState would serialize on every WS frame
    - Next.js runtime is Node.js by default; no export const runtime needed; new Response(upstream.body) is architecturally valid but behavior under Next.js's undici fetch is empirically unverified
    - jsdom does NOT support WebSocket or EventSource natively; planned WS unit tests require polyfills or node environment
    - No Playwright in devDependencies — live E2E to echo.websocket.org has no test runner
    - closeTab has a last-tab-replacement path (creates fresh tab) that bypasses explicit close events — connection cleanup must observe tabId removal, not just close actions
    - useRequestRunner prepends http:// to non-http URLs — wss:// would be mangled unless guarded
    - addHistory always fires after every successful request — WS/SSE tabs must bypass this path
    - UrlBar method select and RequestPane sub-tabs are HTTP-shaped — need conditional rendering per protocol

**Completed**: Full adversarial gap analysis delivered covering 35+ specific problems across: SSE streaming implementation risks, security (open SSRF proxy, token leakage in WS query params), protocol design gaps (stream route contract undefined, buildProxyRequest insufficient for POST bodies), browser WebSocket limitations (no CORS bypass, opaque errors), data model problems (messages[] on TabState will thrash localStorage), message cap inadequacy (byte caps needed, binary frames unaddressed), dirty-check breakage, HTTP-shaped consumers that need protocol-awareness, module-level map fragility under Fast Refresh, connection idempotency, SSE parser underspecification, cookie inconsistency between SSE and WS, and test infrastructure gaps

**Next Steps**: Session appears to have concluded with delivery of the gap analysis. The primary session received the full list of missed problems. Likely next work: implement Phase 4 with fixes for the identified gaps, starting with the highest-risk items: (1) SSE streaming route correctness (wrapping ReadableStream for abort propagation, adding maxDuration, SSRF controls), (2) buildProxyRequest extraction that is server-safe (no browser APIs), (3) TabState protocol field + cascade through all HTTP-shaped consumers, (4) connection cleanup via store subscription diffing tabIds, (5) useRequestRunner guard for non-http tabs


Access 643k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>