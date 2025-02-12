import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { WARCRecord, WARCSerializer } from "warcio";

// Function to create a writable stream for the WARC file
export function getWARCOutputStream(WARCPath) {
  return fs.createWriteStream(WARCPath);
}

export async function writeWARCInfo(WARCOutputStream, WARCPath) {
  // Create and write a warcinfo record
  const WARCInfo = await WARCRecord.createWARCInfo(
    { filename: WARCPath, warcVersion: "WARC/1.1" },
    {
      software: "puppeteer-warcio-archiver",
      datetime: new Date().toISOString(),
    }
  );

  const WARCInfoSerializer = new WARCSerializer(WARCInfo, { gzip: true });
  await pipeline(Readable.from(WARCInfoSerializer), WARCOutputStream, {
    end: false,
  });
}

// Function to write request/response pairs to the WARC file
export async function writeRequestResponse(WARCOutputStream, url, data) {
  if (!data.response?.buffer) return;

  // Create and write a request record
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
    (async function* () {
      if (data.request.postData) {
        yield new TextEncoder().encode(await data.request.postData);
      }
    })()
  );

  const requestSerializer = new WARCSerializer(requestRecord, {
    gzip: true,
  });
  await pipeline(Readable.from(requestSerializer), WARCOutputStream, {
    end: false,
  });

  // Create and write a response record
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
    (async function* () {
      yield data.response.buffer;
    })()
  );

  const responseSerializer = new WARCSerializer(responseRecord, {
    gzip: true,
  });
  await pipeline(Readable.from(responseSerializer), WARCOutputStream, {
    end: false,
  });
}

// Close the WARC file stream
export function closeWARCOutputStream(WARCOutputStream) {
  WARCOutputStream.end();
}
