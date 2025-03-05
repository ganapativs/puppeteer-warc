# Puppeteer WARC

This project demonstrates how to use Puppeteer to render a web page and create a [WARC](https://iipc.github.io/warc-specifications/specifications/warc-format/warc-1.1/) file of the rendered page and its resources. This can be useful for archiving web pages for long-term storage or offline browsing.

## Requirements

- **Node.js**: Ensure you have Node.js installed (version 22 or higher is recommended). You can download it from [nodejs.org](https://nodejs.org/).

## Installation

1. **Clone the repository**: This step involves downloading the project files to your local machine.

   ```bash
   git clone https://github.com/ganapativs/puppeteer-warc.git
   cd puppeteer-warc
   ```

2. **Install the necessary dependencies**: This command will install all the required Node.js packages specified in the `package.json` file.

   ```bash
   npm install
   ```

## Usage

### Writing a WARC File

To create a WARC file from a website, use the `src/write-warc-cli.mjs` script. This script will render the specified website and create a WARC file containing the page and its resources. It will also generate a screenshot of the web page, which can be useful for debugging.

- **Command**:

  ```bash
  node src/write-warc-cli.mjs <website-url>
  ```

  - **Example**: To create a WARC file for `https://example.com`, run:

    ```bash
    node src/write-warc-cli.mjs https://example.com
    ```

### Reading a WARC File

To read and print the contents of a WARC file, use the `src/read-warc-cli.mjs` script. This script supports two output formats: JSON and text.

- **Command**:

  ```bash
  node src/read-warc-cli.mjs <path-to-warc-file> [--format=json|text]
  ```

  - **Options**:

    - `--format=json` (default): Outputs the WARC contents in JSON format
    - `--format=text`: Outputs a human-readable text report

  - **Examples**:

    ```bash
    # Output in JSON format (default)
    node src/read-warc-cli.mjs examplecom.warc.gz

    # Output in text format
    node src/read-warc-cli.mjs examplecom.warc.gz --format=text
    ```

  The JSON format includes:

  - `recordCount`: Total number of records in the WARC file
  - `records`: Object containing all records, where each record includes:
    - `warcHeaders`: WARC headers for the record
    - `httpHeaders`: HTTP headers (when present)
    - `contentType`: Type of the content
    - `contentSize`: Size of the content in bytes
    - `content`: The actual content (base64 encoded for binary data)
    - `contentEncoding`: Indicates if content is base64 encoded

  The text format provides a well-structured report that includes:

  - Total number of records
  - WARC headers for each record
  - HTTP headers (when present)
  - Content type and size
  - Full content for text-based resources
  - Binary data indicator for non-text resources

### Previewing WARC Files

You can preview WARC files using [ReplayWeb.page](https://replayweb.page/), a web-based tool for viewing archived web content. This tool allows you to interact with the archived pages as if you were browsing them live.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
