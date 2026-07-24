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

test("desktop split persists keyboard resizing and can be reset", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop workspace interaction");
  await page.addInitScript(() => {
    if (!localStorage.getItem("markdown-lens:split-ratio")) {
      localStorage.setItem("markdown-lens:split-ratio", "62");
    }
  });
  await page.goto("/editor");

  const separator = page.getByRole("separator", { name: "Resize editor and preview" });
  await expect(separator).toHaveAttribute("aria-valuenow", "62");
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "64");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("markdown-lens:split-ratio"))).toBe("64");

  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", "64");
  await page.getByRole("button", { name: "Reset split" }).click();
  await expect(separator).toHaveAttribute("aria-valuenow", "50");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("markdown-lens:split-ratio"))).toBeNull();
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
