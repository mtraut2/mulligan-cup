# Implementation plan for Claude Code — Mulligan Cup: Feedback Round 3

Copy everything below into Claude Code in the Mulligan Cup project to make these changes.

## Summary of changes

1. **Lock the whole Setup view behind the admin PIN** — Courses, Groups, Players, and Scoring all
   become view-only until unlocked; the PIN control itself is the only interactive thing available
   while locked.
2. **Chevron affordance on Round Summary player rows** — signal that each row is tappable to
   expand player detail, since the current click-to-expand row has no visual hint that it's
   interactive.
3. **Round Summary table columns** — add a Gross score column before Net, drop the Owed column
   from the summary row (it stays in the expanded detail panel and on Totals), and show each
   player's Playing Handicap inline next to their name.

This reverses part of Feedback Round 1's "open up Setup access" change (which made Courses,
Groups, and Players editable by anyone, no passcode). That's intentional per this round's
feedback — Setup as a whole should default to locked/view-only, with the existing admin PIN
unlocking edit access across all four tabs at once, not just Scoring.

Item 1 is fully independent (Setup screen only) and can be done in any order relative to the
others. Items 2 and 3 both touch the same Player `<td>` and table structure in
[src/app/round/page.tsx](../src/app/round/page.tsx) — implement and test them together in one
pass rather than as two separate edits to the same cell.

---

## Item 1: Whole-Setup view lock, gated by a single admin PIN

