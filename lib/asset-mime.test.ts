import { describe, expect, test } from "vitest";
import { isSafeImageAssetMimeType, safeImageMimeTypeFromName } from "@/lib/asset-mime";
import { clipboardImageFiles } from "@/lib/clipboard-images";

describe("asset MIME allowlist", () => {
  test.each(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp", "Image/PNG"])(
    "accepts raster type %s",
    (type) => expect(isSafeImageAssetMimeType(type)).toBe(true),
  );

  test.each(["image/svg+xml", "text/html", "application/xhtml+xml", "text/xml", "", undefined, null])(
    "rejects scriptable or unknown type %s",
    (type) => expect(isSafeImageAssetMimeType(type)).toBe(false),
  );

  test("maps raster extensions only", () => {
    expect(safeImageMimeTypeFromName("ppt/media/image1.PNG")).toBe("image/png");
    expect(safeImageMimeTypeFromName("photo.jpg")).toBe("image/jpeg");
    expect(safeImageMimeTypeFromName("ppt/media/logo.svg")).toBeNull();
    expect(safeImageMimeTypeFromName("ppt/media/clip.html")).toBeNull();
  });

  test("ignores pasted SVG images", () => {
    const svg = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    const png = new File(["png"], "x.png", { type: "image/png" });
    const data = { files: [svg, png], items: [] } as unknown as DataTransfer;
    expect(clipboardImageFiles(data)).toEqual([png]);
  });
});
