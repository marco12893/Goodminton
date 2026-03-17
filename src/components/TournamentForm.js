import FormSubmitButton from "@/components/FormSubmitButton";

export default function TournamentForm({
  action,
  clubSlug,
  submitLabel,
  tournament,
  players,
}) {
  const selectedPlayerIds = new Set(tournament?.selectedPlayerIds ?? []);

  return (
    <form action={action} className="mt-5 space-y-5">
      <input type="hidden" name="club_slug" value={clubSlug} />
      {tournament?.id ? <input type="hidden" name="tournament_id" value={tournament.id} /> : null}

      <label className="block">
        <span className="mb-2 block text-sm text-white/70">Tournament name</span>
        <input
          name="name"
          type="text"
          defaultValue={tournament?.name ?? ""}
          placeholder="Goodminton Open 2026"
          className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-white/70">Date and time</span>
        <input
          name="scheduled_at"
          type="datetime-local"
          defaultValue={tournament?.scheduledAt ?? ""}
          className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
        />
      </label>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white/70">Format</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="format"
              value="knockout"
              defaultChecked={(tournament?.format ?? "knockout") === "knockout"}
              className="peer sr-only"
            />
            <span className="block rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-center text-lg font-semibold text-white transition peer-checked:border-[#20e0cf]/70 peer-checked:bg-gradient-to-r peer-checked:from-[#12d8c9] peer-checked:to-[#18c3e5] peer-checked:text-[#062232] peer-checked:shadow-[0_12px_28px_rgba(18,216,201,0.28)]">
              Knockout
            </span>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              name="format"
              value="round_robin"
              defaultChecked={tournament?.format === "round_robin"}
              className="peer sr-only"
            />
            <span className="block rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-center text-lg font-semibold text-white transition peer-checked:border-[#20e0cf]/70 peer-checked:bg-gradient-to-r peer-checked:from-[#12d8c9] peer-checked:to-[#18c3e5] peer-checked:text-[#062232] peer-checked:shadow-[0_12px_28px_rgba(18,216,201,0.28)]">
              Round Robin
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white/70">Category</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="category"
              value="singles"
              defaultChecked={(tournament?.category ?? "singles") === "singles"}
              className="peer sr-only"
            />
            <span className="block rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-center text-lg font-semibold text-white transition peer-checked:border-[#20e0cf]/70 peer-checked:bg-gradient-to-r peer-checked:from-[#12d8c9] peer-checked:to-[#18c3e5] peer-checked:text-[#062232] peer-checked:shadow-[0_12px_28px_rgba(18,216,201,0.28)]">
              Singles
            </span>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              name="category"
              value="doubles"
              defaultChecked={tournament?.category === "doubles"}
              className="peer sr-only"
            />
            <span className="block rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-center text-lg font-semibold text-white transition peer-checked:border-[#20e0cf]/70 peer-checked:bg-gradient-to-r peer-checked:from-[#12d8c9] peer-checked:to-[#18c3e5] peer-checked:text-[#062232] peer-checked:shadow-[0_12px_28px_rgba(18,216,201,0.28)]">
              Doubles
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white/70">Seeding</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="seeding"
              value="random"
              defaultChecked={(tournament?.seeding ?? "random") === "random"}
              className="peer sr-only"
            />
            <span className="block rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-center text-lg font-semibold text-white transition peer-checked:border-[#20e0cf]/70 peer-checked:bg-gradient-to-r peer-checked:from-[#12d8c9] peer-checked:to-[#18c3e5] peer-checked:text-[#062232] peer-checked:shadow-[0_12px_28px_rgba(18,216,201,0.28)]">
              Random
            </span>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              name="seeding"
              value="elo_based"
              defaultChecked={tournament?.seeding === "elo_based"}
              className="peer sr-only"
            />
            <span className="block rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-center text-lg font-semibold text-white transition peer-checked:border-[#20e0cf]/70 peer-checked:bg-gradient-to-r peer-checked:from-[#12d8c9] peer-checked:to-[#18c3e5] peer-checked:text-[#062232] peer-checked:shadow-[0_12px_28px_rgba(18,216,201,0.28)]">
              Elo Based
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white/70">Participants</p>
        {(players ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-center text-white/65">
            No active players are available in this club yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {players.map((player) => (
              <label
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/6 px-4 py-4 text-white"
              >
                <div>
                  <p className="font-semibold">{player.player?.full_name ?? "Unknown player"}</p>
                  <p className="mt-1 text-sm text-white/60">Elo {player.elo_current ?? 1000}</p>
                </div>
                <input
                  type="checkbox"
                  name="player_ids"
                  value={player.id}
                  defaultChecked={selectedPlayerIds.has(player.id)}
                  className="h-5 w-5 accent-[#14d4c6]"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <FormSubmitButton
        idleLabel={submitLabel}
        pendingLabel={tournament?.id ? "Saving changes..." : "Creating tournament..."}
        className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-4 text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </form>
  );
}
