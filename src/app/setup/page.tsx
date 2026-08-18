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
  const [showUnlockForm, setShowUnlockForm] = useState(false);
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
      setShowUnlockForm(false);
      setPasscodeInput("");
      setPasscodeError(null);
    } else {
      setPasscodeError("Incorrect passcode");
    }
  }

  function handleLock() {
    window.localStorage.removeItem(UNLOCK_KEY);
    setUnlocked(false);
  }

  function cancelUnlock() {
    setShowUnlockForm(false);
    setPasscodeInput("");
    setPasscodeError(null);
  }

  if (loading) return <div className="p-4 text-center text-neutral-500">Loading…</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  return (
    <div className="flex flex-col gap-3 p-3 md:p-6">
      <div className="flex flex-col gap-2 px-1">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Setup</h1>
          {unlocked ? (
            <button onClick={handleLock} className="text-xs text-neutral-400 underline">
              🔓 Lock
            </button>
          ) : (
            !showUnlockForm && (
              <button
                onClick={() => setShowUnlockForm(true)}
                className="text-xs text-neutral-400 underline"
              >
                🔒 Unlock
              </button>
            )
          )}
        </div>

        {!unlocked && showUnlockForm && (
          <form onSubmit={handleUnlock} className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Admin PIN"
              className="w-28 rounded-lg border border-neutral-300 p-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Unlock
            </button>
            <button
              type="button"
              onClick={cancelUnlock}
              className="text-xs text-neutral-400 underline"
            >
              Cancel
            </button>
            {passcodeError && <p className="w-full text-xs text-red-600">{passcodeError}</p>}
          </form>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1 md:max-w-md">
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

      {tab === "Courses" && <CoursesTab locked={!unlocked} />}
      {tab === "Groups" && <GroupsTab locked={!unlocked} />}
      {tab === "Players" && <PlayersTab locked={!unlocked} />}
      {tab === "Scoring" && <ConfigTab locked={!unlocked} />}
    </div>
  );
}
