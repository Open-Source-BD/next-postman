export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type RequestSubTab = 'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'tests';
export type ResponseSubTab = 'body' | 'headers' | 'testresults';
export type SidebarTab = 'history' | 'collections';

export type KvItemType = 'text' | 'file';

export interface KvItem {
  id: string;
  key: string;
  value: string;
  type?: KvItemType;
  file?: File | null;
}

export type AuthType = 'none' | 'bearer' | 'basic';

export interface AuthConfig {
  type: AuthType;
  bearer: string;
  basicUser: string;
  basicPass: string;
}

export type BodyType = 'none' | 'formdata' | 'urlencoded' | 'raw';
export type RawType = 'application/json' | 'text/plain' | 'application/xml' | 'text/html';

export interface RequestBody {
  type: BodyType;
  formdata: KvItem[];
  urlencoded: KvItem[];
  rawContent: string;
  rawType: RawType;
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

export interface TabState {
  id: string;
  method: HttpMethod;
  url: string;
  params: KvItem[];
  headers: KvItem[];
  auth: AuthConfig;
  body: RequestBody;
  scripts: string;
  tests: string;
  response: ResponseData | null;
  activeSubTab: RequestSubTab;
  activeResTab: ResponseSubTab;
  /** Id of the saved RequestNode this tab was opened from (for Save vs Save As). */
  sourceNodeId?: string;
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

export type CodeLang = 'curl';

export interface ExportData {
  collections: Collection[];
  environments: EnvVar[];
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
