"use client";

import { useMemo, useState } from "react";

const singlesSlots = [
  { key: "player1", label: "Player 1" },
  { key: "player2", label: "Player 2" },
];

const doublesSlots = [
  { key: "player1", label: "Player 1", team: "Team 1" },
  { key: "player2", label: "Player 2", team: "Team 1" },
  { key: "player3", label: "Player 3", team: "Team 2" },
  { key: "player4", label: "Player 4", team: "Team 2" },
];

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getOptionLabel(name) {
  if (!name) {
    return "Select player";
  }

  if (name.length <= 18) {
    return name;
  }

  const parts = name.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return `${name.slice(0, 15)}...`;
  }

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase();

  if (firstName.length <= 13 && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  return `${name.slice(0, 15)}...`;
}

function UsersIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-black" : "text-black/70"}`} fill="none">
      <path
        d="M16 20v-1.2a3.8 3.8 0 0 0-3.8-3.8H7.8A3.8 3.8 0 0 0 4 18.8V20M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 20v-1.2a3.2 3.2 0 0 0-2.3-3.1M14.5 5.2a3 3 0 0 1 0 5.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SingleIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-black" : "text-black/70"}`} fill="none">
      <path
        d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModeButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-lg font-medium transition ${
        active
          ? "bg-gradient-to-r from-[#15d6c9] to-[#19c0df] text-black shadow-[0_12px_30px_rgba(20,212,198,0.28)]"
          : "bg-white/85 text-black/80"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PlayerAvatar({ playerName, avatarUrl }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/45 bg-gradient-to-br from-[#13d8c7] to-[#17b7e7] shadow-[0_16px_38px_rgba(7,22,38,0.32)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={playerName} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-4xl font-semibold text-white">
            {playerName ? getInitials(playerName) : "?"}
          </span>
        )}
      </div>
      <p className="min-h-[3.8rem] max-w-[9rem] text-balance text-center text-[1rem] font-semibold leading-6 text-white">
        {playerName || "Select player"}
      </p>
    </div>
  );
}

function PlayerSelect({ label, value, options, onChange }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium uppercase tracking-[0.16em] text-white/62">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[1.15rem] border border-white/12 bg-white/92 px-4 py-3 pr-11 text-base font-semibold text-[#121722] outline-none transition focus:border-[#19d1cc] focus:ring-2 focus:ring-[#19d1cc]/35"
        >
          <option value="">Select player</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {getOptionLabel(option.name)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#121722]/75">
          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
            <path d="M5.5 7.5 10 12l4.5-4.5H5.5Z" />
          </svg>
        </span>
      </div>
    </label>
  );
}

export default function ClubCompareBuilder({ players }) {
  const [mode, setMode] = useState("singles");
  const [selected, setSelected] = useState({
    player1: "",
    player2: "",
    player3: "",
    player4: "",
  });

  const activeSlots = mode === "singles" ? singlesSlots : doublesSlots;

  const playerMap = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const selectedIds = useMemo(
    () => Object.values(selected).filter(Boolean),
    [selected],
  );

  const isComplete = activeSlots.every((slot) => selected[slot.key]);

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setSelected({
      player1: "",
      player2: "",
      player3: "",
      player4: "",
    });
  }

  function handleSelectChange(slotKey, playerId) {
    setSelected((current) => {
      const next = { ...current, [slotKey]: playerId };

      Object.keys(next).forEach((key) => {
        if (key !== slotKey && playerId && next[key] === playerId) {
          next[key] = "";
        }
      });

      return next;
    });
  }

  function getOptionsFor(slotKey) {
    return players.filter((player) => {
      if (selected[slotKey] === player.id) {
        return true;
      }

      return !selectedIds.includes(player.id);
    });
  }

  function renderSingles() {
    return (
      <>
        <div className="grid grid-cols-2 gap-6 pt-6">
          {singlesSlots.map((slot) => {
            const currentPlayer = playerMap.get(selected[slot.key]);

            return (
              <div key={slot.key} className="space-y-5">
                <PlayerAvatar
                  playerName={currentPlayer?.name ?? ""}
                  avatarUrl={currentPlayer?.avatarUrl ?? ""}
                />
                <PlayerSelect
                  label={slot.label}
                  value={selected[slot.key]}
                  options={getOptionsFor(slot.key)}
                  onChange={(playerId) => handleSelectChange(slot.key, playerId)}
                />
              </div>
            );
          })}
        </div>

        <div className="pb-2 pt-0 text-center text-[3.4rem] font-semibold leading-none tracking-wide text-white">
          VS
        </div>
      </>
    );
  }

  function renderDoubles() {
    const team1 = doublesSlots.filter((slot) => slot.team === "Team 1");
    const team2 = doublesSlots.filter((slot) => slot.team === "Team 2");

    return (
      <div className="space-y-7 pt-4">
        <section className="space-y-5">
          <p className="text-center text-[2rem] font-semibold text-white">Team 1</p>
          <div className="grid grid-cols-2 gap-6">
            {team1.map((slot) => {
              const currentPlayer = playerMap.get(selected[slot.key]);

              return (
                <div key={slot.key} className="space-y-5">
                  <PlayerAvatar
                    playerName={currentPlayer?.name ?? ""}
                    avatarUrl={currentPlayer?.avatarUrl ?? ""}
                  />
                  <PlayerSelect
                    label={slot.label}
                    value={selected[slot.key]}
                    options={getOptionsFor(slot.key)}
                    onChange={(playerId) => handleSelectChange(slot.key, playerId)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <div className="py-0 text-center text-[4.5rem] font-semibold leading-none tracking-wide text-white">
          VS
        </div>

        <section className="space-y-5">
          <p className="text-center text-[2rem] font-semibold text-white">Team 2</p>
          <div className="grid grid-cols-2 gap-6">
            {team2.map((slot) => {
              const currentPlayer = playerMap.get(selected[slot.key]);

              return (
                <div key={slot.key} className="space-y-5">
                  <PlayerAvatar
                    playerName={currentPlayer?.name ?? ""}
                    avatarUrl={currentPlayer?.avatarUrl ?? ""}
                  />
                  <PlayerSelect
                    label={slot.label}
                    value={selected[slot.key]}
                    options={getOptionsFor(slot.key)}
                    onChange={(playerId) => handleSelectChange(slot.key, playerId)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(66,74,98,0.58),rgba(47,57,78,0.55))] px-4 py-4 shadow-[0_22px_50px_rgba(3,12,22,0.26)] backdrop-blur-xl">
        <div className="flex gap-3">
          <ModeButton
            active={mode === "singles"}
            icon={<SingleIcon active={mode === "singles"} />}
            label="Singles"
            onClick={() => handleModeChange("singles")}
          />
          <ModeButton
            active={mode === "doubles"}
            icon={<UsersIcon active={mode === "doubles"} />}
            label="Doubles"
            onClick={() => handleModeChange("doubles")}
          />
        </div>
      </div>

      <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.94),rgba(4,11,20,0.98))] px-5 pb-6 pt-6 shadow-[0_26px_70px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        {players.length === 0 ? (
          <div className="rounded-[1.7rem] border border-dashed border-white/15 bg-white/5 px-5 py-10 text-center text-white/70">
            No active players are available for comparison yet.
          </div>
        ) : mode === "singles" ? (
          renderSingles()
        ) : (
          renderDoubles()
        )}

        <button
          type="button"
          disabled={!isComplete || players.length === 0}
          className={`mt-6 w-full rounded-[1.6rem] px-5 py-4 text-xl font-semibold transition ${
            isComplete && players.length > 0
              ? "bg-gradient-to-r from-[#15d6c9] to-[#19c0df] text-white shadow-[0_18px_40px_rgba(20,212,198,0.24)]"
              : "cursor-not-allowed bg-white/10 text-white/45"
          }`}
        >
          Compare Stats
        </button>
      </div>
    </section>
  );
}
