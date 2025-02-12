import puppeteer from "puppeteer";
import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { WARCRecord, WARCSerializer } from "warcio";

export async function archiveWebPage(url, outputPath, screenshotFileName) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Store all requests and responses
  const resourceData = new Map();

  // Intercept all requests
  await page.setRequestInterception(true);

  page.on("request", async (request) => {
    const { id } = request;
    const requestData = {
      id,
      method: request.method(),
      headers: request.headers(),
      postData: request.hasPostData()
        ? await request.fetchPostData()
        : undefined,
      timestamp: new Date().toISOString(),
    };

    if (!resourceData.has(request.url())) {
      resourceData.set(request.url(), {});
    }
    resourceData.get(request.url())[id] = { request: requestData };
    request.continue();
  });

  // Capture all responses
  page.on("response", async (response) => {
    try {
      const { id } = response.request();
      const url = response.url();
      const responseData = {
        id,
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString(),
        buffer: await response.buffer().catch(() => null), // Some responses might not have a buffer
      };

      if (!resourceData.has(url)) {
        resourceData.set(url, {});
      }
      const entries = resourceData.get(url);
      const resourceEntry = entries[id] || {};
      resourceEntry.response = responseData;
    } catch (error) {
      console.warn(`Failed to capture response for ${url}:`, error);
    }
  });

  // Navigate to the page
  await page.goto(url, { waitUntil: "networkidle0" });

  await page.screenshot({ path: `${screenshotFileName}.png` });

  // Get the final rendered HTML
  const renderedHTML = await page.content();

  // Create WARC file stream
  const warcOutputStream = fs.createWriteStream(outputPath);

  // Create warcinfo record
  const warcinfo = await WARCRecord.createWARCInfo(
    { filename: outputPath, warcVersion: "WARC/1.1" },
    {
      software: "puppeteer-warcio-archiver",
      datetime: new Date().toISOString(),
    }
  );

  // Write warcinfo record
  const warcinfoSerializer = new WARCSerializer(warcinfo, { gzip: true });
  await pipeline(Readable.from(warcinfoSerializer), warcOutputStream, {
    end: false,
  });

  // Function to write a request/response pair
  async function writeRequestResponse(url, data) {
    if (!data.response?.buffer) return;

    // Create request record
    const requestRecord = await WARCRecord.create(
      {
        type: "request",
        url: url,
        date: data.request.timestamp,
        warcVersion: "WARC/1.1",
        httpHeaders: {
          ...data.request.headers,
          'x-puppeteer-request-id': data.request.id,
        },
      },
      (async function* () {
        if (data.request.postData) {
          yield new TextEncoder().encode(await data.request.postData);
        }
      })()
    );

    // Write request record
    const requestSerializer = new WARCSerializer(requestRecord, { gzip: true });
    await pipeline(Readable.from(requestSerializer), warcOutputStream, {
      end: false,
    });

    // Create response record
    const responseRecord = await WARCRecord.create(
      {
        type: "response",
        url: url,
        date: data.response.timestamp,
        warcVersion: "WARC/1.1",
        httpHeaders: {
          ...data.response.headers,
          Status: data.response.status,
          'x-puppeteer-request-id': data.response.id,
        },
      },
      (async function* () {
        yield data.response.buffer;
      })()
    );

    // Write response record
    const responseSerializer = new WARCSerializer(responseRecord, {
      gzip: true,
    });
    await pipeline(Readable.from(responseSerializer), warcOutputStream, {
      end: false,
    });
  }

  // Write the main page response with rendered HTML
  await writeRequestResponse(`${url}#rendered-html`, {
    request: {
      id: "rendered-html",
      method: "GET",
      headers: resourceData.get(url)?.request?.headers || {},
      timestamp:
        resourceData.get(url)?.request?.timestamp || new Date().toISOString(),
    },
    response: {
      id: "rendered-html",
      status: 200,
      headers: {
        "content-type": "text/html",
        ...resourceData.get(url)?.response?.headers,
      },
      timestamp: new Date().toISOString(),
      buffer: Buffer.from(renderedHTML),
    },
  });

  // Write all other resources
  for (const [resourceUrl, entries] of resourceData.entries()) {
    for (const [id, data] of Object.entries(entries)) {
      if (resourceUrl !== url) {
        await writeRequestResponse(resourceUrl, data);
      }
    }
  }

  // Close the WARC file
  warcOutputStream.end();

  // Close the browser
  await browser.close();
}
