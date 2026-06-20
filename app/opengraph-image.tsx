import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = "Markdown Lens free online Markdown viewer and editor";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f6f8fa",
          color: "#111827",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: 56,
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <div
              style={{
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #d6dde6",
                borderRadius: 18,
                color: "#0f766e",
                display: "flex",
                fontSize: 28,
                fontWeight: 800,
                height: 64,
                justifyContent: "center",
                width: 64,
              }}
            >
              ML
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>{siteConfig.name}</div>
              <div style={{ color: "#526173", fontSize: 22 }}>
                Free Online Markdown Viewer and Editor
              </div>
            </div>
          </div>
          <div
            style={{
              background: "#dff7f4",
              border: "1px solid #9de8df",
              borderRadius: 999,
              color: "#0f766e",
              fontSize: 20,
              fontWeight: 700,
              padding: "10px 18px",
            }}
          >
            Privacy-first
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 850,
              letterSpacing: 0,
              lineHeight: 1.02,
              maxWidth: 920,
            }}
          >
            Preview Markdown instantly.
          </div>
          <div
            style={{
              color: "#526173",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 980,
            }}
          >
            GitHub-style Markdown, Mermaid diagrams, math, code highlighting, tables,
            local autosave, and dark mode.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Markdown editor", "Markdown viewer", "Markdown preview tool"].map((label) => (
            <div
              key={label}
              style={{
                background: "#ffffff",
                border: "1px solid #d6dde6",
                borderRadius: 12,
                color: "#263241",
                fontSize: 20,
                fontWeight: 700,
                padding: "12px 16px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
