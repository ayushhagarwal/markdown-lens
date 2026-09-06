import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("workspace loads and creates a local document", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop workspace interaction");
  await page.goto("/editor");
  await expect(page.getByRole("link", { name: "Markdown Lens home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Star Markdown Lens on GitHub" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open or convert", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(page.getByText("Untitled document")).toBeVisible();
  await expect(page.getByLabel("Markdown editor").first()).toBeVisible();
});

test("editor header shows File types control on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop lg viewport control");
  await page.goto("/editor");
  const fileTypes = page.getByRole("button", { name: "File types" });
  await expect(fileTypes).toBeVisible();
  await fileTypes.focus();
  await expect(fileTypes).toHaveClass(/focus-visible:ring-2/);
});

test("editor toolbar actions expose a visible keyboard focus treatment", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop toolbar interaction");
  await page.goto("/editor");
  const openButton = page.getByRole("button", { name: "Open or convert", exact: true });
  await openButton.focus();
  await expect(openButton).toHaveClass(/focus-visible:ring-2/);
});

test("workspace utility controls expose keyboard focus treatment", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop workspace utility control");
  await page.goto("/editor");
  const trashButton = page.getByRole("button", { name: "Trash", exact: true });
  await trashButton.focus();
  await expect(trashButton).toHaveClass(/focus-visible:ring-2/);
});

test("workspace toggles expose their expanded state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop workspace toggle semantics");
  await page.goto("/editor");

  const documentsToggle = page.getByRole("button", { name: "Documents", exact: true });
  await expect(documentsToggle).toHaveAttribute("aria-expanded", "true");
  await documentsToggle.click();
  await expect(documentsToggle).toHaveAttribute("aria-expanded", "false");

  const exportToggle = page.getByRole("button", { name: "Export", exact: true });
  await expect(exportToggle).toHaveAttribute("aria-expanded", "false");
  await exportToggle.click();
  await expect(exportToggle).toHaveAttribute("aria-expanded", "true");
  const exportMenu = page.getByRole("menu", { name: "Export options" });
  await expect(exportMenu).toBeVisible();
  const menuItems = exportMenu.getByRole("menuitem");
  await expect(menuItems.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menuItems.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(menuItems.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menuItems.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(exportMenu).toBeHidden();
  await expect(exportToggle).toBeFocused();
  await exportToggle.click();
  await exportMenu.getByRole("menuitem", { name: "Download .md" }).click();
  await expect(exportToggle).toBeFocused();
  await exportToggle.click();
  await page.locator("#main").click({ position: { x: 16, y: 16 } });
  await expect(exportMenu).toBeHidden();
  await expect(page.getByRole("button", { name: "File types", exact: true })).toHaveAttribute("aria-haspopup", "dialog");
});

test("command palette triggers identify their dialog", async ({ page }, testInfo) => {
  await page.goto("/editor");
  const trigger = testInfo.project.name === "mobile"
    ? page.getByRole("button", { name: "Open commands", exact: true })
    : page.getByRole("button", { name: /^Commands/ });
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("mobile workspace can create a document from the header icon", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only workspace interaction");
  await page.goto("/editor");
  await expect(page.getByRole("button", { name: "New document" }).first()).toBeVisible();
  await page.getByRole("button", { name: "New document" }).first().click();
  await page.getByRole("tablist", { name: "Workspace panes" }).getByRole("tab", { name: "Files", exact: true }).click();
  await expect(page.getByText("Untitled document")).toBeVisible();
});

test("mobile document row actions are visible without hover", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only interaction");
  await page.goto("/editor");
  await expect(page.getByRole("main")).toBeVisible();
  await page.getByRole("button", { name: "New document" }).first().click();
  await page
    .getByRole("tablist", { name: "Workspace panes" })
    .getByRole("tab", { name: "Files", exact: true })
    .click();

  const documents = page.locator("#workspace-pane-documents");
  const row = documents.getByRole("button", { name: /Untitled document/ }).first().locator("..");
  await expect(row.getByRole("button", { name: "Rename document" })).toBeVisible();
  await expect(row.getByRole("button", { name: "Move to Trash" })).toBeVisible();

  await row.getByRole("button", { name: "Rename document" }).click();
  const renameDialog = page.getByRole("dialog", { name: "Rename document" });
  await expect(renameDialog).toBeVisible();
  await renameDialog.getByLabel("Document name").fill("Mobile draft");
  await renameDialog.getByRole("button", { name: "Save name" }).click();
  await expect(documents.getByRole("button", { name: /Mobile draft/ })).toBeVisible();

  await row.getByRole("button", { name: "Move to Trash" }).click();
  await expect(page.getByText("moved to Trash.")).toBeVisible();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  const trashedRow = documents.getByRole("button", { name: /Mobile draft/ }).first().locator("..");
  await expect(trashedRow.getByRole("button", { name: "Restore document" })).toBeVisible();
});

