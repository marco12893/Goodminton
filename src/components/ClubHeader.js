"use client";

import { useState } from "react";
import Link from "next/link";
import SearchModal from "./SearchModal";

export default function ClubHeader({ club, searchablePlayers = [], backTo = "/" }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="pt-2">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={backTo}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/8 p-3 text-white/92 backdrop-blur-xl transition-all hover:bg-white/12 hover:scale-105"
            aria-label="Back to previous page"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          
          <div className="min-w-0 flex-1 text-center">
            <p className="break-words font-mono text-3xl font-semibold leading-tight text-white">
              {club.name}
            </p>
            <p className="mt-2 text-sm leading-5 text-white/65">{club.city || "Venue not set yet"}</p>
          </div>
          
          <button
            onClick={() => setIsSearchOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/8 p-3 text-white/92 backdrop-blur-xl transition-all hover:bg-white/12 hover:scale-105"
            aria-label="Search players"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      <SearchModal 
        key={isSearchOpen ? "search-open" : "search-closed"}
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)}
        players={searchablePlayers}
        clubSlug={club.slug}
      />
    </>
  );
}