**Current behavior:** Setup has four tabs — Courses, Groups, Players, Scoring. Courses, Groups,
and Players are fully open and editable by anyone with no gating at all (per Round 1). Scoring is
the only gated tab: while locked, its content is replaced entirely by a passcode-entry form (you
can't see the scoring config at all until you unlock), gated against `gameConfig.admin_passcode`,
with the unlocked state cached in `localStorage` (`mulliganCup.adminUnlocked`) and a "Lock" link
in the header to manually re-lock.

**Requested change:** Extend that same PIN gate to cover the entire Setup view, but change how
"locked" behaves:

**A. Locked is view-only, not hidden.** Right now Scoring hides its content behind a passcode
prompt when locked. Change this: when locked, every tab (Courses, Groups, Players, Scoring) still
shows its real, current data — round/course details, hole handicaps/pars, groups and their
members, the player roster, scoring point values, money values, and the totals-visibility state.
Nothing about *viewing* Setup requires the PIN. Only editing does.

**B. All edit affordances are disabled or hidden while locked.** Across all four tabs, this means:
- Every text/number input bound to a savable field (course name/rating/slope/par, hole handicap/
  par, group label, player name/handicap, golf points, money values, buy-in, placement points)
  becomes read-only/disabled with a visibly muted style, so it reads as "not editable" at a
  glance.
- Every action button that mutates data — Save Course, + Add Group, Copy \[previous round\],
  Delete (group), Remove (player), the Add Player form, the Totals Visibility toggle, Save
  Scoring Rules — is hidden while locked. (Hiding rather than disabling avoids a screen full of
  dead buttons; the muted inputs already communicate "view only.")
- Group membership chips (the player toggle buttons inside each group card) become inert/
  non-clickable while locked, but still visually indicate who's currently in each group.
- Round-selector tabs (the Round 1/2/3 pills at the top of Courses and Groups) and the main
  Courses/Groups/Players/Scoring tab bar remain fully clickable while locked — browsing between
  rounds and tabs is navigation, not editing, and must keep working.

**C. One PIN unlocks all four tabs at once.** There is a single lock/unlock state for the whole
Setup view (not per-tab). Move the PIN entry out of the Scoring tab body and into the page header
(next to the "Setup" title), matching where the existing "Lock" link already lives:
- **Locked:** header shows a small "🔒 Unlock" control. Tapping it reveals an inline PIN input +
  Unlock button right there (expand-in-place, with a Cancel/collapse option), so the rest of the
  page stays visible underneath. An incorrect PIN shows an inline error next to that control,
  same as today.
- **Unlocked:** header shows the existing "Lock" link, which immediately re-locks the whole view
  (all four tabs go back to view-only), same as today.
- Keep using `gameConfig.admin_passcode` as the PIN source of truth and `localStorage`
  (`mulliganCup.adminUnlocked`) for session persistence across reloads/tab switches — no changes
  to how the PIN itself is validated or stored.
- Since every tab now depends on this shared lock state, pass the `unlocked` boolean down from
  `SetupPage` into `CoursesTab`, `GroupsTab`, `PlayersTab`, and `ConfigTab` (each currently takes
  no props) rather than having each tab manage its own gating.
- Drop the per-tab "🔒 Scoring" label treatment in the tab bar (today the Scoring tab alone shows
  a lock glyph when locked) — since locking now applies uniformly to all four tabs, a single lock
  indicator near the page title is enough; no need to mark one tab differently from the others.

**D. Admin Passcode field must stay masked while locked — do not just make it read-only.** The
Scoring tab has an "Admin Passcode" field showing the current PIN in plain text so an admin can
edit it. If Scoring becomes viewable-while-locked like every other tab, that field would leak the
PIN in plain text to anyone who opens Setup without ever unlocking it — which defeats the entire
point of gating the view. Specifically: **omit the Admin Passcode field's actual value whenever
the view is locked** (e.g. render it masked, or don't render the input's current value at all —
either is fine, just never put the real passcode string in the DOM/view while locked). It should
only ever show/be editable once unlocked.

### What NOT to change

- Do not change how the PIN itself is validated (`passcodeInput === gameConfig.admin_passcode`)
  or how the unlocked session is persisted (`localStorage` key `mulliganCup.adminUnlocked`).
- Do not add per-tab or per-field granularity to the lock — it's one PIN, one lock state, for the
  whole Setup view. Don't build a "some tabs unlocked, others not" mode.
- Do not restrict tab navigation or round-selector navigation while locked — browsing all tabs and
  all rounds must work identically locked or unlocked.
- Do not add a login/account system, per-user identity, or any authorization beyond the existing
  shared PIN — this stays a single shared admin PIN known only to the two admins, exactly as
  today, just applied more broadly.
- This is UI-level gating only, consistent with how the existing Scoring passcode already works —
  it does not add server-side/database-level enforcement (e.g. Supabase RLS) restricting who can
  call the underlying update/insert/delete functions. That's out of scope for this change; flag
  it separately if that's ever a concern.

### Testing

- Fresh load with no prior unlock (or after clearing `localStorage`) shows Setup locked by
  default: all four tabs show real data, but every input is disabled/muted and every mutating
  button (Save Course, + Add Group, Copy, Delete, Remove, Add Player form, Totals toggle, Save
  Scoring Rules) is hidden.
- While locked, the Admin Passcode field on the Scoring tab never renders the actual passcode
  value anywhere in the page (check page source/DOM, not just the visible UI).
- While locked, switching between Courses/Groups/Players/Scoring tabs and between round-selector
  pills works normally and shows the correct real data for each.
- While locked, group membership chips and any other non-form interactive elements don't trigger
  mutations when tapped.
- Tapping "🔒 Unlock" in the header reveals an inline PIN entry; submitting the wrong PIN shows an
  error and keeps the view locked; submitting the correct PIN unlocks all four tabs at once (not
  just the tab currently open).
- After unlocking, all previously-hidden edit controls appear and function exactly as they did
  before this change (Save Course, + Add Group, Copy, Delete, Remove, Add Player, Totals toggle,
  Save Scoring Rules, and the Admin Passcode field showing/editable).
- After unlocking, the Admin Passcode field now shows the real current value and can be edited/
  saved as before.
- Tapping "Lock" in the header while unlocked immediately returns all four tabs to the locked,
  view-only state described above.
- Reloading the page after unlocking keeps the view unlocked (session persisted via
  `localStorage`); reloading after locking keeps it locked.

---

## Item 2: Chevron affordance on Round Summary player rows

**Current behavior:** On the Round Summary page (`/round`), tapping anywhere on a player's row in
the summary table expands a detail panel beneath it (Golf Points breakdown, Money Owed breakdown,
holes entered, course/playing handicap); tapping again collapses it. The `<tr>` carries
`cursor-pointer` plus `hover:bg-neutral-50`/`active:bg-neutral-50` background tints, but nothing in
the row — including the Player cell — visually signals that it's tappable. On touch devices there's
no hover state to stumble onto first, so the interaction isn't discoverable.

**Root cause:** The click target is the whole row, but the only affordance is a `cursor-pointer`
CSS property, which has no visual presence at all on touch and is easy to miss even on desktop.

**Requested change:** Add a small chevron/caret next to each player's name that signals "tap for
details" and flips orientation to reflect expanded/collapsed state — the standard disclosure-
triangle pattern.

- The app has no icon library installed (no lucide-react, heroicons, react-icons, etc.) and no
  inline SVGs anywhere in `src/`. The one existing precedent for a directional affordance is the
  plain Unicode `‹`/`›` previous/next buttons on Enter Scores
  ([src/app/enter/page.tsx](../src/app/enter/page.tsx):387-407). Match that convention: use a
  plain text glyph (e.g. `›`), not a new icon dependency.
- In the Player `<td>` ([src/app/round/page.tsx](../src/app/round/page.tsx):109), wrap the name and
  a new chevron `<span>` in a flex container (`flex items-center gap-1`), with the chevron styled
  muted (`text-neutral-400`) to match the app's existing secondary-text convention.
- Rotate the chevron 90° when `expandedPlayerId === s.playerId` (conditional `rotate-90` Tailwind
  class) so it points right when collapsed and down when expanded, with `transition-transform` for
  a smooth flip rather than an instant jump.
- The chevron is a visual hint only — keep the entire `<tr>` as the click target exactly as today;
  don't turn the chevron into an independent/separate button.
- No new table column — the chevron lives inside the existing Player cell, so column count and the
  table's `overflow-x-auto` mobile scroll behavior are unaffected.

### What NOT to change

- Don't change what the expanded detail panel shows or how it's calculated — this is purely a
  discoverability affordance for the existing interaction, not a data/content change.
- Don't change the click target from the full row to just the chevron or just the name.
- Don't add an icon library or SVG icons — use a plain character glyph, consistent with the `‹`/`›`
  pattern already in the app.
- Don't apply this pattern to other screens in this pass unless Claude Code's exploration turns up
  another clickable-but-undiscoverable row using the same pattern elsewhere in the app — this is
  scoped to the Round Summary table.

### Testing

- On page load, every player row shows a chevron next to their name in the collapsed orientation,
  and no detail panel is expanded.
- Tapping a row rotates that row's chevron to the expanded orientation and reveals its detail
  panel; tapping again reverses both, with a smooth (not instant) rotation.
- Only one row is expanded at a time, matching the existing single-`expandedPlayerId` behavior —
  expanding a second row's chevron collapses the first.
- Tapping anywhere else in the row (not just directly on the chevron) still toggles expand/collapse
  and rotates the chevron, since the chevron isn't a separate click target.
- At both mobile and desktop widths, the chevron doesn't cause the Player column or table to wrap
  or overflow awkwardly.

---

## Item 3: Round Summary table — add Gross, drop Owed, show Playing Handicap next to name

**Current behavior:** The Round Summary table columns are Place, Player, Net, Golf, Place Pts,
Total, Owed. The Player cell shows only the player's name. The underlying gross score
(`s.totalScore`, already computed by `calculateRound` —
[src/lib/calc/types.ts](../src/lib/calc/types.ts):98) isn't shown anywhere in the summary row,
only Net (`s.netScore = totalScore - playingHandicap`). Money Owed is shown as its own summary
column, duplicating what's already available by expanding the row (Money Owed breakdown, in the
detail panel) and on the Totals page.

