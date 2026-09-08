export type MemberOption = {
  userId: string;
  nickname: string;
};

/**
 * Active group members who are not currently on the confirmed list or
 * waitlist. Cancelled signups are intentionally absent from
 * `activeSignupUserIds`, so those people show up again here.
 */
export function membersNotSignedUp(
  members: MemberOption[],
  activeSignupUserIds: string[],
): MemberOption[] {
  const signed = new Set(activeSignupUserIds);
  return members
    .filter((m) => !signed.has(m.userId))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "hr"));
}
