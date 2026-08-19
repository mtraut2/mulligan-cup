# Implementation plan for Claude Code — Mulligan Cup: Feedback Round 4

Copy everything below into Claude Code in the Mulligan Cup project to make these changes.

## Summary of changes

1. **Restore Money Owed to the Round Summary row** — partially reverses Round 3's Item 3, which
   dropped the Owed column from the summary row on the theory that it duplicated the expanded
   detail panel and Totals page. Add it back as the last column instead.
2. **Lockdown toggle** — reusing the existing `totals_visible` admin toggle, hide other groups'
   live scores on Enter Scores and all round results on Round Summary (in addition to Totals,
   which it already hides) whenever it's off, so nobody can piece together who's winning before
   the planned reveal at the closing dinner. Requires a lightweight per-player PIN, set once by an
   admin, so the app knows which group is "yours" without building real authentication.

Item 2 is substantially larger than anything built so far in this app (it introduces the first
notion of per-device identity) — read through the design before starting, since several parts
(the reveal toggle's scope, the fallback behavior when someone hasn't picked a name yet) affect
both Enter Scores and Round Summary together.

---

## Item 1: Restore the Money Owed column to Round Summary

**Current behavior:** Following Round 3, the Round Summary table
([src/app/round/page.tsx](../src/app/round/page.tsx)) reads:

```
| Place | Player (Playing Hcp) | Gross | Net | Golf Pts | Place Pts | Total |
```

Money Owed for the round is only visible by expanding a player's row (in the Money Owed
breakdown) or on the Totals page.

**Requested change:** Add Money Owed back as a column on the summary row itself, as the last
column:

```
| Place | Player (Playing Hcp) | Gross | Net | Golf Pts | Place Pts | Total | Money Owed |
```

- New `<th>Owed</th>` and `<td>{formatMoney(s.moneyOwed)}</td>` at the end of the row, right-
  aligned like the other numeric columns (matching the styling the Owed column had before Round
  3 removed it).
- Column count goes from 7 back to 8 — update both `colSpan={7}` occurrences (the expanded detail
  row and the empty-state "No scores entered yet" row) to `colSpan={8}`.
- `formatMoney` is already imported in this file (still used inside the expanded Money Owed
  breakdown), so no new import is needed.

### What NOT to change

- Keep everything else from Round 3 as-is: the Gross column, the Player cell's `(Playing Hcp)`
  suffix, and the chevron affordance all stay exactly as they are.
- Don't remove or change the Money Owed breakdown in the expanded detail panel — it stays, now
  simply duplicated by the summary column, same as Gross/Net/points already are.
- Don't touch the Totals page.

### Testing

- Round Summary header reads: Place | Player | Gross | Net | Golf | Place Pts | Total | Owed.
- Each row's Owed value matches `formatMoney(s.moneyOwed)`, the same value shown in that row's
  expanded Money Owed breakdown total.
- Expanding/collapsing a row and the chevron rotation still work correctly with the extra column.
- The empty state ("No scores entered yet") still spans the full width of the table (8 columns).
- Table remains readable at mobile widths with the reintroduced column.

---

## Item 2: Lockdown toggle — hide other groups' live scores and all round results

**Current behavior:** Nothing in the app scopes what a device can see to "your own group" — every
screen is fully open to everyone, by original design (no login). Concretely:

- **Enter Scores** ([src/app/enter/page.tsx](../src/app/enter/page.tsx)): the group filter row
  (lines 339-363) lets anyone select *any* cart/group for *any* round and view/edit that group's
  hole-by-hole scores live, plus an "All Players" mode that lets anyone browse/enter for any
  individual player. There is no concept of "which group is mine."
- **Round Summary** ([src/app/round/page.tsx](../src/app/round/page.tsx)): shows every player's
  row for the selected round in one ranked table — a live, full leaderboard for whichever round
  is currently selected, with no gating at all.
- **Totals** already has a reveal mechanism: the admin-controlled `totals_visible` toggle in
  Setup → Scoring — real numbers when true, a placeholder message when false.

**Requested change (revised from the original draft of this item):** Drop the "final round only"
trigger entirely. Instead, reuse the single existing `totals_visible` toggle to govern all three
screens at once, for the whole trip:

- **Toggle ON (visible):** Enter Scores shows every group as it does today; Round Summary shows
  full results for every player; Totals shows real numbers. This is the same fully-open behavior
  the app has always had — nothing changes here relative to today, and it's the natural default
  state before an admin ever touches the toggle.
- **Toggle OFF (hidden):** Enter Scores is restricted to the current player's own group; Round
  Summary is replaced entirely by a "results are hidden right now" message, for every round, no
  partial view — the same treatment Totals already gets; Totals stays hidden exactly as it does
  today.

This removes the round-number logic (`round_number === max`) from the original draft entirely —
lockdown is purely a function of one boolean, flipped off by the admin at the start of the trip
and back on at the reveal dinner. It also removes the "show your own group's row" partial-view
behavior originally proposed for Round Summary — while hidden, it's a flat placeholder for
everyone, identity or not, which is simpler to build and matches the existing Totals pattern.

**Explicitly chosen scope (confirmed with you):**
- **Data protection level: casual deterrent, not server-side enforcement.** This is UI-level
  hiding only, matching how the admin PIN and reveal toggle already work — nothing changes about
  what data reaches a device (Supabase access stays fully open, all data still loads to every
  client; only rendering decisions change). Someone who opened their phone's browser dev tools/
  network tab could still technically find the raw data underneath. That's an accepted, known
  limitation, not a bug to fix here — real enforcement would mean server-side data scoping, out
  of scope for this item.
- **Identity method: a per-player PIN**, not an open name-pick. Each player is assigned a short
  PIN once (by an admin, in Setup → Players — already gated behind the Setup lock from Round 3),
  entered alongside picking your name the first time a device needs to identify itself. This is a
  real (if lightweight) secret, not self-report — a meaningfully stronger deterrent against
  casually claiming someone else's identity than a plain name list, without the logistics problem
  of a group-scoped PIN (groups are recreated every round in this schema, so a PIN tied to the
  group row would need reissuing before every round; a PIN tied to the player is set once for the
  whole weekend and combines with the existing per-round group-membership lookup to determine
  "which group is mine right now").

**A. Schema: add a PIN to players.**
- Add a `pin` column to the `players` table, typed **`text`, not numeric** (e.g. 4 digits) — new
  migration file alongside the existing `supabase/migrations/` pattern, plus updating
  `supabase/schema.sql` for fresh installs. A numeric column would silently mangle a PIN like
  `0219` into `219` (leading zero stripped), breaking both display in Setup → Players and
  string-equality comparison against what someone types on Enter Scores.
- Default the new column to `null`/blank for all existing rows, not a shared placeholder value —
  every one of the 16 real players currently in the production database will have no PIN the
  moment this migration runs (see rollout note under E, below).
- **A blank/unset PIN must never be able to be "matched."** Comparing a blank stored PIN against
  a blank or empty typed value must fail closed (no identity granted), not succeed as a
  coincidental empty-string match — otherwise a player with no PIN assigned yet is claimable by
  anyone who submits nothing. This is a real security requirement, not an edge case to skip.
- In Setup → Players ([src/app/setup/PlayersTab.tsx](../src/app/setup/PlayersTab.tsx)), add a PIN
  field per player, editable only while Setup is unlocked. **This needs the same treatment as the
  Admin Passcode field got in Round 3, not just `disabled`:** while Setup is locked, don't render
  any player's real PIN value anywhere in the DOM — show a masked placeholder (e.g. "Hidden while
  locked") instead of an input bound to the actual value, exactly like
  [ConfigTab.tsx](../src/app/setup/ConfigTab.tsx)'s Admin Passcode field already does. A merely
  `disabled` input would still leak every player's PIN to anyone who opens Setup without
  unlocking it, which defeats the point of having PINs at all. Once unlocked, show/edit them
  normally, same as every other field on that tab.

**B. Identity prompt: name + PIN, asked lazily, remembered per device.**
- Nothing prompts for identity while the toggle is ON — it's only needed once the toggle is OFF
  and a screen that needs to know "which group is mine" (Enter Scores) is opened without a stored
  identity yet.
