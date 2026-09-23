import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("document list distinguishes an empty workspace from a search miss", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop document rail");
  await page.goto("/editor");
  const documents = page.getByRole("complementary", { name: "Documents" });
  await documents.getByLabel("Search documents").fill("no-such-document");
  await expect(documents.getByText("No documents match this search.")).toBeVisible();
  await documents.getByLabel("Search documents").fill("");
  await documents.getByRole("button", { name: "Actions for Welcome to Markdown Lens" }).first().click();
  await documents.getByRole("menuitem", { name: "Move to Trash" }).click();
  await expect(documents.getByText("No documents yet.")).toBeVisible();
  await expect(documents.getByRole("button", { name: "New document" })).toBeVisible();
  await expect(documents.getByRole("button", { name: "Open or convert" })).toBeVisible();
});

test("welcome document shows a rendered sample instead of setup instructions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop split preview");
  await page.goto("/editor");
  await expect(page.getByRole("complementary", { name: "Documents" }).getByRole("button", { name: /^MD Welcome to Markdown Lens/ })).toContainText("MD");
  const preview = page.locator(".markdown-body");
  await expect(preview.getByRole("table")).toContainText("Extracted text");
  await expect(preview.locator("pre")).toContainText("const workspace");
  await expect(preview.locator(".katex")).toBeVisible();
  await expect(preview.getByRole("button", { name: "Render diagram" })).toBeVisible();
});

test("workspace loads and creates a local document", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop workspace interaction");
  await page.goto("/editor");
  await expect(page.getByRole("link", { name: "Markdown Lens home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Star Markdown Lens on GitHub (opens in a new tab)" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open or convert", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(page.getByText("Untitled document")).toBeVisible();
  await expect(page.getByLabel("Markdown editor").first()).toBeVisible();
});

test("preview blocks executable link and image URLs", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "New document" }).first().click();
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("[unsafe link](javascript:alert(1))\n\n![unsafe image](javascript:alert(2))");
  const preview = page.locator(".markdown-body");
  await expect(preview).toContainText("unsafe link");
  await expect(preview.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(preview.locator('img[src^="javascript:"]')).toHaveCount(0);
});

test("preview labels blocked remote images and offers explicit loading", async ({ page }, testInfo) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "New document" }).first().click();
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("![Remote diagram](https://images.example.com/diagram.png)");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
  }
  const imageGroup = page.getByRole("group", { name: "Remote image blocked from images.example.com" });
  await expect(imageGroup).toBeVisible();
  await expect(imageGroup.getByRole("button", { name: "Load image" })).toBeVisible();
});

test("preview reports failed remote-image loads with retry", async ({ page }, testInfo) => {
  await page.route("https://images.example.com/failed.png", (route) => route.fulfill({ status: 503, contentType: "image/png", body: "" }));
  await page.goto("/editor");
  await page.getByRole("button", { name: "New document" }).first().click();
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("![Unavailable image](https://images.example.com/failed.png)");
  if (testInfo.project.name === "mobile") await page.getByRole("tab", { name: "Preview", exact: true }).click();
  const imageGroup = page.getByRole("group", { name: "Remote image blocked from images.example.com" });
  await imageGroup.getByRole("button", { name: "Load image" }).click();
  const failure = page.getByRole("status", { name: "Remote image could not be loaded from images.example.com" });
  await expect(failure).toBeVisible();
  await expect(failure.getByRole("button", { name: "Retry image" })).toBeVisible();
});

test("preview keeps internal links in context and external links safe", async ({ page }, testInfo) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "New document" }).first().click();
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await editor.fill("[Jump to section](#section)\n\n[External docs](https://example.com/docs)\n\n[Protocol-relative](//example.com/docs)\n\n## Section");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
  }
  const preview = page.locator(".markdown-body");
  const internal = preview.getByRole("link", { name: "Jump to section" });
  const external = preview.getByRole("link", { name: /External docs/ });
  await expect(internal).not.toHaveAttribute("target", "_blank");
  await expect(internal).not.toHaveAttribute("rel", /noopener/);
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external).toHaveAttribute("rel", "noopener noreferrer");
  await expect(preview.getByRole("link", { name: /Protocol-relative/ })).toHaveAttribute("target", "_blank");
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

