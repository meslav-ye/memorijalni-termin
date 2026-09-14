import { describe, it, expect } from "vitest";
import {
  MT_HOME_COOKIE,
  parseMtHomeGroupId,
  mtHomeCookieOptions,
} from "@/lib/auth/home-cookie";

describe("parseMtHomeGroupId", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("accepts /grupe/{uuid}", () => {
    expect(parseMtHomeGroupId(`/grupe/${id}`)).toBe(id);
  });

  it("rejects non-group paths and garbage", () => {
    expect(parseMtHomeGroupId("/grupe")).toBeNull();
    expect(parseMtHomeGroupId(`/grupe/${id}/termin/x`)).toBeNull();
    expect(parseMtHomeGroupId("/prijava")).toBeNull();
    expect(parseMtHomeGroupId("")).toBeNull();
    expect(parseMtHomeGroupId(undefined)).toBeNull();
  });
});

describe("mtHomeCookieOptions", () => {
  it("is httpOnly Lax path=/ with ~30d maxAge", () => {
    const o = mtHomeCookieOptions();
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe("lax");
    expect(o.path).toBe("/");
    expect(o.maxAge).toBe(60 * 60 * 24 * 30);
  });
});

describe("MT_HOME_COOKIE", () => {
  it("has a stable name", () => {
    expect(MT_HOME_COOKIE).toBe("mt_home");
  });
});
