/**
 * Clones the rendered preview and swaps out parts that do not survive outside the app:
 * task checkboxes become ☐/☑ text (sanitising removes inputs), and screen-reader-only
 * helper text and code-block copy controls are dropped. With `replaceMath`, KaTeX output
 * becomes its TeX source, for targets that cannot load the KaTeX stylesheet.
 */
export function prepareExportClone(source: HTMLElement, { replaceMath = false } = {}) {
  const clone = source.cloneNode(true) as HTMLElement;
  replaceUnportableParts(clone, { replaceMath });
  return clone;
}

export function replaceUnportableParts(root: Element, { replaceMath = false } = {}) {
  const doc = root.ownerDocument;
  root.querySelectorAll<HTMLInputElement>("input[type='checkbox']").forEach((input) => {
    input.replaceWith(doc.createTextNode(input.hasAttribute("checked") || input.checked ? "☑ " : "☐ "));
  });
  root.querySelectorAll(".sr-only, button").forEach((element) => element.remove());
  if (!replaceMath) return;
  root.querySelectorAll(".katex-display, .katex").forEach((element) => {
    if (!root.contains(element)) return;
    const tex = element.querySelector("annotation[encoding='application/x-tex']")?.textContent?.trim();
    if (tex === undefined) return;
    const display = element.classList.contains("katex-display");
    const code = doc.createElement("code");
    code.textContent = display ? `$$ ${tex} $$` : `$${tex}$`;
    if (display) {
      const block = doc.createElement("p");
      block.appendChild(code);
      element.replaceWith(block);
    } else {
      element.replaceWith(code);
    }
  });
}
