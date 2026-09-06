import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("homepage presents the local workspace clearly", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Free Local Markdown Editor and Document Converter | Markdown Lens");
  await expect(page.getByRole("heading", { level: 1, name: "A local Markdown editor that converts documents privately." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open workspace" }).first()).toHaveAttribute("href", "/editor");
  await expect(page.getByRole("link", { name: "Star Markdown Lens on GitHub (opens in a new tab)" }).first()).toHaveAttribute("href", "https://github.com/ayushhagarwal/markdown-lens");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Star Markdown Lens on GitHub (opens in a new tab)" })).toHaveClass(/focus-visible:ring-2/);
  await expect(page.getByRole("navigation", { name: "Popular converters" }).getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/pdf-to-markdown");
  await expect(page.getByRole("navigation", { name: "Popular converters" }).getByRole("link", { name: "Word" })).toHaveAttribute("href", "/word-to-markdown");
  await expect(page.getByText("Quick answers")).toHaveCount(0);

  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(schemas.join(" ")).not.toContain("FAQPage");
  expect(schemas.join(" ")).toContain('"softwareVersion":"0.9.4"');
});

test("primary navigation identifies the current page", async ({ page }, testInfo) => {
  await page.goto("/pdf-to-markdown");

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "PDF" })).toHaveAttribute("aria-current", "page");
    return;
  }

  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "PDF" })).toHaveAttribute("aria-current", "page");
});

test("homepage follows system color scheme and preserves a saved light preference", async ({ browser }) => {
  const darkContext = await browser.newContext({ colorScheme: "dark" });
  const darkPage = await darkContext.newPage();
  await darkPage.goto("http://127.0.0.1:3000/");
  await expect(darkPage.locator("html")).toHaveClass(/dark/);
  await darkContext.close();

  const lightContext = await browser.newContext({ colorScheme: "light" });
  const lightPage = await lightContext.newPage();
  await lightPage.goto("http://127.0.0.1:3000/");
  await expect(lightPage.locator("html")).not.toHaveClass(/dark/);
  await lightContext.close();

  const savedContext = await browser.newContext({ colorScheme: "dark" });
  await savedContext.addInitScript(() => localStorage.setItem("markdown-lens:theme", "light"));
  const savedPage = await savedContext.newPage();
  await savedPage.goto("http://127.0.0.1:3000/");
  await expect(savedPage.locator("html")).not.toHaveClass(/dark/);
  await savedContext.close();
});

test("@a11y homepage has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("@a11y Markdown cheatsheet has no serious accessibility violations", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/markdown-cheatsheet");
  await expect(page.getByRole("heading", { level: 1, name: "Markdown cheatsheet" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("supported formats uses cards on small screens and a table from md up", async ({ page }, testInfo) => {
  await page.goto("/supported-formats");
  await expect(page.getByRole("heading", { level: 1, name: "Supported Markdown and document formats" })).toBeVisible();
  const cards = page.getByRole("list", { name: "Supported formats" });
  const table = page.getByRole("table");

  if (testInfo.project.name === "mobile") {
    await expect(cards).toBeVisible();
    await expect(table).toBeHidden();
    await expect(cards.getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/pdf-to-markdown");
    await expect(cards).toContainText("Scans require local OCR; complex layout needs review.");
    return;
  }

  await expect(table).toBeVisible();
  await expect(cards).toBeHidden();
  await expect(table.getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/pdf-to-markdown");
  await expect(table).toContainText("Scans require local OCR; complex layout needs review.");
});

test("format landing FAQs show an open/close affordance", async ({ page }) => {
  await page.goto("/html-to-markdown");
  const item = page.locator("details").filter({ hasText: "Does Markdown Lens execute scripts?" });
  await expect(item.locator("summary")).toBeVisible();
  await expect(item.locator("summary [aria-hidden]")).toHaveText("+");
  await expect(item.getByText("No. Script, style, frame, object, and form elements are removed before Markdown conversion.")).toBeHidden();
  await item.locator("summary").click();
  await expect(item.getByText("No. Script, style, frame, object, and form elements are removed before Markdown conversion.")).toBeVisible();
});

test("mobile navigation and preview tabs respond", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only interaction");
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.locator('button[aria-label="Close navigation"]').last().click();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();

  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();

  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Product Requirements");

  for (const path of ["/supported-formats", "/markdown-cheatsheet"]) {
    await page.goto(path);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/editor");
  }
});
