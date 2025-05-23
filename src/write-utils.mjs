import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { WARCRecord, WARCSerializer } from "warcio";

// Function to create a writable stream for the WARC file
// This function takes a file path and returns a writable stream to that file
export function getWARCOutputStream(WARCPath) {
  return fs.createWriteStream(WARCPath);
}

// Asynchronously writes a WARC info record to the provided WARC output stream
// WARC info records contain metadata about the WARC file
export async function writeWARCInfo(WARCOutputStream, WARCPath) {
  // Create a WARC info record with metadata such as filename and software version
  const WARCInfo = await WARCRecord.createWARCInfo(
    { filename: WARCPath, warcVersion: "WARC/1.1" },
    {
      software: "puppeteer-warcio-archiver",
      datetime: new Date().toISOString(),
    }
  );

  // Serialize the WARC info record with gzip compression
  const WARCInfoSerializer = new WARCSerializer(WARCInfo, { gzip: true });

  // Use pipeline to write the serialized WARC info record to the output stream
  // The 'end: false' option keeps the stream open for further writes
  await pipeline(Readable.from(WARCInfoSerializer), WARCOutputStream, {
    end: false,
  });
}

// Asynchronously writes request and response records to the WARC file
// This function handles both request and response data, serializing and writing them to the WARC output stream
export async function writeRequestResponse(WARCOutputStream, url, data) {
  // Check if the response buffer is available; if not, exit the function
  if (!data.response?.buffer) return;

  // Create a request record with details such as type, URL, date, and HTTP headers
  const requestRecord = await WARCRecord.create(
    {
      type: "request",
      url: url,
      date: data.request.timestamp,
      warcVersion: "WARC/1.1",
      httpHeaders: {
        ...data.request.headers,
        "x-puppeteer-resource-request-id": data.request.id,
      },
    },
    // Generator function to yield the request body if postData is available
    (async function* () {
      if (data.request.postData) {
        yield new TextEncoder().encode(await data.request.postData);
      }
    })()
  );

  // Serialize the request record with gzip compression
  const requestSerializer = new WARCSerializer(requestRecord, {
    gzip: true,
  });

  // Write the serialized request record to the output stream
  await pipeline(Readable.from(requestSerializer), WARCOutputStream, {
    end: false,
  });

  // Create a response record with details such as type, URL, date, and HTTP headers
  const responseRecord = await WARCRecord.create(
    {
      type: "response",
      url: url,
      date: data.response.timestamp,
      warcVersion: "WARC/1.1",
      httpHeaders: {
        ...data.response.headers,
        Status: data.response.status,
        "x-puppeteer-resource-request-id": data.response.id,
      },
    },
    // Generator function to yield the response body
    (async function* () {
      yield data.response.buffer;
    })()
  );

  // Serialize the response record with gzip compression
  const responseSerializer = new WARCSerializer(responseRecord, {
    gzip: true,
  });

  // Write the serialized response record to the output stream
  await pipeline(Readable.from(responseSerializer), WARCOutputStream, {
    end: false,
  });
}

// Function to close the WARC file stream
// This function ends the writable stream, ensuring all data is flushed and the file is properly closed
export function closeWARCOutputStream(WARCOutputStream) {
  WARCOutputStream.end();
}