**Requested change:** Reorder/adjust the summary table to:

```
| Place | Player (Playing Hcp) | Gross | Net | Golf Pts | Place Pts | Total |
```

- **Add a Gross column** between Player and Net, showing `s.totalScore` — this value already
  exists on `PlayerRoundSummary`, no calc-layer changes needed, just render it in a new `<td>`.
- **Remove the Owed column** from the summary row entirely (drop that `<th>` and its `<td>`,
  currently rendering `formatMoney(s.moneyOwed)`).
- **Show Playing Handicap inline next to the player's name**, in parentheses and muted styling —
  e.g. "Kyle (14)" — using the existing `s.playingHandicap` value. Per your preference, this is
  simple inline parens, not a stacked line or badge.
- In the Player cell, order the three pieces left-to-right as: name, then the muted
  `(playing hcp)` text, then the chevron from Item 2 at the end of the flex row — so the row reads
  "Kyle (14) ›" with the hcp visually subordinate to the name and the chevron staying the
  right-aligned/trailing element.
- Column count stays the same (7 before, 7 after — Owed removed, Gross added), so the expanded
  detail row's `colSpan={7}` does not need to change, but double check it against the actual
  final header cell count once the edit is made.

### What NOT to change

- **Keep the expanded detail panel exactly as it is today** — Money Owed breakdown and total
  stay there, along with the existing "X of 18 holes entered · Course Hcp Y · Playing Hcp Z"
  footer line. Only the summary row's top-level columns change.
- Don't touch the Totals page — Money Owed continues to appear there unchanged.
- Don't change how Gross, Net, or Playing Handicap are calculated — this is a display-only change
  pulling from fields `calculateRound` already produces (`totalScore`, `netScore`,
  `playingHandicap`).

### Testing

- Round Summary header reads: Place | Player | Gross | Net | Golf | Place Pts | Total, with no
  Owed column.
- Each row's Gross value matches the player's raw total strokes across holes entered — the same
  number that, minus their Playing Hcp, already equals the existing Net value.
- Each Player cell reads "Name (Playing Hcp)" in muted styling next to the name, with the Item 2
  chevron still functioning (rotates, whole row still clickable) alongside it.
- Expanding a row still shows the full Money Owed breakdown/total and the unchanged
  holes-entered/course-hcp/playing-hcp footer line.
- Totals page is unaffected — Owed still shows there exactly as before.
- Table stays readable without awkward wrapping or overflow at mobile widths with the added Gross
  column and the "(Hcp)" suffix in the Player cell.
