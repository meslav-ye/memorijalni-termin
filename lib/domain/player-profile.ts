/** In-app player profile path used from ljestvica / statistika / članovi. */
export type PlayerProfileFrom = "ljestvica" | "statistika" | "clanovi";

export function playerProfileHref(
  grupaId: string,
  userId: string,
  from: PlayerProfileFrom,
): string {
  return `/grupe/${grupaId}/igrac/${userId}?from=${from}`;
}
