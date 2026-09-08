export const MIN_LENGTH = 2;
export const MAX_LENGTH = 12;

/**
 * Canonical nickname form.
 *
 * Everything collapses to uppercase and a single space between words, because
 * a nickname is a person label — "Marko", "MARKO" and "marko " are the same
 * person. Without this, uniqueness checks would let two "same" nicknames
 * through that differ only by case, and on the live screen they would look
 * identical.
 *
 * Croatian characters are kept. Č and C stay DIFFERENT — those are different
 * nicknames, not the same one written differently.
 */
export function normalizeNickname(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLocaleUpperCase("hr-HR");
}

export function nicknamesEqual(a: string, b: string): boolean {
  return normalizeNickname(a) === normalizeNickname(b);
}

export type NicknameCheckResult = { ok: true; nickname: string } | { error: string };

/** Checks nickname shape. Uniqueness is checked separately against the DB. */
export function validateNickname(input: string): NicknameCheckResult {
  const nickname = normalizeNickname(input);

  if (nickname.length < MIN_LENGTH) {
    return { error: `Nadimak mora imati barem ${MIN_LENGTH} znaka.` };
  }
  if (nickname.length > MAX_LENGTH) {
    return { error: `Nadimak smije imati najviše ${MAX_LENGTH} znakova.` };
  }

  return { ok: true, nickname };
}

// ---------- Disambiguating identical nicknames ----------

export type PlayerForLabel = {
  userId: string;
  nickname: string;
  fullName?: string | null;
  email?: string | null;
};

/** Surname from full name; if the name is one word, use the whole name. */
function surname(fullName: string | null | undefined): string | null {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}

/** Local part of the email (before @). */
function fromEmail(email: string | null | undefined): string | null {
  const local = (email ?? "").split("@")[0]?.trim();
  return local ? local : null;
}

/**
 * Returns a display label for each player.
 *
 * If the nickname is unique in this set — the label is the nickname alone.
 * If two or more share a nickname, everyone in that group gets a
 * disambiguating suffix: surname, then email local part, then a number —
 * whichever actually separates them.
 *
 * Exists because on the live screen two identical buttons mean the person on
 * the sideline has to guess who to tap. Data is correct without this; the
 * problem is human.
 */
export function disambiguateNicknames(players: PlayerForLabel[]): Map<string, string> {
  const labels = new Map<string, string>();

  const byNickname = new Map<string, PlayerForLabel[]>();
  for (const player of players) {
    const key = normalizeNickname(player.nickname);
    if (!byNickname.has(key)) byNickname.set(key, []);
    byNickname.get(key)!.push(player);
  }

  for (const [, group] of byNickname) {
    if (group.length === 1) {
      labels.set(group[0].userId, group[0].nickname);
      continue;
    }

    // Take the first source that truly separates everyone in the group.
    const candidates: (string | null)[][] = [
      group.map((p) => surname(p.fullName)),
      group.map((p) => fromEmail(p.email)),
    ];

    const suffixes =
      candidates.find(
        (row) => row.every(Boolean) && new Set(row).size === group.length,
      ) ?? group.map((_, index) => String(index + 1));

    group.forEach((p, index) => {
      labels.set(p.userId, `${p.nickname} (${suffixes[index]})`);
    });
  }

  return labels;
}
