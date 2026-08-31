import { expect, test } from "@playwright/test";

const OFFLINE_MARKDOWN = [
  "# Offline proof",
  "",
  "```js",
  "const pwaUserDocumentSecret = true;",
  "```",
  "",
  "$$x^2 + y^2 = z^2$$",
  "",
  "```mermaid",
  "graph TD",
  "  Cached --> Offline",
  "```",
].join("\n");

test("production editor and core rendering work offline without caching user Markdown", async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/editor");
  await expect(page.getByRole("main")).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return response.json();
  });
  expect(manifest).toMatchObject({
    id: "/editor",
    start_url: "/editor",
    display: "standalone",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
    ]),
  );

  const editor = page.locator('.cm-content[contenteditable="true"]:visible');
  await editor.fill(OFFLINE_MARKDOWN);
  await expect(page.locator(".markdown-body .hljs")).toBeVisible();
  await expect(page.locator(".markdown-body .katex")).toBeVisible();
  await expect(page.locator(".markdown-body svg").last()).toBeVisible();
  await page.waitForTimeout(700);

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cacheNames = await caches.keys();
        const requests = await Promise.all(
          cacheNames
            .filter((name) => name.startsWith("markdown-lens-"))
            .map(async (name) => (await caches.open(name)).keys()),
        );
        return requests.flat().filter((request) => request.url.includes("/_next/static/")).length;
      }),
    )
    .toBeGreaterThan(0);

  const cachedUrls = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const requests = await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("markdown-lens-"))
        .map(async (name) => (await caches.open(name)).keys()),
    );
    return requests.flat().map((request) => request.url);
  });
  expect(cachedUrls.some((url) => url.includes("pwaUserDocumentSecret"))).toBe(false);

  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("main")).toBeVisible();
  // Playwright 1.62 Chromium can report navigator.onLine === true after reload
  // even when the context is offline. Re-emit the event so the app banner matches.
  await page.evaluate(() => {
    if (navigator.onLine) window.dispatchEvent(new Event("offline"));
  });
  await expect(page.getByRole("status", { name: "Offline. Changes remain on this device." })).toBeVisible();
  await expect(page.locator('.cm-content[contenteditable="true"]:visible')).toContainText("pwaUserDocumentSecret");
  await expect(page.locator(".markdown-body .hljs")).toBeVisible();
  await expect(page.locator(".markdown-body .katex")).toBeVisible();
  await expect(page.locator(".markdown-body svg").last()).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
