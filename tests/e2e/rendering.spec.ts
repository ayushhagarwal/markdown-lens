import { expect, test } from "@playwright/test";
import { majorSyntaxMarkdown, malformedMermaidMarkdown } from "../fixtures/markdown";

async function showPreviewOnMobile(page: import("@playwright/test").Page, projectName: string) {
  if (projectName === "mobile") {
    await page.getByRole("button", { name: "preview", exact: true }).click();
  }
}

test("major Markdown syntax renders with semantic output", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/editor");
  await page.locator('.cm-content[contenteditable="true"]:visible').fill(majorSyntaxMarkdown);
  await showPreviewOnMobile(page, testInfo.project.name);

  const preview = page.locator(".markdown-body:visible");
  await expect(preview.getByRole("heading", { level: 1, name: "Rendering fixture" })).toHaveAttribute(
    "id",
    "rendering-fixture",
  );
  await expect(preview.getByRole("table")).toContainText("Tables");
  const coveredTask = preview.getByRole("listitem").filter({ hasText: "Covered" });
  const extendableTask = preview.getByRole("listitem").filter({ hasText: "Extendable" });
  await expect(coveredTask.getByRole("checkbox")).toBeChecked();
  await expect(coveredTask.getByRole("checkbox")).toBeDisabled();
  await expect(extendableTask.getByRole("checkbox")).not.toBeChecked();
  await expect(extendableTask.getByRole("checkbox")).toBeDisabled();

  const externalLink = preview.getByRole("link", { name: "Safe external link" });
  await expect(externalLink).toHaveAttribute("href", "https://example.com/docs");
  await expect(externalLink).toHaveAttribute("target", "_blank");
  await expect(externalLink).toHaveAttribute("rel", "noreferrer");

  await expect(preview.locator("code").filter({ hasText: "const answer = 42" })).toBeVisible();
  await expect(preview.locator("pre .hljs")).toContainText("const answer: number = 42;");
  await expect(preview.locator(".katex")).toBeVisible();
  await expect(preview.locator("svg").last()).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("malformed Mermaid keeps the preview usable with an explicit fallback", async ({ page }, testInfo) => {
  await page.goto("/editor");
  await page.locator('.cm-content[contenteditable="true"]:visible').fill(malformedMermaidMarkdown);
  await showPreviewOnMobile(page, testInfo.project.name);

  const preview = page.locator(".markdown-body:visible");
  await expect(preview.getByText("Mermaid diagram could not be rendered.", { exact: true })).toBeVisible();
  await expect(preview.getByRole("heading", { level: 1, name: "Diagram fallback" })).toBeVisible();
});

test("keyboard shortcuts open commands and create an independent draft", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop keyboard workflow");
  await page.goto("/editor");

  await page.keyboard.press("ControlOrMeta+K");
  const commandPalette = page.getByRole("dialog", { name: "Command palette" });
  await expect(commandPalette).toBeVisible();
  await expect(commandPalette.getByPlaceholder("Type a command…")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(commandPalette).toBeHidden();

  await page.keyboard.press("ControlOrMeta+N");
  await expect(page.getByRole("complementary", { name: "Documents" }).getByText("Untitled document")).toBeVisible();
});