- When needed: show a simple "Who's on this device?" step — pick your name from the roster, enter
  your PIN. On a mismatch, show an inline error and stay on the picker (same pattern as the admin
  unlock error). On success, store the player id in `localStorage` (e.g. `mulliganCup.playerId`),
  the same device-remembered pattern already used for `mulliganCup.adminUnlocked` — not asked
  again on that device until cleared.
- Add a small, clearly-visible "Not you? Switch player" control near the Enter Scores header, so a
  phone that gets passed around — or a wrong pick — can be corrected at any time; re-picking asks
  for name + PIN again.
- **Stale identity fallback.** A device's stored `playerId` can outlive the player it points to —
  an admin might delete that player, or change their PIN, after the device already claimed that
  identity. If the stored id no longer resolves to a real player, treat it the same as no identity
  at all and show the picker again, rather than erroring or silently misbehaving. A PIN *change*
  for a still-existing player does not need to retroactively log out devices already identified as
  them — that's expected, not a bug (the whole point of remembering per device is not re-asking).

**C. Enter Scores while hidden.**
- The group filter row shows only the identified player's own group for the currently selected
  round; other groups' pills and "All Players" are not shown.
- **Groups are round-scoped, and "own group" must be re-derived per round, not cached.** In this
  schema, `groups.round_id` and `group_members.group_id` mean a player's group membership is only
  ever meaningful for one specific round — someone can be in a different cart in Round 1 than in
  Round 3. The existing `roundGroups`/`groupMembers` lookup in
  [enter/page.tsx](../src/app/enter/page.tsx) already filters groups by the currently-selected
  round before matching membership, and this restriction reuses that exact lookup rather than
  computing "my group" once and reusing it — so switching the round selector while hidden must
  always re-resolve which group (if any) the identified player belongs to *for that round*.
- **Confirmed scope: a player can browse to any round while hidden and see/edit their own group's
  raw data there** (not just whichever round is "current") — this doesn't leak standings, since
  Enter Scores only ever shows raw score/putts/lost balls/ladies tees, never points or placement;
  reconstructing the leaderboard requires the Round Summary math, which stays fully hidden
  regardless (see D). Only *other groups'* data is off-limits, not *other rounds'* data.
- If no identity is stored yet, the name+PIN picker takes the place of the group filter.
- If the identified player isn't a member of any group for the selected round, fall back to
  single-player entry for just that player rather than blocking them outright.
- This applies to every round while the toggle is off — not just a "final round," per the
  simplified trigger above.
- **A player belonging to more than one group in the same round isn't prevented by the schema** —
  `group_members` only enforces uniqueness on `(group_id, player_id)`, nothing stops someone being
  added to two carts in the same round. Unlikely to happen by accident, but if it does, show every
  group they're a member of rather than picking one arbitrarily — never hide a group the player is
  actually entitled to see.
- **A toggle flip arriving over Realtime mid-entry must not disturb locally-staged, unsaved hole
  values.** Since `game_config` changes are pushed to every connected device the same way every
  other table's changes are, flipping the toggle from one device while another device has
  unsaved, staged (not-yet-`Save`d) values on Enter Scores must only change what that second
  device is allowed to see/select — it must not clear or discard whatever they were mid-typing.

