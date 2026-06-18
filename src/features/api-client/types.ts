export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type RequestSubTab = 'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'tests';
export type ResponseSubTab = 'body' | 'headers' | 'types' | 'cookies' | 'testresults' | 'diff';
export type SidebarTab = 'history' | 'collections';

export type KvItemType = 'text' | 'file';

export interface KvItem {
  id: string;
  key: string;
  value: string;
  type?: KvItemType;
  file?: File | null;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2' | 'jwt';

export type ApiKeyIn = 'header' | 'query';

export interface AuthConfig {
  type: AuthType;
  bearer: string;
  basicUser: string;
  basicPass: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyIn: ApiKeyIn;
  oauthToken: string;
  jwtToken: string;
  jwtPrefix: string;
}

export type BodyType = 'none' | 'formdata' | 'urlencoded' | 'raw' | 'graphql';
export type RawType = 'application/json' | 'text/plain' | 'application/xml' | 'text/html';

export interface RequestBody {
  type: BodyType;
  formdata: KvItem[];
  urlencoded: KvItem[];
  rawContent: string;
  rawType: RawType;
  graphql?: { query: string; variables: string };
}

export interface TestResult {
  name: string;
  pass: boolean;
  error?: string;
}

export interface ResponseData {
  ok: boolean;
  status: number;
  statusText: string;
  timeTaken: number;
  size: number;
  rawText: string;
  headers: Record<string, string>;
  testResults: TestResult[];
}

export type Protocol = 'http' | 'ws' | 'sse';

/** A line in a realtime (WebSocket/SSE) connection's message log. */
export interface RtMessage {
  id: string;
  dir: 'sent' | 'recv' | 'system';
  text: string;
  /** byte length of the original payload (for the size cap / display). */
  bytes: number;
  ts: number;
}

export type RtStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

/** Live realtime state for a tab — kept in a separate, non-persisted store slice. */
export interface RealtimeState {
  status: RtStatus;
  messages: RtMessage[];
  /** total messages received this session (the log itself is capped). */
  total: number;
  error?: string;
  /** close code/reason when status is closed/error. */
  closeInfo?: string;
}

export interface TabState {
  id: string;
  /** Transport protocol. Absent = 'http' (back-compat with persisted tabs). */
  protocol?: Protocol;
  method: HttpMethod;
  url: string;
  params: KvItem[];
  headers: KvItem[];
  auth: AuthConfig;
  body: RequestBody;
  scripts: string;
  tests: string;
  response: ResponseData | null;
  /** Previous run's response, kept in-memory for the Diff view (not persisted). */
  prevResponse?: ResponseData | null;
  activeSubTab: RequestSubTab;
  activeResTab: ResponseSubTab;
  /** Id of the saved RequestNode this tab was opened from (for Save vs Save As). */
  sourceNodeId?: string;
  /** Id of the HistoryItem this tab was replayed from (dedupe repeat clicks). */
  sourceHistoryId?: string;
}

export interface HistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  time: number;
  date: string;
  /** Full request snapshot for high-fidelity replay (optional for legacy items). */
  request?: TabState;
}

// --- Collection tree (Postman-style nesting) ---

export type TreeNodeType = 'folder' | 'request';

export interface FolderNode {
  id: string;
  type: 'folder';
  name: string;
  children: TreeNode[];
}

export interface RequestNode {
  id: string;
  type: 'request';
  name: string;
  request: TabState;
}

export type TreeNode = FolderNode | RequestNode;

/** A collection is the root of a tree; its children are folders and requests. */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  children: TreeNode[];
  date: string;
}

/** Legacy flat collection shape (pre-tree). Used only for migration. */
export interface LegacyCollection {
  id: string;
  name: string;
  request: TabState;
  date: string;
}

export interface EnvVar {
  id: string;
  key: string;
  value: string;
  type?: KvItemType;
}

/** A named environment holding a set of variables. */
export interface Environment {
  id: string;
  name: string;
  vars: EnvVar[];
}

export interface ExportData {
  collections: Collection[];
  environments: Environment[];
  globals?: EnvVar[];
  version: number;
}

// --- Postman Collection v2.1 (subset we map to/from) ---

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanUrl {
  raw: string;
}

export interface PostmanAuth {
  type: 'bearer' | 'basic' | 'noauth';
  bearer?: { key: string; value: string }[];
  basic?: { key: string; value: string }[];
}

export interface PostmanBody {
  mode?: 'raw' | 'urlencoded' | 'formdata';
  raw?: string;
  urlencoded?: { key: string; value: string; disabled?: boolean }[];
  formdata?: { key: string; value?: string; type?: 'text' | 'file'; disabled?: boolean }[];
  options?: { raw?: { language?: string } };
}

export interface PostmanRequest {
  method?: string;
  header?: PostmanHeader[];
  url?: PostmanUrl | string;
  auth?: PostmanAuth;
  body?: PostmanBody;
}

export interface PostmanEvent {
  listen: 'prerequest' | 'test';
  script: { exec: string[]; type?: string };
}

export interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
  event?: PostmanEvent[];
}

export interface PostmanCollection {
  info: { name: string; schema: string; _postman_id?: string };
  item: PostmanItem[];
}
