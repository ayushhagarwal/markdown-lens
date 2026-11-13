import {
  autocompletion,
  pickedCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { Prec, type EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import {
  buildSlashEdit,
  filterSlashCommands,
  findSlashTrigger,
  isInsideCode,
  type SlashCommand,
} from "@/lib/slash-commands";

export type SlashMenuHandlers = {
  /** Called after the `/query` text is removed; the host opens its table dialog. */
  onInsertTable: () => void;
  /** Optional: called after the `/query` text is removed. Without it, Markdown image syntax is inserted. */
  onInsertImage?: () => void;
};

const CODE_NODES = new Set(["FencedCode", "CodeBlock", "InlineCode", "CodeText", "CodeInfo", "CodeMark"]);

function hasCodeAncestor(start: SyntaxNode) {
  for (let node: SyntaxNode | null = start; node; node = node.parent) {
    if (CODE_NODES.has(node.name)) return true;
  }
  return false;
}

function insideCode(state: EditorState, position: number) {
  const tree = syntaxTree(state);
  if (tree.length > 0 && tree.length >= position) {
    return hasCodeAncestor(tree.resolveInner(position, -1)) || hasCodeAncestor(tree.resolveInner(position, 1));
  }
  return isInsideCode(state.sliceDoc(0, state.doc.lineAt(position).to), position);
}

function runCommand(view: EditorView, command: SlashCommand, completion: Completion, from: number, to: number, handlers: SlashMenuHandlers) {
  const hostHandler = command.host === "table" ? handlers.onInsertTable : command.host === "image" ? handlers.onInsertImage : undefined;
  if (hostHandler) {
    view.dispatch({
      changes: { from, to, insert: "" },
      selection: { anchor: from },
      annotations: pickedCompletion.of(completion),
      userEvent: "input.complete",
    });
    hostHandler();
    return;
  }

  const edit = buildSlashEdit(command, { markdown: view.state.doc.toString(), from, to });
  view.dispatch({
    changes: edit.changes,
    selection: edit.selection,
    scrollIntoView: true,
    annotations: pickedCompletion.of(completion),
    userEvent: "input.complete",
  });
}

function slashSource(handlers: SlashMenuHandlers) {
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context;
    const line = state.doc.lineAt(pos);
    const trigger = findSlashTrigger(line.text, pos - line.from);
    if (!trigger) return null;
    const from = line.from + trigger.from;
    if (insideCode(state, from)) return null;
    const commands = filterSlashCommands(trigger.query);
    if (!commands.length) return null;
    return {
      from,
      to: pos,
      filter: false,
      options: commands.map((command) => ({
        label: command.label,
        detail: command.detail,
        type: "slash",
        apply: (view: EditorView, completion: Completion, applyFrom: number, applyTo: number) =>
          runCommand(view, command, completion, applyFrom, applyTo, handlers),
      })),
    };
  };
}

const slashMenuTheme = EditorView.theme({
  ".cm-tooltip.cm-tooltip-autocomplete.cm-slash-menu": {
    backgroundColor: "hsl(var(--panel))",
    color: "hsl(var(--foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    boxShadow: "0 12px 32px -12px rgb(0 0 0 / 0.35)",
    padding: "4px",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete.cm-slash-menu > ul": {
    fontFamily: "inherit",
    maxHeight: "min(320px, 50vh)",
    minWidth: "260px",
  },
  ".cm-tooltip.cm-tooltip-autocomplete.cm-slash-menu > ul > li": {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
    padding: "6px 10px",
    borderRadius: "6px",
    color: "hsl(var(--foreground))",
    lineHeight: "1.4",
  },
  ".cm-tooltip.cm-tooltip-autocomplete.cm-slash-menu > ul > li[aria-selected]": {
    backgroundColor: "hsl(var(--accent) / 0.14) !important",
    color: "hsl(var(--foreground)) !important",
  },
  ".cm-tooltip.cm-tooltip-autocomplete.cm-slash-menu > ul > li:hover": {
    backgroundColor: "hsl(var(--surface))",
  },
  ".cm-slash-menu .cm-completionLabel": {
    fontSize: "13px",
    fontWeight: "500",
  },
  ".cm-slash-menu li[aria-selected] .cm-completionLabel": {
    color: "hsl(var(--accent))",
  },
  ".cm-slash-menu .cm-completionDetail": {
    marginLeft: "auto",
    fontStyle: "normal",
    fontSize: "11px",
    color: "hsl(var(--muted-foreground))",
  },
  ".cm-slash-menu .cm-completionMatchedText": {
    textDecoration: "none",
    color: "hsl(var(--accent))",
  },
});

/**
 * `/` command menu for the Markdown editor. Brings its own `autocompletion` instance limited to the
 * slash source, so general word completion stays off.
 */
export function slashMenuExtension(handlers: SlashMenuHandlers): Extension {
  return [
    autocompletion({
      override: [slashSource(handlers)],
      activateOnTyping: true,
      icons: false,
      closeOnBlur: true,
      maxRenderedOptions: 40,
      tooltipClass: () => "cm-slash-menu",
    }),
    Prec.highest(slashMenuTheme),
  ];
}
