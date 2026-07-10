import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("workspace loads and creates a local document", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop workspace interaction");
  await page.goto("/editor");
  await expect(page.getByRole("link", { name: "Markdown Lens home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open or convert", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New document" }).click();
  await expect(page.getByText("Untitled document")).toBeVisible();
  await expect(page.getByLabel("Markdown editor").first()).toBeVisible();
});

test("@a11y editor has no serious accessibility violations", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("main")).toBeVisible();
  const results = await new AxeBuilder({ page }).exclude(".cm-content").analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("mobile switches between editor and preview", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only interaction");
  await page.goto("/editor");
  await page.getByRole("button", { name: "preview", exact: true }).click();
  await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
});
