export const MT_HOME_COOKIE = "mt_home";

const GROUP_PATH =
  /^\/grupe\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function parseMtHomeGroupId(
  value: string | undefined | null,
): string | null {
  if (!value) return null;
  const m = value.trim().match(GROUP_PATH);
  return m?.[1] ?? null;
}

export function mtHomePath(groupId: string): string {
  return `/grupe/${groupId}`;
}

export function mtHomeCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

/** Pathname `/grupe/{uuid}` or `/grupe/{uuid}/...` → group id */
export function groupIdFromPathname(pathname: string): string | null {
  const m = pathname.match(
    /^\/grupe\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i,
  );
  return m?.[1] ?? null;
}
