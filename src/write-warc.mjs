import { executablePath } from "puppeteer";
import { addExtra } from "puppeteer-extra";
import rebrowserPuppeteer from "rebrowser-puppeteer-core";
import { closeWARCOutputStream, getWARCOutputStream, writeRequestResponse, writeWARCInfo } from "./write-utils.mjs";

const puppeteer = addExtra(rebrowserPuppeteer);

export async function writeWARC(url, WARCPath, { screenshotName }) {
  let browser;
  let WARCOutputStream;

  try {
    // Launch a new browser instance
    browser = await puppeteer.launch({
      // headless: false,
      // devtools: true,
      executablePath: executablePath(),
      defaultViewport: {
        width: 1440,
        height: 900,
      },
    });
    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
    );

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
          ? // For form data, use the postData property, otherwise use fetchPostData
            request.postData() || (await request.fetchPostData())
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
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Capture a screenshot
    await page.screenshot({ path: `${screenshotName}.png` });

    // Get the final rendered HTML content
    const renderedHTML = await page.content();

    /**
     * ========================================================================
     * WARC Begin
     * ========================================================================
     */

    // Create a writable stream for the WARC file
    WARCOutputStream = getWARCOutputStream(WARCPath);

    // Create and write a warcinfo record
    await writeWARCInfo(WARCOutputStream, WARCPath);

    // Write the main page response with rendered HTML
    await writeRequestResponse(WARCOutputStream, `${url}#rendered-html`, {
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
          await writeRequestResponse(WARCOutputStream, resourceUrl, data);
        }
      }
    }

    // Close the WARC file stream
    closeWARCOutputStream(WARCOutputStream);

    /**
     * ========================================================================
     * WARC End
     * ========================================================================
     */

    // Close the browser instance
    await browser.close();
  } catch (error) {
    console.error("Error during WARC creation:", error);
    throw error;
  } finally {
    if (WARCOutputStream) {
      // Close the WARC file stream
      closeWARCOutputStream(WARCOutputStream);
    }

    if (browser) {
      // Close the browser instance
      await browser.close();
    }
  }
}
