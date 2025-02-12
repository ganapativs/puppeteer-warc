import puppeteer from "puppeteer";
import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { WARCRecord, WARCSerializer } from "warcio";

export async function writeWARC(url, warcPath, { screenshotName }) {
  let browser;

  try {
    // Launch a new browser instance
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Map to store request and response data
    const resourceData = new Map();

    // Enable request interception
    await page.setRequestInterception(true);

    // Handle requests
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

      // Initialize entry for the URL if it doesn't exist
      if (!resourceData.has(request.url())) {
        resourceData.set(request.url(), {});
      }
      // Store request data
      resourceData.get(request.url())[id] = { request: requestData };
      request.continue();
    });

    // Handle responses
    page.on("response", async (response) => {
      try {
        const { id } = response.request();
        const url = response.url();
        const responseData = {
          id,
          status: response.status(),
          headers: response.headers(),
          timestamp: new Date().toISOString(),
          buffer: await response.buffer().catch(() => null), // Handle potential buffer absence
        };

        // Initialize entry for the URL if it doesn't exist
        if (!resourceData.has(url)) {
          resourceData.set(url, {});
        }
        // Store response data
        const entries = resourceData.get(url);
        const resourceEntry = entries[id] || {};
        resourceEntry.response = responseData;
      } catch (error) {
        console.warn(`Failed to capture response for ${url}:`, error);
      }
    });

    // Navigate to the specified URL
    await page.goto(url, { waitUntil: "networkidle0" });

    // Capture a screenshot
    await page.screenshot({ path: `${screenshotName}.png` });

    // Get the final rendered HTML content
    const renderedHTML = await page.content();

    // Create a writable stream for the WARC file
    const warcOutputStream = fs.createWriteStream(warcPath);

    // Create and write a warcinfo record
    const warcinfo = await WARCRecord.createWARCInfo(
      { filename: warcPath, warcVersion: "WARC/1.1" },
      {
        software: "puppeteer-warcio-archiver",
        datetime: new Date().toISOString(),
      }
    );

    const warcinfoSerializer = new WARCSerializer(warcinfo, { gzip: true });
    await pipeline(Readable.from(warcinfoSerializer), warcOutputStream, {
      end: false,
    });

    // Function to write request/response pairs to the WARC file
    async function writeRequestResponse(url, data) {
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
      await pipeline(Readable.from(requestSerializer), warcOutputStream, {
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

    // Close the WARC file stream
    warcOutputStream.end();

    // Close the browser instance
    await browser.close();
  } catch (error) {
    console.error("Error during WARC creation:", error);
    throw error;
  } finally {
    if (browser) {
      // Close the browser instance
      await browser.close();
    }
  }
}
