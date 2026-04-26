export function firstNameFromDisplayName(
  displayName: string | undefined | null,
): string | undefined {
  const trimmed = displayName?.trim();
  if (!trimmed) return undefined;
  const [first] = trimmed.split(/\s+/, 1);
  return first || undefined;
}
