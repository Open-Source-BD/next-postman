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
}

export interface HistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  time: number;
  date: string;
}

export interface Collection {
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
