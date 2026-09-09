import { describe, it, expect } from "vitest";
import { linkifySegments } from "@/lib/domain/linkify";

describe("linkifySegments", () => {
  it("vraca prazan niz za prazan tekst", () => {
    expect(linkifySegments("")).toEqual([]);
  });

  it("jedan tekstualni segment bez URL-a", () => {
    expect(linkifySegments("ponesi dres")).toEqual([
      { type: "text", value: "ponesi dres" },
    ]);
  });

  it("sam URL", () => {
    expect(linkifySegments("https://youtu.be/abc123")).toEqual([
      {
        type: "link",
        href: "https://youtu.be/abc123",
        value: "https://youtu.be/abc123",
      },
    ]);
  });

  it("tekst s URL-om u sredini", () => {
    expect(
      linkifySegments("Snimka: https://youtu.be/abc123 kraj"),
    ).toEqual([
      { type: "text", value: "Snimka: " },
      {
        type: "link",
        href: "https://youtu.be/abc123",
        value: "https://youtu.be/abc123",
      },
      { type: "text", value: " kraj" },
    ]);
  });

  it("vise URL-ova", () => {
    expect(
      linkifySegments("a http://example.com b https://youtu.be/x"),
    ).toEqual([
      { type: "text", value: "a " },
      {
        type: "link",
        href: "http://example.com",
        value: "http://example.com",
      },
      { type: "text", value: " b " },
      {
        type: "link",
        href: "https://youtu.be/x",
        value: "https://youtu.be/x",
      },
    ]);
  });

  it("skida zavrsnu interpunkciju s URL-a", () => {
    expect(linkifySegments("vidi https://youtu.be/abc.")).toEqual([
      { type: "text", value: "vidi " },
      {
        type: "link",
        href: "https://youtu.be/abc",
        value: "https://youtu.be/abc",
      },
      { type: "text", value: "." },
    ]);
  });

  it("ne tretira javascript: kao link", () => {
    expect(linkifySegments("javascript:alert(1)")).toEqual([
      { type: "text", value: "javascript:alert(1)" },
    ]);
  });
});
