"use client";

import { useAppData } from "@/lib/store/AppDataContext";
import { useEffect, useState } from "react";
import { CoursesTab } from "./CoursesTab";
import { GroupsTab } from "./GroupsTab";
import { PlayersTab } from "./PlayersTab";
import { ConfigTab } from "./ConfigTab";

const UNLOCK_KEY = "mulliganCup.adminUnlocked";
const TABS = ["Courses", "Groups", "Players", "Scoring"] as const;
type Tab = (typeof TABS)[number];

export default function SetupPage() {
  const { loading, error, gameConfig } = useAppData();
  const [unlocked, setUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Courses");

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(UNLOCK_KEY) === "1") {
      setUnlocked(true);
    }
  }, []);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!gameConfig) return;
    if (passcodeInput === gameConfig.admin_passcode) {
      window.localStorage.setItem(UNLOCK_KEY, "1");
      setUnlocked(true);
      setPasscodeError(null);
    } else {
      setPasscodeError("Incorrect passcode");
    }
  }

  if (loading) return <div className="p-4 text-center text-neutral-500">Loading…</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  if (!unlocked) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-lg font-bold">Admin Setup</h1>
        <p className="text-sm text-neutral-500">
          This area is for course setup, cart assignments, the player roster, and scoring rules.
          Enter the admin passcode to continue.
        </p>
        <form onSubmit={handleUnlock} className="flex flex-col gap-2">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Passcode"
            className="rounded-lg border border-neutral-300 p-2.5 text-base"
          />
          {passcodeError && <p className="text-sm text-red-600">{passcodeError}</p>}
          <button
            type="submit"
            className="rounded-lg bg-green-700 py-3 text-base font-semibold text-white"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-lg font-bold">Admin Setup</h1>
        <button
          onClick={() => {
            window.localStorage.removeItem(UNLOCK_KEY);
            setUnlocked(false);
          }}
          className="text-xs text-neutral-400 underline"
        >
          Lock
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-md py-1.5 text-sm font-medium ${
              t === tab ? "bg-white shadow text-green-700" : "text-neutral-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Courses" && <CoursesTab />}
      {tab === "Groups" && <GroupsTab />}
      {tab === "Players" && <PlayersTab />}
      {tab === "Scoring" && <ConfigTab />}
    </div>
  );
}
