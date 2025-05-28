// TypeScript definitions for the output and data structures of the WARC write operation

/**
 * Represents the request data captured for a resource.
 */
export interface WarcRequestData {
  id: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: string;
}

/**
 * Represents the response data captured for a resource.
 */
export interface WarcResponseData {
  id: string;
  status: number;
  headers: Record<string, string>;
  timestamp: string;
  buffer: Buffer | null;
  remoteAddress?: { ip?: string; port?: string };
  timing?: Record<string, unknown>;
}

/**
 * Represents the combined request and response data for a resource.
 */
export interface WarcResourceEntry {
  request: WarcRequestData;
  response?: WarcResponseData;
}

/**
 * Represents the map of all resources, keyed by URL, then by request ID.
 */
export type WarcResourceData = Map<string, Record<string, WarcResourceEntry>>;

/**
 * Options for the writeWARC function.
 */
export interface WriteWARCOptions {
  screenshotName: string | null;
}
