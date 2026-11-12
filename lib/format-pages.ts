import type { FormatLandingConfig } from "@/components/format-landing-page";

export const formatPages = {
  pptx: {
    path: "/pptx-to-markdown",
    title: "PPTX to Markdown converter for PowerPoint slides",
    extensions: "PPTX",
    summary: "To convert PowerPoint to Markdown, open the .pptx file here: each slide becomes a Markdown heading with its text as bullet points and its speaker notes underneath, ready to edit and save as a .md file. It is free and the presentation never leaves your browser.",
    description: "Markdown Lens reads modern PowerPoint packages locally, keeps slide order and boundaries, and saves embedded media as local document assets.",
    preserves: ["Slide order, with one heading per slide", "Text from text boxes, placeholders, and table cells", "Speaker notes under each slide", "Embedded media files as local assets linked from the Markdown"],
    limitations: ["Animations, transitions, theme styling, and exact object placement are not represented.", "Text formatting such as bold, colors, and fonts is not carried over; text comes out as plain Markdown.", "Table cells become list items in reading order, not Markdown tables.", "Charts and diagrams may require manual descriptions.", "Legacy .ppt files must first be saved as .pptx."],
    steps: ["Choose a .pptx file in the workspace.", "Review slide-by-slide conversion progress and warnings.", "Edit, preview, and export the generated Markdown."],
    sample: {
      heading: "Example: PowerPoint slides converted to Markdown",
      fileName: "q3-roadmap.pptx",
      sourceLabel: "Two-slide PowerPoint deck",
      sourceLines: [
        "Slide 1 title: Q3 product roadmap",
        "Slide 1 text: Ship offline mode · Launch shared workspaces",
        "Slide 1 notes: Open with the two customer quotes.",
        "Slide 2 title: Risks",
        "Slide 2 text: Hiring timeline · API rate limits",
      ],
      markdown: "# q3-roadmap\n\n## Q3 product roadmap\n\n- Ship offline mode\n- Launch shared workspaces\n\n### Speaker notes\n\nOpen with the two customer quotes.\n\n---\n\n## Risks\n\n- Hiring timeline\n- API rate limits",
      note: "This is the exact output Markdown Lens produces for this deck. The file name becomes the document title, and a horizontal rule separates slides.",
    },
    sections: [
      {
        heading: "How to convert a PowerPoint presentation to Markdown",
        ordered: true,
        list: [
          "Save or export the presentation as .pptx. Files from PowerPoint, Google Slides (File → Download → Microsoft PowerPoint), Keynote, and LibreOffice Impress all work once they are .pptx.",
          "Drop the .pptx file on this page or choose “Open or convert PPTX”. Conversion starts in your browser; nothing is uploaded.",
          "Check the result in the editor. Rename slide headings, merge bullets, or delete notes you do not want to share.",
          "Copy the Markdown, download it as a .md file, or export a bundle that includes the extracted images.",
        ],
      },
      {
        heading: "How slides map to Markdown",
        paragraphs: ["The converter keeps the structure of the deck predictable, so you can find any slide in the output quickly."],
        table: {
          head: ["PowerPoint content", "Markdown output"],
          rows: [
            ["File name", "# Title (level-1 heading)"],
            ["First text on a slide", "## Slide heading"],
            ["Other slide text", "- Bullet list items"],
            ["Speaker notes", "### Speaker notes, then a paragraph"],
            ["Slide with no text", "## Slide 3 (numbered fallback)"],
            ["Break between slides", "--- (horizontal rule)"],
            ["Embedded images", "![Image from slide 1](assets/…) with the file kept locally"],
          ],
        },
      },
      {
        heading: "Converting an older .ppt file",
        paragraphs: [
          "Markdown Lens reads the modern .pptx format only. To convert a legacy .ppt file, open it in PowerPoint, Keynote, or LibreOffice Impress, choose Save As or Export, pick PowerPoint Presentation (.pptx), and convert the new file here. The slide text and notes carry over unchanged.",
        ],
      },
      {
        heading: "What people use PPTX to Markdown for",
        list: [
          "Turning a slide deck into a README, wiki page, or documentation draft.",
          "Giving an AI assistant or LLM the text of a presentation as clean, structured context instead of a binary file.",
          "Keeping talk outlines and speaker notes in Git, where changes are easy to review.",
          "Reusing slide content in notes apps that store Markdown, such as Obsidian.",
        ],
      },
    ],
    faq: [
      { question: "Is this PPTX to Markdown converter free?", answer: "Yes. Markdown Lens is free and open source, needs no account, and adds no watermark." },
      { question: "Are PowerPoint files uploaded?", answer: "No. PPTX packages are opened and parsed locally in the browser." },
      { question: "What does the converted Markdown look like?", answer: "Each slide becomes a level-2 heading taken from its first text, the remaining slide text becomes a bullet list, and speaker notes appear under a level-3 \"Speaker notes\" heading. Slides with no text are titled \"Slide 1\", \"Slide 2\" and so on." },
      { question: "Can I convert PPTX to an .md file?", answer: "Yes. After conversion you can edit the result in the editor and export it as a .md file, or as a bundle with the extracted images." },
      { question: "Are slide images included?", answer: "Embedded images are stored as local document assets, linked from the Markdown, and can be exported with the Markdown bundle." },
      { question: "Does it keep bold text, colors, or layout?", answer: "No. The converter extracts the words on each slide as plain Markdown text. Formatting, themes, and positions are left out so the output stays clean." },
      { question: "Can I convert an old .ppt PowerPoint file?", answer: "Not directly. Open the .ppt in PowerPoint, Keynote or LibreOffice Impress, save it as .pptx, then convert that file here." },
      { question: "Can I convert Google Slides to Markdown?", answer: "Yes. In Google Slides choose File → Download → Microsoft PowerPoint (.pptx), then open the downloaded file here." },
    ],
    related: [
      { href: "/word-to-markdown", title: "Word to Markdown converter", description: "Convert .docx headings, lists, links, tables, and images locally." },
      { href: "/pdf-to-markdown", title: "PDF to Markdown converter", description: "Extract selectable PDF text page by page into editable Markdown." },
      { href: "/zip-to-markdown", title: "ZIP to Markdown importer", description: "Convert a whole folder of decks and documents from one ZIP archive." },
    ],
  },
  excel: {
    path: "/excel-to-markdown",
    title: "Excel to Markdown table converter",
    extensions: "XLSX",
    summary: "Open an Excel .xlsx workbook and every visible worksheet becomes a GitHub-flavored Markdown table under its own heading, converted entirely in your browser.",
    description: "The converter reads the XLSX package directly, keeps worksheet order, resolves shared text values, leaves blank cells blank, and excludes hidden sheets by default.",
    preserves: ["Visible worksheet names and order", "Rows, columns, blank cells, and cached values", "One Markdown section per worksheet", "Wide tables with horizontal preview scrolling"],
    limitations: ["Formatting, macros, charts, and pivot-table behavior are not reproduced.", "Formula output uses the value cached in the workbook.", "Merged cells are not represented, because Markdown tables cannot merge cells.", "Legacy .xls files require export to .xlsx."],
    steps: ["Choose a modern .xlsx workbook.", "Markdown Lens converts each visible sheet locally.", "Review wide tables and export the resulting document."],
    sample: {
      heading: "Example: an Excel sheet converted to a Markdown table",
      fileName: "budget.xlsx",
      sourceLabel: "Worksheet “Q1”",
      sourceLines: ["Item | Owner | Cost", "Hosting | Ana | 120", "Design tools | Sam | 45"],
      markdown: "# budget\n\n## Q1\n\n| Item | Owner | Cost |\n| --- | --- | --- |\n| Hosting | Ana | 120 |\n| Design tools | Sam | 45 |",
      note: "The first row becomes the table header. Each additional visible worksheet gets its own ## heading and table.",
    },
    sections: [
      {
        heading: "How to convert an Excel spreadsheet to a Markdown table",
        ordered: true,
        list: [
          "Save the workbook as .xlsx (in Excel: File → Save As → Excel Workbook).",
          "Drop the file on this page or choose “Open or convert XLSX”.",
          "Review each sheet’s table in the preview. Add colons to the divider row if you want right-aligned numbers, for example | --- | ---: |.",
          "Copy the Markdown or download it as a .md file.",
        ],
      },
      {
        heading: "Excel or CSV: which should you convert?",
        paragraphs: [
          "Convert the .xlsx directly when the workbook has several sheets, since each becomes its own section. If you only need one range, exporting it as CSV first and using the CSV to Markdown converter gives you the same table with fewer columns to clean up.",
        ],
        links: [{ href: "/csv-to-markdown", label: "CSV to Markdown table converter" }],
      },
    ],
    faq: [
      { question: "Are hidden worksheets converted?", answer: "No. Hidden worksheets are excluded by default to avoid exposing unintended content." },
      { question: "Does it calculate formulas?", answer: "No. It reads cached workbook values and does not execute spreadsheet formulas." },
      { question: "Is my spreadsheet uploaded?", answer: "No. The workbook is read and converted in your browser." },
      { question: "Can I convert Google Sheets to Markdown?", answer: "Yes. Choose File → Download → Microsoft Excel (.xlsx) in Google Sheets, then open the file here." },
    ],
    related: [
      { href: "/csv-to-markdown", title: "CSV to Markdown converter", description: "Turn comma- or tab-separated files into GitHub-flavored tables." },
      { href: "/json-to-markdown", title: "JSON to Markdown converter", description: "Pretty-print JSON locally as a fenced Markdown code block." },
    ],
  },
  html: {
    path: "/html-to-markdown",
    title: "HTML to Markdown converter",
    extensions: "HTML",
    summary: "Open a local .html file and get clean Markdown back: headings, paragraphs, links, lists, tables, emphasis, and code are kept, while scripts, styles, and forms are stripped.",
    description: "Scripts, styles, embedded frames, and forms are removed before conversion so the Markdown remains focused and safe to review.",
    preserves: ["Headings, paragraphs, lists, and blockquotes", "Links, emphasis, images, and code", "Tables that fit GitHub-flavored Markdown", "The HTML document title when available"],
    limitations: ["CSS presentation and interactive behavior are not converted.", "Complex layout containers are flattened to reading order.", "Remote images remain remote references unless downloaded separately."],
    steps: ["Open a local .html or .htm file.", "Unsafe and non-content elements are removed.", "Review and export the cleaned Markdown."],
    sample: {
      heading: "Example: HTML converted to Markdown",
      fileName: "release-notes.html",
      sourceLabel: "HTML body",
      sourceLines: [
        "<h1>Release notes</h1>",
        "<p>Fixed the <strong>export</strong> bug. Read the <a href=\"https://example.com/docs\">docs</a>.</p>",
        "<ul><li>Faster OCR</li><li>Smaller bundles</li></ul>",
        "<table> Version | Date · 2.4 | May 2 </table>",
      ],
      markdown: "# Release notes\n\nFixed the **export** bug. Read the [docs](https://example.com/docs).\n\n-   Faster OCR\n-   Smaller bundles\n\n| Version | Date |\n| --- | --- |\n| 2.4 | May 2 |",
    },
    sections: [
      {
        heading: "How to convert an HTML page to Markdown",
        ordered: true,
        list: [
          "Save the page as an .html file (in most browsers: File → Save Page As → Web Page, HTML Only).",
          "Drop the file on this page or choose “Open or convert HTML”.",
          "Review the Markdown. Navigation menus and footers come through as text, so delete what you do not need.",
          "Copy the Markdown or download it as a .md file.",
        ],
      },
      {
        heading: "How HTML elements map to Markdown",
        table: {
          head: ["HTML", "Markdown"],
          rows: [
            ["<h1> … <h6>", "# … ######"],
            ["<strong>, <em>", "**bold**, *italic*"],
            ["<a href>", "[text](url)"],
            ["<ul>, <ol>", "- item, 1. item"],
            ["<pre><code>", "Fenced code block"],
            ["<table>", "GitHub-flavored Markdown table"],
            ["<script>, <style>, <form>, <iframe>", "Removed"],
          ],
        },
      },
    ],
    faq: [
      { question: "Does Markdown Lens execute scripts?", answer: "No. Script, style, frame, object, and form elements are removed before Markdown conversion." },
      { question: "Can it fetch a website URL?", answer: "This release converts local HTML files. It does not proxy or scrape remote pages." },
      { question: "Is the HTML uploaded?", answer: "No. Conversion runs in your browser." },
    ],
    related: [
      { href: "/epub-to-markdown", title: "EPUB to Markdown converter", description: "Convert unprotected EPUB chapters into one Markdown document." },
      { href: "/xml-to-markdown", title: "XML to Markdown converter", description: "Validate and pretty-print XML locally as fenced Markdown." },
    ],
  },
  csv: {
    path: "/csv-to-markdown",
    title: "CSV to Markdown table converter",
    extensions: "CSV or TSV",
    summary: "Open a .csv or .tsv file and get a GitHub-flavored Markdown table: the first row becomes the header, quoted cells with commas stay intact, and nothing is uploaded.",
    description: "Conversion runs locally and reports malformed rows instead of silently discarding parsing problems.",
    preserves: ["Quoted cells and embedded delimiters", "Header row and source row order", "Blank values and Unicode text", "CSV and tab-separated input"],
    limitations: ["Very wide datasets may be easier to read in a spreadsheet.", "Markdown tables do not support merged cells.", "Cell formatting and data types are represented as text.", "Tables are limited to 10,000 rows and 250,000 cells."],
    steps: ["Choose a .csv or .tsv file.", "Review any row-level parsing warnings.", "Edit or copy the generated GFM table."],
    sample: {
      heading: "Example: CSV converted to a Markdown table",
      fileName: "team.csv",
      sourceLabel: "CSV input",
      sourceLines: ["name,role,city", "\"Lee, Ana\",Engineer,Berlin", "Sam,Designer,New York"],
      markdown: "# team\n\n| name | role | city |\n| --- | --- | --- |\n| Lee, Ana | Engineer | Berlin |\n| Sam | Designer | New York |",
      note: "The quoted value \"Lee, Ana\" stays in one cell instead of splitting at the comma.",
    },
    sections: [
      {
        heading: "How to make a Markdown table from CSV",
        ordered: true,
        list: [
          "Export your data as CSV (or TSV) from a spreadsheet, database, or script.",
          "Drop the file on this page or choose “Open or convert CSV or TSV”.",
          "Check the warnings panel for rows with the wrong number of columns.",
          "Copy the table into your README, docs, or issue, or download the .md file.",
        ],
      },
      {
        heading: "Markdown table syntax, explained",
        paragraphs: [
          "A Markdown table is a header row, a divider row of dashes, and one line per data row, with vertical bars between columns. The converter writes plain --- dividers; add colons to align a column: :--- for left, :---: for center, ---: for right.",
        ],
        code: "| name | score |\n| :--- | ---: |\n| Ana | 92 |\n| Sam | 87 |",
        links: [{ href: "/markdown-cheatsheet", label: "More table examples in the Markdown cheat sheet" }],
      },
    ],
    faq: [
      { question: "Does it support commas inside cells?", answer: "Yes. Standards-compliant quoted cells and escaped quotes are handled." },
      { question: "Is the data uploaded?", answer: "No. Parsing and table generation happen in the browser." },
      { question: "Can I convert TSV (tab-separated) files?", answer: "Yes. Open a .tsv file and it is converted the same way as CSV." },
      { question: "Can it convert a Markdown table back to CSV?", answer: "Not in this release. Markdown Lens converts CSV into Markdown tables, not the other way around." },
    ],
    related: [
      { href: "/excel-to-markdown", title: "Excel to Markdown converter", description: "Convert visible XLSX worksheets into Markdown tables." },
      { href: "/json-to-markdown", title: "JSON to Markdown converter", description: "Format JSON locally as a reviewable Markdown code block." },
    ],
  },
  json: {
    path: "/json-to-markdown",
    title: "JSON to Markdown converter",
    extensions: "JSON",
    summary: "Open a .json file and get a Markdown document with the data validated, pretty-printed with two-space indentation, and wrapped in a json code block, ready for docs, issues, or prompts.",
    description: "Parsing and formatting run in the browser so API dumps, config files, and export payloads stay on the device.",
    preserves: ["Valid JSON structure", "Pretty-printed indentation", "Unicode text", "A document title from the filename"],
    limitations: ["Invalid JSON is rejected rather than repaired.", "JSON is not turned into a table automatically.", "Very large payloads may be easier to inspect in a dedicated JSON viewer."],
    steps: ["Choose a .json file.", "Markdown Lens validates and pretty-prints it locally.", "Copy or export the fenced Markdown."],
    sample: {
      heading: "Example: JSON converted to Markdown",
      fileName: "release.json",
      sourceLabel: "Minified JSON",
      sourceLines: ["{\"name\":\"release-notes\",\"version\":\"2.4.0\",\"tags\":[\"markdown\",\"export\"],\"draft\":false}"],
      markdown: "# release\n\n```json\n{\n  \"name\": \"release-notes\",\n  \"version\": \"2.4.0\",\n  \"tags\": [\n    \"markdown\",\n    \"export\"\n  ],\n  \"draft\": false\n}\n```",
    },
    sections: [
      {
        heading: "How to turn JSON into a Markdown table",
        paragraphs: [
          "This converter keeps JSON as a code block so nested objects stay intact. If your JSON is a flat array of objects and you want a table, convert it to CSV first and then open the CSV here. With jq installed, this command writes the CSV:",
        ],
        code: "jq -r '(.[0] | keys_unsorted) as $keys | $keys, (.[] | [.[$keys[]]]) | @csv' data.json > data.csv",
        links: [{ href: "/csv-to-markdown", label: "Then convert the CSV to a Markdown table" }],
      },
      {
        heading: "When to use a JSON code block in Markdown",
        list: [
          "Documenting API request and response examples in a README.",
          "Sharing a config file in a GitHub issue or pull request.",
          "Pasting structured data into an LLM prompt with clear boundaries.",
        ],
      },
    ],
    faq: [
      { question: "Is JSON uploaded?", answer: "No. The file is parsed and formatted in the browser." },
      { question: "Does it convert JSON into tables automatically?", answer: "No. This release pretty-prints JSON as a fenced code block so nested structures stay intact. For a table, convert flat JSON to CSV first and use the CSV converter." },
      { question: "What happens with invalid JSON?", answer: "The file is rejected with an error instead of being guessed at, so you can fix it at the source." },
    ],
    related: [
      { href: "/csv-to-markdown", title: "CSV to Markdown converter", description: "Convert tabular text files into GitHub-flavored tables." },
      { href: "/xml-to-markdown", title: "XML to Markdown converter", description: "Validate and pretty-print XML locally." },
    ],
  },
  xml: {
    path: "/xml-to-markdown",
    title: "XML to Markdown converter",
    extensions: "XML",
    summary: "Open a .xml file and get a Markdown document with the XML checked for well-formedness, re-indented, and wrapped in an xml code block. The file stays on your device.",
    description: "Markdown Lens checks that the XML is well-formed, then rebuilds a readable representation without sending the file to a server.",
    preserves: ["Well-formed element structure", "Attributes", "Formatted XML output", "A document title from the filename"],
    limitations: ["Invalid XML is rejected with a line hint where possible.", "DTD or schema validation is not applied.", "XML presentation and processing instructions are not treated as document styling."],
    steps: ["Choose a .xml file.", "The converter validates and formats it locally.", "Review the Markdown and export it."],
    sample: {
      heading: "Example: XML converted to Markdown",
      fileName: "note.xml",
      sourceLabel: "Single-line XML",
      sourceLines: ["<note id=\"7\"><to>Ana</to><subject>Release</subject><body>Ship on Friday</body></note>"],
      markdown: "# note\n\n```xml\n<note id=\"7\">\n  <to>Ana</to>\n  <subject>Release</subject>\n  <body>Ship on Friday</body>\n</note>\n```",
    },
    sections: [
      {
        heading: "How to convert XML to Markdown",
        ordered: true,
        list: [
          "Drop a .xml file on this page or choose “Open or convert XML”.",
          "If the XML is not well-formed, fix the reported line and try again.",
          "Copy the fenced block into documentation, an issue, or a prompt, or download the .md file.",
        ],
      },
    ],
    faq: [
      { question: "Does it fetch remote DTDs or entities?", answer: "No. Conversion stays local and is intended for well-formed XML documents, not network-backed entity expansion." },
      { question: "Is the XML uploaded?", answer: "No. Validation and formatting happen in the browser." },
      { question: "Can it convert XML into Markdown tables?", answer: "No. XML is kept as a formatted code block so its structure and attributes are preserved." },
    ],
    related: [
      { href: "/json-to-markdown", title: "JSON to Markdown converter", description: "Pretty-print JSON locally as fenced Markdown." },
      { href: "/html-to-markdown", title: "HTML to Markdown converter", description: "Convert local HTML documents into editable Markdown." },
    ],
  },
  epub: {
    path: "/epub-to-markdown",
    title: "EPUB to Markdown converter",
    extensions: "EPUB",
    summary: "Open an unprotected .epub book and get one Markdown document: the book title as the top heading, then every chapter in reading order, separated by horizontal rules.",
    description: "Markdown Lens follows the EPUB package spine, uses the book title when available, and keeps chapter boundaries visible.",
    preserves: ["Book title and spine chapter order", "Chapter headings, paragraphs, lists, and links", "Basic tables, emphasis, and code", "Clear separators between source chapters"],
    limitations: ["DRM-protected books cannot be opened.", "Fixed-layout EPUB presentation is flattened.", "Fonts, reading-system styling, and interactive widgets are omitted."],
    steps: ["Choose an unprotected .epub file.", "Chapters are converted in package reading order.", "Review the combined Markdown and export it."],
    sections: [
      {
        heading: "How an EPUB becomes Markdown",
        paragraphs: [
          "An EPUB is a ZIP of XHTML chapter files plus a package file that lists them in reading order (the spine). Markdown Lens reads that order, converts each chapter’s XHTML to Markdown, puts the book’s title at the top as a # heading, and inserts a --- rule between chapters so you can still see where each one starts.",
        ],
      },
      {
        heading: "Good uses for EPUB to Markdown",
        list: [
          "Pulling quotes and notes from your own or DRM-free books into a notes app.",
          "Converting documentation or reports published as EPUB back into editable source.",
          "Preparing a long text for search, summarizing, or an AI workflow you control.",
        ],
      },
    ],
    faq: [
      { question: "Does EPUB conversion require an account?", answer: "No. The book is parsed locally without an account or upload." },
      { question: "Does it remove DRM?", answer: "No. Protected EPUB files are unsupported." },
      { question: "Can I convert Kindle books?", answer: "Only DRM-free books in EPUB format. Kindle formats and protected files are not supported." },
    ],
    related: [
      { href: "/html-to-markdown", title: "HTML to Markdown converter", description: "Convert local HTML files into editable Markdown." },
      { href: "/pdf-to-markdown", title: "PDF to Markdown converter", description: "Extract selectable PDF text into editable Markdown." },
    ],
  },
  image: {
    path: "/image-to-markdown",
    title: "Image to Markdown converter with local OCR",
    extensions: "PNG, JPG, WebP, or BMP",
    summary: "Open a PNG, JPG, WebP, or BMP image to get a Markdown document that embeds it, lists its details, and, if you turn on OCR, includes the English text found in the image. OCR runs in your browser.",
    description: "The original image is kept in the local document workspace. OCR is opt-in, cancelable, and does not send pixels to a hosted service.",
    preserves: ["Original image as a local document asset", "Image dimensions, type, and source size", "Optional locally recognized English text", "Portable Markdown-plus-assets bundle export"],
    limitations: ["OCR accuracy depends on resolution, contrast, orientation, and typography.", "The bundled OCR language is English in this release.", "OCR extracts text but does not infer chart meaning or visual semantics.", "Scanned PDFs are a different workflow and still need a dedicated OCR step before PDF conversion."],
    steps: ["Choose a supported image.", "Decide whether to run local English OCR.", "Review recognized text and export the image bundle."],
    sample: {
      heading: "Example: the Markdown an image produces",
      fileName: "whiteboard.png",
      sourceLabel: "Image with OCR turned on",
      sourceLines: ["1600 × 900 PNG photo of a whiteboard"],
      markdown: "# whiteboard\n\n![whiteboard](assets/whiteboard.png)\n\n## Image details\n\n- Dimensions: 1600 × 900\n- Type: image/png\n- Size: 412.3 KB\n\n## Extracted text\n\n```text\n(text recognized in the image appears here)\n```",
      note: "The structure is exactly what the converter writes; the size and the recognized text depend on your image. Without OCR, the Extracted text section is left out.",
    },
    sections: [
      {
        heading: "How to convert an image to Markdown",
        ordered: true,
        list: [
          "Drop a PNG, JPG, WebP, or BMP file on this page.",
          "Choose whether to run English OCR. The OCR engine loads from this site and runs on your device.",
          "Correct any misread words in the extracted text.",
          "Export a bundle so the image file travels with the Markdown that links to it.",
        ],
      },
    ],
    faq: [
      { question: "Is OCR cloud-based?", answer: "No. The OCR worker and English model run locally after they are loaded from the same site origin." },
      { question: "Does it describe charts?", answer: "No. This release extracts visible text and image metadata rather than interpreting visual meaning." },
      { question: "Can it extract images from a PDF?", answer: "No. The PDF converter extracts text only. To get Markdown with local image links, save the PDF pages or figures as images and import those here, or convert the original Word or PowerPoint file, which keeps embedded images as assets." },
    ],
    related: [
      { href: "/pdf-to-markdown", title: "PDF to Markdown converter", description: "Convert text-based PDFs locally. Scanned PDFs still need OCR first." },
      { href: "/word-to-markdown", title: "Word to Markdown converter", description: "Convert .docx files and keep embedded images as local assets." },
    ],
  },
  zip: {
    path: "/zip-to-markdown",
    title: "Import supported files from a local ZIP archive",
    extensions: "ZIP",
    summary: "Open a ZIP archive in your browser and convert supported entries such as Markdown, Office documents, HTML, data files, and images without uploading the archive.",
    description: "Markdown Lens inspects the archive locally, enforces size and nesting limits, and converts readable entries one by one. Encrypted or unsafe archives are rejected.",
    preserves: ["Supported files found in the archive", "Original filenames as document titles", "Local conversion warnings per entry", "A bounded, reviewable import instead of a silent dump"],
    limitations: ["Only one nesting level is read.", "Archives are limited to 100 entries and 128 MB expanded.", "Encrypted ZIPs and unsupported file types are skipped or rejected.", "Each converted entry still has the same format limitations as opening that file directly."],
    steps: ["Choose a .zip file.", "Markdown Lens lists and converts supported entries locally.", "Review the resulting documents in the workspace."],
    faq: [
      { question: "Is the ZIP uploaded?", answer: "No. The archive is opened and expanded in the browser within local safety limits." },
      { question: "Does it extract every file type?", answer: "No. Only formats Markdown Lens already converts are imported, such as Markdown, PDF, DOCX, PPTX, XLSX, HTML, CSV, JSON, XML, EPUB, and supported images." },
    ],
    related: [
      { href: "/supported-formats", title: "Supported formats", description: "Compare every local conversion workflow and its limits." },
      { href: "/pdf-to-markdown", title: "PDF to Markdown converter", description: "Convert a text-based PDF directly without zipping it first." },
    ],
  },
} satisfies Record<string, FormatLandingConfig>;
