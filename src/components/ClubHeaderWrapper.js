"use client";

import { usePathname } from "next/navigation";
import ClubHeader from "./ClubHeader";

export default function ClubHeaderWrapper({ club, searchablePlayers = [] }) {
  const pathname = usePathname();
  
  // Determine back destination based on current path
  let backTo = "/";
  
  if (pathname.includes("/players/")) {
    backTo = `/clubs/${club.slug}`;
  } else if (pathname.includes("/tournaments/")) {
    backTo = `/clubs/${club.slug}/tournaments`;
  } else if (pathname.includes("/compare/")) {
    backTo = `/clubs/${club.slug}/compare`;
  } else {
    // Default club page goes to home
    backTo = "/";
  }

  return <ClubHeader club={club} searchablePlayers={searchablePlayers} backTo={backTo} />;
}
