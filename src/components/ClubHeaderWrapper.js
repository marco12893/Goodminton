"use client";

import { usePathname } from "next/navigation";
import ClubHeader from "./ClubHeader";

export default function ClubHeaderWrapper({ club, searchablePlayers = [] }) {
  const pathname = usePathname();
  
  // Determine back destination based on current path
  let backTo = "/";
  
  if (pathname.includes("/players/") && pathname.includes("/match-log")) {
    // Extract clubPlayerId from the path for player match log
    const pathParts = pathname.split('/');
    const clubPlayerIdIndex = pathParts.indexOf('players') + 1;
    const clubPlayerId = pathParts[clubPlayerIdIndex];
    backTo = `/clubs/${club.slug}/players/${clubPlayerId}`;
  } else if (pathname.includes("/players/")) {
    backTo = `/clubs/${club.slug}`;
  } else if (pathname.includes("/tournaments/") && pathname.includes("/edit")) {
    // Extract tournamentId from the path for tournament edit
    const pathParts = pathname.split('/');
    const tournamentIdIndex = pathParts.indexOf('tournaments') + 1;
    const tournamentId = pathParts[tournamentIdIndex];
    backTo = `/clubs/${club.slug}/tournaments/${tournamentId}`;
  } else if (pathname.includes("/tournaments/new")) {
    backTo = `/clubs/${club.slug}/tournaments`;
  } else if (pathname.includes("/tournaments/")) {
    backTo = `/clubs/${club.slug}/tournaments`;
  } else if (pathname.includes("/compare/")) {
    backTo = `/clubs/${club.slug}/compare`;
  } else if (pathname.includes("/settings/edit")) {
    backTo = `/clubs/${club.slug}/settings`;
  } else if (pathname.includes("/match-log/new")) {
    backTo = `/clubs/${club.slug}/match-log`;
  } else {
    // Default club page goes to home
    backTo = "/";
  }

  return <ClubHeader club={club} searchablePlayers={searchablePlayers} backTo={backTo} />;
}
