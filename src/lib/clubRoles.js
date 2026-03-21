export const CLUB_ROLE_OWNER = "owner";
export const CLUB_ROLE_ADMIN = "admin";
export const CLUB_ROLE_PLAYER = "player";
export const CLUB_ROLE_SPECTATOR = "spectator";

export function isClubOwner(role) {
  return role === CLUB_ROLE_OWNER;
}

export function isClubManager(role) {
  return role === CLUB_ROLE_OWNER || role === CLUB_ROLE_ADMIN;
}

export function getClubRoleLabel(role) {
  if (role === CLUB_ROLE_OWNER) return "Club owner";
  if (role === CLUB_ROLE_ADMIN) return "Club admin";
  if (role === CLUB_ROLE_SPECTATOR) return "Spectator";
  return "Member";
}
