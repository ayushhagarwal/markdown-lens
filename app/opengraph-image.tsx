import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "@/lib/site";

export const alt = "Markdown Lens local Markdown editor and document converter";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  const brandIcon = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/icon-192.png")).toString("base64")}`;

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
            <img
              src={brandIcon}
              alt=""
              width={64}
              height={64}
              style={{ borderRadius: 14 }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>{siteConfig.name}</div>
              <div style={{ color: "#526173", fontSize: 22 }}>
                Local Markdown editor and document converter
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
            Edit Markdown locally. Convert documents privately.
          </div>
          <div
            style={{
              color: "#526173",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 980,
            }}
          >
            GitHub-style Markdown, local PDF and Word conversion, Mermaid, math,
            code highlighting, and a private browser workspace.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Markdown editor", "PDF to Markdown", "Word to Markdown"].map((label) => (
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
