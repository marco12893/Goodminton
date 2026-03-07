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
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.92),rgba(5,12,22,0.95))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.28)] backdrop-blur-xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          name="player"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search player name"
          className="flex-1 rounded-full border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-sm font-semibold text-[#062232] disabled:opacity-70"
        >
          Search
        </button>
      </div>
      {defaultValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="mt-3 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85"
        >
          Clear search
        </button>
      ) : null}
    </form>
  );
}