test("image imports use an accessible OCR confirmation dialog", async ({ page }) => {
  await page.goto("/editor");
  const fileInput = page.getByLabel("Open or convert local documents");
  const image = {
    name: "scan.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  };

  await fileInput.setInputFiles(image);
  const dialog = page.getByRole("alertdialog", { name: "Run local OCR?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("scan.png");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await fileInput.setInputFiles(image);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Run OCR" }).click();
  await expect(dialog).toBeHidden();
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
  const row = documents.getByRole("button", { name: /^MD Untitled document/ }).first().locator("xpath=../..");
  await expect(row.getByRole("button", { name: "Actions for Untitled document" })).toBeVisible();
  await row.getByRole("button", { name: "Actions for Untitled document" }).click();
  await expect(row.getByRole("menuitem", { name: "Rename document" })).toBeVisible();
  await expect(row.getByRole("menuitem", { name: "Move to Trash" })).toBeVisible();

  await row.getByRole("menuitem", { name: "Rename document" }).click();
  const renameDialog = page.getByRole("dialog", { name: "Rename document" });
  await expect(renameDialog).toBeVisible();
  await renameDialog.getByLabel("Document name").fill("Mobile draft");
  await renameDialog.getByRole("button", { name: "Save name" }).click();
  await expect(documents.getByRole("button", { name: /^MD Mobile draft/ })).toBeVisible();

  const renamed = documents.getByRole("button", { name: /^MD Mobile draft/ }).locator("xpath=../..");
  await renamed.getByRole("button", { name: "Actions for Mobile draft" }).click();
  await renamed.getByRole("menuitem", { name: "Move to Trash" }).click();
  await expect(page.getByText("moved to Trash.")).toBeVisible();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  const trashedRow = documents.getByRole("button", { name: /^MD Mobile draft/ }).first().locator("xpath=../..");
  await trashedRow.getByRole("button", { name: "Actions for Mobile draft" }).click();
  await expect(trashedRow.getByRole("menuitem", { name: "Restore document" })).toBeVisible();
  await trashedRow.getByRole("menuitem", { name: "Delete permanently" }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete document permanently?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(deleteDialog).toBeHidden();
});

test("documents persist independently across immediate switches, rename, trash, and reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop document rail interaction");
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/");
  await page.evaluate(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("markdown-lens-workspace");
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  }));
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  const documents = page.getByRole("complementary", { name: "Documents" });

  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(documents.getByRole("button", { name: /^MD Untitled document/ })).toBeVisible();
  await editor.fill("# First independent draft");
  await expect(page.locator(".markdown-body").getByRole("heading", { name: "First independent draft" })).toBeVisible();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(documents.getByRole("button", { name: /^MD First independent draft/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(documents.getByRole("button", { name: /^MD Untitled document/ })).toBeVisible();

  await editor.fill("# Second independent draft");
  await expect(page.locator(".markdown-body").getByRole("heading", { name: "Second independent draft" })).toBeVisible();
  await expect(documents.getByRole("button", { name: /^MD Second independent draft/ })).toBeVisible();
  await documents.getByRole("button", { name: /^MD First independent draft/ }).click();
  await expect(editor).toContainText("First independent draft");

  const firstRow = documents.getByRole("button", { name: /^MD First independent draft/ }).locator("xpath=../..");
  await firstRow.getByRole("button", { name: "Actions for First independent draft" }).click();
  await firstRow.getByRole("menuitem", { name: "Rename document" }).click();
  const renameDialog = page.getByRole("dialog", { name: "Rename document" });
  await renameDialog.getByLabel("Document name").fill("Renamed first draft");
  await renameDialog.getByRole("button", { name: "Save name" }).click();
  await expect(documents.getByRole("button", { name: /^MD Renamed first draft/ })).toBeVisible();

  const secondRow = documents.getByRole("button", { name: /^MD Second independent draft/ }).locator("xpath=../..");
  await secondRow.getByRole("button", { name: "Actions for Second independent draft" }).click();
  await secondRow.getByRole("menuitem", { name: "Move to Trash" }).click();
  await expect(page.getByText("moved to Trash.")).toBeVisible();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  const trashedRow = documents.getByRole("button", { name: /^MD Second independent draft/ }).locator("xpath=../..");
  await trashedRow.getByRole("button", { name: "Actions for Second independent draft" }).click();
  await trashedRow.getByRole("menuitem", { name: "Restore document" }).click();
  await page.getByRole("button", { name: "Back to documents" }).click();

  await page.reload();
  await expect(documents.getByRole("button", { name: /^MD Renamed first draft/ })).toBeVisible();
  await expect(documents.getByRole("button", { name: /^MD Second independent draft/ })).toBeVisible();
  await documents.getByRole("button", { name: /^MD Second independent draft/ }).click();
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
  await expect(separator).toHaveAttribute("aria-orientation", "vertical");
  await expect(separator).toHaveAttribute("aria-valuenow", "62");
  await expect(separator).toHaveAttribute("aria-valuetext", "62% editor, 38% preview");
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "64");
  await expect(separator).toHaveAttribute("aria-valuetext", "64% editor, 36% preview");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("markdown-lens:split-ratio"))).toBe("64");

  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", "64");
  await page.getByRole("button", { name: "Reset split" }).click();
  await expect(separator).toHaveAttribute("aria-valuenow", "50");
  await expect(separator).toHaveAttribute("aria-valuetext", "50% editor, 50% preview");
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