test("documents persist independently across immediate switches, rename, trash, and reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop document rail interaction");
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  const documents = page.getByRole("complementary", { name: "Documents" });

  await page.getByRole("button", { name: "New document" }).first().click();
  await editor.fill("# First independent draft");
  await expect(page.locator(".markdown-body").getByRole("heading", { name: "First independent draft" })).toBeVisible();
  await expect(documents.getByRole("button", { name: /First independent draft/ })).toBeVisible();
  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(documents.getByRole("button", { name: /Untitled document/ })).toBeVisible();

  await editor.fill("# Second independent draft");
  await expect(page.locator(".markdown-body").getByRole("heading", { name: "Second independent draft" })).toBeVisible();
  await expect(documents.getByRole("button", { name: /Second independent draft/ })).toBeVisible();
  await documents.getByRole("button", { name: /First independent draft/ }).click();
  await expect(editor).toContainText("First independent draft");

  const firstRow = documents.getByRole("button", { name: /First independent draft/ }).locator("..");
  await firstRow.hover();
  await firstRow.getByRole("button", { name: "Rename document" }).click();
  const renameDialog = page.getByRole("dialog", { name: "Rename document" });
  await renameDialog.getByLabel("Document name").fill("Renamed first draft");
  await renameDialog.getByRole("button", { name: "Save name" }).click();
  await expect(documents.getByRole("button", { name: /Renamed first draft/ })).toBeVisible();

  const secondRow = documents.getByRole("button", { name: /Second independent draft/ }).locator("..");
  await secondRow.hover();
  await secondRow.getByRole("button", { name: "Move to Trash" }).click();
  await expect(page.getByText("moved to Trash.")).toBeVisible();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  const trashedRow = documents.getByRole("button", { name: /Second independent draft/ }).locator("..");
  await trashedRow.hover();
  await trashedRow.getByRole("button", { name: "Restore document" }).click();
  await page.getByRole("button", { name: "Back to documents" }).click();

  await page.reload();
  await expect(documents.getByRole("button", { name: /Renamed first draft/ })).toBeVisible();
  await expect(documents.getByRole("button", { name: /Second independent draft/ })).toBeVisible();
  await documents.getByRole("button", { name: /Second independent draft/ }).click();
  await expect(editor).toContainText("Second independent draft");
});

test("blocked IndexedDB falls back to an actionable session workspace", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open() {
          throw new DOMException("Blocked for this browser profile.", "SecurityError");
        },
      },
    });
  });
  await page.goto("/editor");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByText("Persistent browser storage is unavailable.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export backup" })).toBeVisible();
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("# Session-only draft");
  await expect(editor).toContainText("Session-only draft");
});

test("malformed workspace backups are rejected without replacing local content", async ({ page }) => {
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("# Keep this local draft");
  const malformedDocument = {
    id: "malformed-document",
    title: null,
    markdown: "must not be restored",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    assetIds: [],
    schemaVersion: 1,
  };

  await page.getByLabel("Restore Markdown Lens workspace backup").setInputFiles({
    name: "malformed.markdownlens.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "markdown-lens-workspace",
        version: 1,
        exportedAt: new Date().toISOString(),
        documents: [malformedDocument],
        assets: [],
      }),
    ),
  });

  await expect(page.getByText("Invalid workspace backup:")).toBeVisible();
  await expect(editor).toContainText("Keep this local draft");
  await expect(page.getByText("must not be restored")).toHaveCount(0);
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

test("fenced code blocks copy their source and announce success", async ({ page }, testInfo) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("Inline `code` stays inline.\n\n```js\nconst answer = 42;\n```");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
  }

  const copyButton = page.getByRole("button", { name: "Copy code block" });
  await expect(copyButton).toHaveCount(1);
  await expect(copyButton).toBeVisible();
  if (testInfo.project.name === "mobile") await expect(copyButton).toHaveCSS("opacity", "1");
  await copyButton.click();

  await expect(page.getByText("Code copied to clipboard.", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("const answer = 42;");
});

test("fenced code blocks announce clipboard failures", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("Clipboard unavailable")) },
    });
  });
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("```text\nCopy me\n```");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
  }
  await page.getByRole("button", { name: "Copy code block" }).click();

  await expect(page.getByText("Code could not be copied.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy code block" })).toContainText("Copy failed");
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
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
});

test("mobile workspace panes use explicit labels and switch content", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only interaction");
  await page.goto("/editor");

  const paneNav = page.getByRole("tablist", { name: "Workspace panes" });
  await expect(paneNav.getByRole("tab", { name: "Files", exact: true })).toBeVisible();
  await expect(paneNav.getByRole("tab", { name: "Edit", exact: true })).toBeVisible();
  await expect(paneNav.getByRole("tab", { name: "Preview", exact: true })).toBeVisible();
  await expect(paneNav.getByRole("tab", { name: "Outline", exact: true })).toBeVisible();

  await paneNav.getByRole("tab", { name: "Files", exact: true }).click();
  const documents = page.locator("#workspace-pane-documents");
  await expect(documents).toBeVisible();
  await expect(documents.getByPlaceholder("Search documents")).toBeVisible();

  await paneNav.getByRole("tab", { name: "Edit", exact: true }).click();
  await expect(page.locator('.cm-content[contenteditable="true"]:visible').first()).toBeVisible();
});