**D. Round Summary while hidden.**
- The whole table is replaced by a placeholder message (e.g. "Results are hidden until the
  reveal") for every round and every player — no identity needed here at all, since there's no
  partial view to gate anymore.
- **This placeholder needs to slot into the existing state chain at the right point, not fight
  with it.** [round/page.tsx](../src/app/round/page.tsx) already has distinct states for loading,
  error, "No rounds set up yet," and "No scores entered yet" (when `summaries.length === 0`). The
  hidden-results placeholder belongs after loading/error/no-rounds-configured, but before the
  existing empty-scores state — i.e. checked regardless of whether any scores exist yet, not
  layered awkwardly inside or after the empty-state check.

**E. Reveal.** Turning `totals_visible` on immediately restores full visibility everywhere — every
group on Enter Scores, full Round Summary tables for all rounds, real Totals numbers — all at
once, with no identity required from that point on. Since this toggle now controls three screens,
its label/copy in ConfigTab should probably change from "Totals Visibility" to something broader
(e.g. "Results Visibility" or "Reveal Winner") — flagging this as a copy decision to make during
implementation rather than dictating exact wording here. Keep the underlying database column named
`totals_visible` — renaming it would mean an unnecessary extra migration for zero functional gain,
purely a display-label change.

**F. Rollout note (operational, not a code change).** The moment this ships, every existing real
player has a blank PIN (per A). If the toggle is ever turned off before an admin has gone through
Setup → Players and assigned everyone a real PIN, nobody will be able to identify themselves on
Enter Scores at all. Worth a reminder alongside the existing "reset before each trip" checklist in
[DEPLOY.md](../DEPLOY.md): assign every player a PIN before relying on hidden mode for the first
time.

### What NOT to build

- No passwords, accounts, or general login system — the player PIN is a lightweight per-player
  secret used only to claim "which group is mine," not a full authentication system.
- No Supabase RLS or other server-side data scoping — all data still reaches every device; only
  what's rendered changes. If real enforcement is ever wanted later, that's a separate, larger
  effort, not part of this item.
- Don't build the "final round only" trigger from the original draft — the toggle alone governs
  all rounds uniformly.
- Don't build a partial "see your own group" view on Round Summary while hidden — it's a flat
  placeholder for everyone, matching Totals.
- Don't change any scoring/calculation logic — this is purely about what's rendered and to whom,
  plus the new `pin` column.
- Don't require a PIN or identity for anything while the toggle is ON — identity is only ever
  asked for lazily, when it's actually needed.

### Testing

- With the toggle ON (the default), Enter Scores, Round Summary, and Totals all behave exactly as
  they do today — no identity prompt ever appears.
- Turning the toggle OFF in Setup → Scoring: Round Summary immediately shows the hidden-results
  placeholder for every round; Totals shows its existing placeholder; Enter Scores, next time it's
  opened without a stored identity, shows the name+PIN picker instead of the group filter.
- Entering the wrong PIN for a selected name shows an inline error and does not grant identity.
- Entering the correct name+PIN stores identity on that device; reloading or revisiting later does
  not re-prompt, until "Switch player" is used.
- After identifying, Enter Scores shows only that player's own group's pill for whichever round is
  selected — no other group pills, no "All Players" — for every round, not just one.
- For a player who's on a *different* group in different rounds (e.g. Group 2 in Round 1, Group 4
  in Round 3), switching the round selector while hidden always shows the correct group for
  *that* round — never a stale group carried over from whichever round was selected before.
- A player not on any group for the selected round still gets a working single-player entry flow
  for themselves, not a dead end.
- "Switch player" is easy to find, clears the stored identity, and re-prompts for name+PIN.
- Turning the toggle back ON immediately (no reload needed) restores full visibility on all three
  screens and stops prompting for identity anywhere.
- An admin can view and edit every player's PIN in Setup → Players once Setup is unlocked.
- While Setup is locked, no player's real PIN value appears anywhere in the rendered page or DOM
  (check page source/DOM, not just the visible UI — same verification already done for the Admin
  Passcode field in Round 3).
- A player with no PIN set cannot be identified as, with any input, including a blank/empty PIN
  submission — the picker stays on an error, identity is never granted.
- A PIN containing a leading zero (e.g. `0219`) round-trips correctly: set it in Setup → Players,
  reload, confirm it still reads `0219` (not `219`), and confirm typing `0219` on Enter Scores
  matches it.
- After an admin deletes a player (or otherwise invalidates a stored identity) whose id is already
  saved in a device's `localStorage`, that device falls back to the "who's on this device?" picker
  next time identity is needed, rather than erroring or getting stuck.
- Changing a still-existing player's PIN does not log out a device that was already identified as
  them — it keeps working until "Switch player" is used deliberately.
- If a player is (unusually) a member of two different groups in the same round, Enter Scores
  shows both group pills for them while hidden, not just one.
- Staging (but not saving) hole values on Enter Scores, then having the toggle flip off from a
  *different* device via Realtime, does not clear or discard the unsaved staged values on the
  first device.
- On Round Summary, the hidden-results placeholder appears for a round with real entered scores
  and for a round with none yet — it doesn't get preempted by, or wrongly show alongside, the
  existing "No scores entered yet" empty state.
- A round with no groups configured at all, opened on Enter Scores while hidden, drops the
  identified player into single-player entry for themselves rather than erroring or showing
  nothing.