test("@a11y editor has no accessibility violations", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("main")).toBeVisible();
  const results = await new AxeBuilder({ page }).exclude(".cm-content").exclude(".cm-scroller").analyze();
  expect(results.violations).toEqual([]);
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

test("editor and preview stay aligned and the outline follows the preview", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop split preview");
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  const sections = Array.from({ length: 24 }, (_, index) => `## Section ${index}\n\nParagraph ${index}.`).join("\n\n");
  await editor.fill(sections);
  await expect(page.getByRole("button", { name: "Section 23, heading level 2" })).toBeVisible();

  await page.locator("#section-10").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(page.locator('[aria-label="Document outline"] [aria-current="location"]')).toHaveAttribute("aria-label", /Section (9|10|11), heading level 2/);
  await expect.poll(() => page.locator(".cm-scroller:visible").first().evaluate((element) => element.scrollTop)).toBeGreaterThan(40);

  await page.getByRole("heading", { name: "Section 10" }).click();
  await expect(page.getByText("Ln 41, Col 1")).toBeVisible();
});

test("writing controls keep focus, type size, search hits, and local versions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop writing controls");
  await page.goto("/editor");
  const documents = page.getByRole("complementary", { name: "Documents" });
  await documents.getByLabel("Search documents").fill("real renderer");
  await expect(documents.locator("mark")).toContainText("real renderer");

  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(documents).toBeHidden();
  await expect(page.getByRole("complementary", { name: "Outline" })).toBeHidden();
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Documents" })).toBeHidden();
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Documents" })).toBeVisible();

  const editorSurface = page.locator(".cm-editor:visible").first();
  const editorContent = page.locator(".cm-content:visible").first();
  await expect(editorSurface).toHaveCSS("font-size", "13.5px");
  await page.getByRole("button", { name: "Increase font size" }).click();
  await expect(editorSurface).toHaveCSS("font-size", "15px");
  await expect(editorContent).toHaveClass(/cm-lineWrapping/);
  await page.getByRole("button", { name: "Wrap", exact: true }).click();
  await expect(editorContent).not.toHaveClass(/cm-lineWrapping/);

  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(documents.getByRole("button", { name: /^MD Untitled document/ })).toBeVisible();
  await editor.fill("# Version one");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await editor.fill("# Version two");
  await expect(page.getByRole("heading", { name: "Version two" })).toBeVisible();
  await page.getByRole("button", { name: "Versions", exact: true }).click();
  const versions = page.getByRole("dialog", { name: "Local versions" });
  await expect(versions).toBeVisible();
  await versions.getByRole("button", { name: /Restore / }).click();
  await expect(editor).toContainText("Version one");

  const download = page.waitForEvent("download");
  await page.keyboard.press("ControlOrMeta+s");
  await download;
  await expect(page.getByText("Saved on this device. Downloaded a copy.")).toBeVisible();
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
  await expect(createDialog).toContainText("This link contains the full text.");
  await expect(createDialog).toContainText("Pasting it into a chat or email publishes the document.");
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