test("outline follows rendered headings and focuses the selected target", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop outline interaction");
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill(
    [
      "Document title",
      "==============",
      "",
      "```md",
      "# Not a heading",
      "```",
      "",
      "## Details",
      "",
      "## Details",
    ].join("\n"),
  );

  await expect(page.getByRole("button", { name: "Document title, heading level 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Not a heading, heading level 1" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Details, heading level 2" })).toHaveCount(2);

  const outlineHeading = page.getByRole("button", { name: "Document title, heading level 1" });
  await outlineHeading.focus();
  await expect(outlineHeading).toHaveClass(/focus-visible:ring-2/);
  await outlineHeading.click();
  await expect(page.getByRole("heading", { level: 1, name: "Document title" })).toBeFocused();
  await expect(page.getByRole("heading", { level: 2, name: "Details" })).toHaveCount(2);
  await expect(page.locator("#details-1")).toHaveCount(1);
});

test("find and replace reports match position and honors search options", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop editor interaction");
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("Alpha alpha alphabet");
  await editor.press(process.platform === "darwin" ? "Meta+f" : "Control+f");

  const find = page.getByRole("textbox", { name: "Find" });
  await find.pressSequentially("alpha");
  await page.getByRole("button", { name: "next", exact: true }).click();
  await expect(page.getByText("1 of 3 matches", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "next", exact: true }).click();
  await expect(page.getByText("2 of 3 matches", { exact: true })).toBeVisible();

  await page.getByRole("checkbox", { name: "by word" }).check();
  await expect(page.getByText("2 of 2 matches", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "match case" }).check();
  await expect(page.getByText("1 of 1 matches", { exact: true })).toBeVisible();

  await page.getByRole("textbox", { name: "Replace" }).pressSequentially("gamma");
  await page.getByRole("button", { name: "replace all", exact: true }).click();
  await expect(editor).toContainText("Alpha gamma alphabet");
  await expect(page.getByText("replaced 1 matches.", { exact: true })).toBeVisible();
});

test("share links require explicit consent and preserve existing local drafts", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("# Shared payload\n\nVisible only in the fragment.");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Create share link" })).toHaveAttribute("aria-haspopup", "dialog");
  await page.getByRole("menuitem", { name: "Create share link" }).click();

  const createDialog = page.getByRole("dialog", { name: "Create share link" });
  await expect(createDialog).toContainText("Anyone with this URL can read and copy the document.");
  await expect(createDialog.getByText(/[\d,]+ characters/)).toBeVisible();
  await createDialog.getByRole("button", { name: "Copy share link" }).click();

  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(shareUrl).hash).toMatch(/^#v1:/);
  await expect(page.getByText("Share link copied. Anyone with the URL can read this document.")).toBeVisible();

  await editor.fill("# Existing local draft");
  await page.waitForTimeout(600);
  await page.goto(shareUrl);

  const inspectDialog = page.getByRole("dialog", { name: "Inspect shared document?" });
  await expect(inspectDialog).toContainText("has not been decompressed or parsed");
  await expect(page.getByRole("dialog", { name: "Open shared document?" })).toHaveCount(0);
  await inspectDialog.getByRole("button", { name: "Inspect safely" }).click();
  const openDialog = page.getByRole("dialog", { name: "Open shared document?" });
  await expect(openDialog).toContainText("will not be replaced");
  await expect(editor).toContainText("Existing local draft");
  await openDialog.getByRole("button", { name: "Open as new document" }).click();

  await expect(editor).toContainText("Shared payload");
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
  expect(requestedUrls.every((url) => !url.includes("#v1:"))).toBe(true);
});

test("command palette hints match platform modifier", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop command hints");
  await page.goto("/editor");

  const isApple = await page.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
  );
  const modPrefix = isApple ? "⌘" : "Ctrl+";

  const commandsButton = page.getByRole("button", { name: /Commands/ });
  await expect(commandsButton.locator("kbd")).toHaveText(`${modPrefix}K`);

  await commandsButton.click();
  const commandPalette = page.getByRole("dialog", { name: "Command palette" });
  await expect(commandPalette).toBeVisible();
  await expect(commandPalette.locator("kbd", { hasText: `${modPrefix}N` })).toBeVisible();
});

test("malformed and unsupported share links show safe errors", async ({ page }) => {
  await page.goto("/editor#v2:unsupported");
  await expect(page.getByText("This Markdown Lens share-link version is not supported.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");

  await page.goto("/editor#v1:not-valid-compressed-data");
  await page
    .getByRole("dialog", { name: "Inspect shared document?" })
    .getByRole("button", { name: "Inspect safely" })
    .click();
  await expect(page.getByText("This Markdown Lens share link is malformed.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
});
