# Puppeteer WARC

This project demonstrates how to use Puppeteer to render a web page and create a [WARC](https://iipc.github.io/warc-specifications/specifications/warc-format/warc-1.1/) file of the rendered page and its resources. This can be useful for archiving web pages for long-term storage or offline browsing.

## Requirements

- **Node.js**: Ensure you have Node.js installed (version 22 or higher is recommended). You can download it from [nodejs.org](https://nodejs.org/).

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd puppeteer-warc
   ```

2. Install the necessary dependencies:

   ```bash
   npm install
   ```

## Usage

### Writing a WARC File

To create a WARC file from a website, use the `write-warc-cli.mjs` script:

```bash
node write-warc-cli.mjs <website-url>
```

- **Example**:

  ```bash
  node write-warc-cli.mjs https://example.com
  ```

This script will render the specified website and create a WARC file containing the page and its resources. It will also generate a screenshot of the web page, which can be useful for debugging.

### Reading a WARC File

To read and print the contents of a WARC file, use the `read-warc-cli.mjs` script:

```bash
node read-warc-cli.mjs <path-to-warc-file>
```

- **Example**:

  ```bash
  node read-warc-cli.mjs examplecom.warc.gz
  ```

This script will output the records contained in the specified WARC file.

### Previewing WARC Files

You can preview WARC files using [ReplayWeb.page](https://replayweb.page/), a web-based tool for viewing archived web content.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