test("export menu separates this document from the workspace", async ({ page }, testInfo) => {
  await page.goto("/editor");
  if (testInfo.project.name !== "mobile") {
    await expect(page.getByRole("button", { name: "Print", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const menu = page.getByRole("menu", { name: "Export options" });
  const documentGroup = menu.getByRole("group", { name: "This document" });
  const workspaceGroup = menu.getByRole("group", { name: "Workspace" });
  await expect(documentGroup.getByRole("menuitem", { name: "Create share link" })).toContainText("Contains the full text");
  await expect(documentGroup.getByRole("menuitem", { name: "Print / save PDF" })).toBeVisible();
  await expect(workspaceGroup.getByRole("menuitem", { name: "Restore workspace backup" })).toBeVisible();
  await expect(documentGroup.getByRole("menuitem", { name: "Restore workspace backup" })).toHaveCount(0);
  await expect(workspaceGroup.getByRole("menuitem", { name: "Create share link" })).toHaveCount(0);
});

test("a document that cannot fit in a share link offers a download", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop editor fill");
  test.setTimeout(60_000);
  await page.goto("/editor");
  const editor = page.locator('.cm-content[contenteditable="true"]:visible').first();
  const markdown = await page.evaluate(() => {
    let state = 0x12345678;
    let text = "";
    while (text.length < 50_000) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      text += (state >>> 0).toString(36);
    }
    return text.slice(0, 50_000);
  });
  await editor.fill(markdown);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const menu = page.getByRole("menu", { name: "Export options" });
  await expect(menu).toContainText("This document is too large for a share link.");
  await expect(menu.getByRole("menuitem", { name: "Create share link" })).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await menu.getByRole("menuitem", { name: "Download .md instead", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.md$/);
});

test("editor follows the system theme until a choice is saved", async ({ browser }) => {
  const lightContext = await browser.newContext({ colorScheme: "light" });
  const lightPage = await lightContext.newPage();
  await lightPage.goto("http://127.0.0.1:3000/editor");
  await expect(lightPage.locator("html")).not.toHaveClass(/dark/);
  await expect(lightPage.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await lightPage.reload();
  await expect(lightPage.locator("html")).not.toHaveClass(/dark/);
  await lightPage.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(lightPage.locator("html")).toHaveClass(/dark/);
  await lightPage.reload();
  await expect(lightPage.locator("html")).toHaveClass(/dark/);
  await lightContext.close();

  const darkContext = await browser.newContext({ colorScheme: "dark" });
  const darkPage = await darkContext.newPage();
  await darkPage.goto("http://127.0.0.1:3000/editor");
  await expect(darkPage.locator("html")).toHaveClass(/dark/);
  await expect(darkPage.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  await darkContext.close();

  const savedContext = await browser.newContext({ colorScheme: "dark" });
  await savedContext.addInitScript(() => localStorage.setItem("markdown-lens:theme", "light"));
  const savedPage = await savedContext.newPage();
  await savedPage.goto("http://127.0.0.1:3000/editor");
  await expect(savedPage.locator("html")).not.toHaveClass(/dark/);
  await expect(savedPage.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await savedContext.close();
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
