"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFullscreenNavStart } from "@/components/FullscreenNavOverlay";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "GM";
}

export default function SearchModal({ isOpen, onClose, players = [], clubSlug }) {
  const [value, setValue] = useState("");
  const router = useRouter();
  const startNav = useFullscreenNavStart();

  function handleClear() {
    setValue("");
  }

  const trimmed = value.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmed) return [];

    return players
      .filter((player) => player.fullName.toLowerCase().includes(trimmed))
      .slice(0, 12);
  }, [players, trimmed]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 px-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.96),rgba(5,12,22,0.98))] shadow-[0_20px_50px_rgba(3,12,22,0.28)] backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full p-2 text-white/75 transition-all hover:bg-white/10 hover:text-white"
              aria-label="Close search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  className="h-5 w-5 text-white/35"
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
              </div>
              <input
                type="search"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Search players"
                className="w-full rounded-full border border-white/12 bg-white/8 py-3 pl-12 pr-11 text-base text-white outline-none placeholder:text-white/35"
                autoFocus
              />
              {value ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/45 transition hover:text-white/75"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-3 py-3">
            {!trimmed ? (
              <div className="px-3 py-6 text-sm leading-6 text-white/55">
                Start typing a player name to see matching results instantly.
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-6 text-sm leading-6 text-white/55">
                No players matched &quot;{value.trim()}&quot;.
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((player) => {
                  const href = `/clubs/${clubSlug}/players/${player.id}`;
                  return (
                  <Link
                    key={player.id}
                    href={href}
                    onClick={(event) => {
                      event.preventDefault();
                      startNav();
                      onClose();
                      router.push(href);
                    }}
                    className="flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-white transition hover:bg-white/8"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#153248] bg-cover bg-center text-sm font-semibold text-white"
                      style={player.avatarUrl ? { backgroundImage: `url(${player.avatarUrl})` } : undefined}
                    >
                      {!player.avatarUrl ? getInitials(player.fullName) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-white">{player.fullName}</p>
                      <p className="mt-0.5 truncate text-sm text-white/55">
                        Elo {player.elo} · {player.totalMatches} matches
                      </p>
                    </div>
                  </Link>
                );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
