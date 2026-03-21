import PendingButton from "@/components/PendingButton";

export default function TournamentSetupForm({
  action,
  clubSlug,
  tournamentId,
  players,
  submitLabel,
  error,
  defaults = {},
  description,
}) {
  const selectedIds = new Set(defaults.playerIds ?? []);

  return (
    <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.94),rgba(4,11,20,0.98))] px-5 py-6 shadow-[0_26px_70px_rgba(3,12,22,0.35)] backdrop-blur-xl">
      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <form action={action} className="mt-5 space-y-5">
        <input type="hidden" name="club_slug" value={clubSlug} />
        {tournamentId ? <input type="hidden" name="tournament_id" value={tournamentId} /> : null}

        <label className="block">
          <span className="mb-2 block text-sm text-white/70">Tournament name</span>
          <input
            name="name"
            type="text"
            defaultValue={defaults.name ?? ""}
            placeholder="Goodminton Open 2026"
            className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-white/70">Date and time</span>
          <input
            name="scheduled_at"
            type="datetime-local"
            defaultValue={defaults.scheduledAt ?? ""}
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
                defaultChecked={(defaults.format ?? "knockout") === "knockout"}
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
                defaultChecked={(defaults.format ?? "knockout") === "round_robin"}
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
                defaultChecked={(defaults.category ?? "singles") === "singles"}
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
                defaultChecked={(defaults.category ?? "singles") === "doubles"}
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
                defaultChecked={(defaults.seeding ?? "random") === "random"}
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
                defaultChecked={(defaults.seeding ?? "random") === "elo_based"}
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
          {description ? <p className="text-sm leading-6 text-white/55">{description}</p> : null}
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
                    defaultChecked={selectedIds.has(player.id)}
                    className="h-5 w-5 accent-[#14d4c6]"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <PendingButton
          className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-4 text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]"
          pendingLabel="Saving..."
        >
          {submitLabel}
        </PendingButton>
      </form>
    </div>
  );
}
