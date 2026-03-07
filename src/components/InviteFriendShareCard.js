"use client";

import { useMemo, useState } from "react";

export default function InviteFriendShareCard() {
  const [message, setMessage] = useState("");

  const shareData = useMemo(() => {
    const url = typeof window !== "undefined" ? window.location.origin : "";

    return {
      title: "Join me on GoodMinton",
      text: "Track badminton stats, Elo, matches, and clubs together on GoodMinton.",
      url,
    };
  }, []);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage("Invite sheet opened.");
        return;
      }

      await navigator.clipboard.writeText(
        `${shareData.text}${shareData.url ? ` ${shareData.url}` : ""}`.trim(),
      );
      setMessage("Invite link copied to clipboard.");
    } catch {
      setMessage("Unable to share right now.");
    }
  }

  return (
    <div className="mt-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-6">
      <p className="font-mono text-3xl font-semibold text-white">Invite a Friend</p>
      <p className="mt-4 text-sm leading-6 text-white/65">
        Share GoodMinton with a friend using your phone&apos;s native share menu. If sharing is not
        available, we will copy the invite link instead.
      </p>

      <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/78">
        GoodMinton helps clubs track leaderboards, match logs, Elo changes, tournaments, and player
        stats in one place.
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="mt-6 w-full rounded-[1.2rem] bg-gradient-to-r from-[#4ad6b7] to-[#3cc7d8] px-5 py-4 text-lg font-semibold text-[#062232] shadow-[0_16px_34px_rgba(18,216,201,0.28)]"
      >
        Share Invite
      </button>

      {message ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/82">
          {message}
        </div>
      ) : null}
    </div>
  );
}
