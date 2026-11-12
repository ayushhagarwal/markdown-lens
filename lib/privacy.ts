export const privacySummary =
  "In short: Markdown Lens converts and edits your documents in your browser. Files are not uploaded, there are no accounts or analytics, and everything you save stays on your device.";

export const privacySections = [
  {
    heading: "Your documents stay on your device",
    body: [
      "Markdown Lens converts PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML, EPUB, ZIP, and image files inside your browser. The file contents are not sent to a Markdown Lens server, and there is no server-side conversion.",
      "Optional OCR for images runs in your browser too. The OCR engine and English language data are downloaded from this website, and the image itself is never sent anywhere.",
    ],
  },
  {
    heading: "What is stored, and where",
    body: [
      "Your documents, drafts, version history, and extracted images are saved in your browser’s IndexedDB storage so they survive a page reload. Preferences such as theme, font size, line wrapping, and pane layout are saved in localStorage, along with a count of successful conversions used to decide when to show a one-time request to star the project on GitHub.",
      "This data never leaves your browser. You can delete it by removing documents in the workspace or by clearing this site’s data in your browser settings. Workspace backups you export are ordinary files that you control.",
    ],
  },
  {
    heading: "No accounts, analytics, or advertising",
    body: [
      "There are no user accounts, no analytics or tracking scripts, no advertising, and no cookies set by Markdown Lens.",
    ],
  },
  {
    heading: "Share links",
    body: [
      "When you create a share link, the document is compressed into the part of the URL after the # sign. Browsers do not send that part to the server, so the content is not received by Markdown Lens. Anyone who has the link can read the document, so share it only with people you trust.",
    ],
  },
  {
    heading: "Offline use",
    body: [
      "If you install Markdown Lens or use it repeatedly, a service worker caches the application files so it can work offline. The cache contains the app, not your documents.",
    ],
  },
  {
    heading: "Hosting and remote content",
    body: [
      "The website is hosted on Vercel. Like any web host, Vercel processes standard request information such as IP address, requested URL, and browser user agent to deliver pages and protect the service. Markdown Lens does not receive or store your document content through these requests.",
      "If a Markdown document you open contains images or links that point to other websites, your browser contacts those sites when it displays the images or when you follow the links. Their own privacy policies apply.",
    ],
  },
  {
    heading: "Open source",
    body: [
      "The full source code is public, so you can check how files are handled. Questions about privacy or security can be raised through the project’s GitHub repository.",
    ],
  },
] as const;
