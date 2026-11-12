import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        panel: "hsl(var(--panel) / <alpha-value>)",
        "panel-foreground": "hsl(var(--panel-foreground) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-foreground": "hsl(var(--accent-foreground) / <alpha-value>)",
        "accent-soft": "hsl(var(--accent-soft) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        highlight: "hsl(var(--highlight) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        panel:
          "0 1px 2px hsl(var(--shadow-color) / 0.05), 0 20px 70px -48px hsl(var(--shadow-color) / 0.55)",
        soft: "0 1px 2px hsl(var(--shadow-color) / 0.05), 0 12px 32px -18px hsl(var(--shadow-color) / 0.25)",
        lift: "0 2px 4px hsl(var(--shadow-color) / 0.06), 0 30px 70px -30px hsl(var(--shadow-color) / 0.45)",
      },
    },
  },
  plugins: [typography],
};

export default config;
