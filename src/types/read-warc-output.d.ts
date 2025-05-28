// TypeScript definitions for the output of the WARC read operation

/**
 * Represents the headers in a WARC or HTTP record.
 */
export interface WarcHeaders {
  [key: string]: string;
}

/**
 * Represents a single WARC record's output structure.
 */
export interface WarcRecord {
  warcHeaders: WarcHeaders;
  httpHeaders?: WarcHeaders;
  contentType: string;
  contentSize: number;
  content: string; // text or base64-encoded binary
  contentEncoding?: "base64";
  contentError?: string;
}

/**
 * Represents the map of all records, keyed by record label (e.g., 'Record #1').
 */
export interface WarcRecordMap {
  [recordId: string]: WarcRecord;
}

/**
 * The main output structure for a WARC read operation in JSON format.
 */
export interface WarcReadOutput {
  recordCount: number;
  records: WarcRecordMap;
}
