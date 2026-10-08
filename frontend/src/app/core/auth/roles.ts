export const ROLE_LABELS: Record<string, string> = {
  PLAYER: 'IGRAČ',
  ORGANIZER: 'ORGANIZATOR',
  REFEREE: 'SUDIJA',
  ADMIN: 'ADMIN',
};

const ROLE_ORDER = ['PLAYER', 'ORGANIZER', 'REFEREE', 'ADMIN'];

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function sortRoles(roles: readonly string[]): string[] {
  const rank = (role: string) => {
    const index = ROLE_ORDER.indexOf(role);
    return index === -1 ? ROLE_ORDER.length : index;
  };
  return [...roles].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
