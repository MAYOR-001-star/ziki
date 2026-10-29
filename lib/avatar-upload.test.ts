import { describe, expect, it } from "vitest";
import {
  detectAvatarType,
  validateAvatarBytes,
  toAvatarDataUrl,
  MAX_AVATAR_BYTES,
} from "./avatar-upload";
import { safeAvatarUrl } from "./avatar";

describe("detectAvatarType", () => {
  it("detects PNG magic bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(detectAvatarType(png)).toBe("image/png");
  });

  it("detects JPEG magic bytes", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    expect(detectAvatarType(jpeg)).toBe("image/jpeg");
  });

  it("detects GIF magic bytes", () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectAvatarType(gif)).toBe("image/gif");
  });

  it("detects WebP magic bytes", () => {
    // RIFF .... WEBP
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectAvatarType(webp)).toBe("image/webp");
  });

  it("rejects unknown or scriptable formats", () => {
    // SVG text "<svg"
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(detectAvatarType(svg)).toBeNull();

    // HTML text "<html"
    const html = new TextEncoder().encode("<html><body></body></html>");
    expect(detectAvatarType(html)).toBeNull();

    // Empty or random bytes
    expect(detectAvatarType(new Uint8Array(0))).toBeNull();
    expect(detectAvatarType(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});

describe("validateAvatarBytes", () => {
  it("rejects empty bytes", () => {
    const res = validateAvatarBytes(new Uint8Array(0));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Please select an image file.");
    }
  });

  it("rejects files exceeding maximum avatar size", () => {
    const large = new Uint8Array(MAX_AVATAR_BYTES + 1);
    const res = validateAvatarBytes(large);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Image must be 2 MB or smaller.");
    }
  });

  it("validates safe PNG file", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    const res = validateAvatarBytes(png);
    expect(res).toEqual({ ok: true, contentType: "image/png" });
  });

  it("rejects unsupported MIME type", () => {
    const invalid = new TextEncoder().encode("not an image");
    const res = validateAvatarBytes(invalid);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Please choose a PNG, JPEG, WebP, or GIF image.");
    }
  });
});

describe("toAvatarDataUrl and safeAvatarUrl integration", () => {
  it("formats and accepts valid data URLs", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const dataUrl = toAvatarDataUrl(pngBytes, "image/png");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(safeAvatarUrl(dataUrl)).toBe(dataUrl);
  });

  it("safeAvatarUrl accepts jpeg, webp, and gif data URLs", () => {
    const sample = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(safeAvatarUrl(sample)).toBe(sample);

    const webpSample = "data:image/webp;base64,UklGRg==";
    expect(safeAvatarUrl(webpSample)).toBe(webpSample);

    const gifSample = "data:image/gif;base64,R0lGODlh";
    expect(safeAvatarUrl(gifSample)).toBe(gifSample);
  });

  it("safeAvatarUrl rejects svg, html, and corrupt data URLs", () => {
    expect(safeAvatarUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(safeAvatarUrl("data:text/html;base64,PGh0bWw+")).toBeNull();
    expect(safeAvatarUrl("data:image/png;not-base64-content!")).toBeNull();
  });
});

