import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("homepage presents the local workspace clearly", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Free Local Markdown Editor and Document Converter | Markdown Lens");
  await expect(page.getByRole("heading", { level: 1, name: "A local Markdown editor that converts documents privately." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open workspace" }).first()).toHaveAttribute("href", "/editor");
  await expect(page.getByRole("navigation", { name: "Popular converters" }).getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/pdf-to-markdown");
  await expect(page.getByRole("navigation", { name: "Popular converters" }).getByRole("link", { name: "Word" })).toHaveAttribute("href", "/word-to-markdown");
  await expect(page.getByText("Quick answers")).toHaveCount(0);

  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(schemas.join(" ")).not.toContain("FAQPage");
  expect(schemas.join(" ")).toContain('"softwareVersion":"0.9.4"');
});

test("homepage defaults to dark and preserves a saved light preference", async ({ browser }) => {
  const defaultContext = await browser.newContext();
  const defaultPage = await defaultContext.newPage();
  await defaultPage.goto("http://127.0.0.1:3000/");
  await expect(defaultPage.locator("html")).toHaveClass(/dark/);
  await defaultContext.close();

  const savedContext = await browser.newContext();
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
  await page.goto("/markdown-cheatsheet");
  await expect(page.getByRole("heading", { level: 1, name: "Markdown cheatsheet" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("mobile navigation and preview tabs respond", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only interaction");
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();

  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Product Requirements");
});
