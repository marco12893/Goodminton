"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ClubPlayerSearch({ defaultValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();

    if (trimmed) {
      nextParams.set("player", trimmed);
    } else {
      nextParams.delete("player");
    }

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;

    startTransition(() => {
      router.push(nextUrl);
    });
  }

  function handleClear() {
    setValue("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.92),rgba(5,12,22,0.95))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.28)] backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <svg
              className="h-5 w-5 text-white/40"
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
            name="player"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search player name"
            className="w-full rounded-full border border-white/12 bg-white/8 pl-12 pr-4 py-4 text-base text-white outline-none placeholder:text-white/35 transition-all focus:border-white/20 focus:bg-white/10"
          />
        </div>
      </form>
    </div>
  );
}
