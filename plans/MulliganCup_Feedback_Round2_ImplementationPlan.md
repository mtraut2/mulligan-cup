# Implementation plan for Claude Code — Mulligan Cup: Feedback Round 2

Copy everything below into Claude Code in the Mulligan Cup project to make these changes.

## Suggested order

Recommended sequence, though adjust if the codebase suggests otherwise:

1. **Item 2 first** (data cleanup) — clears out test data so Items 1, 3, and 5 can be manually
   tested against a clean slate rather than leftover test entries.
2. **Items 1, 3, and 5 together** — all three modify the score entry screen (save/validation
   logic, player switcher, field focus behavior respectively), so implementing and testing them
   as a group on that one screen is more efficient than separate passes.
3. **Item 4 next** — independent of the others; reuses the existing admin-gating pattern from the
   Scoring config access control work already in place, so confirm how that's implemented before
   adding a new toggle to it.
4. **Item 6 last** — a responsive/layout pass across the whole app. Doing this after Items 1–5 are
   settled means the desktop layout work only has to happen once against finalized mobile
   behavior, rather than being redone if the mobile UI changes again.

## Summary of changes

1. **Group score entry flow** — replace the manual "Save and go to next hole" step (when entering
   scores for multiple players in a group on one hole) with local UI staging across players plus
   a single explicit Save that commits everyone's entered values at once. Save is blocked entirely
   for any player who has started but not fully completed all four fields (Score, Putts, Lost
   Balls, Ladies Tees) — no defaults, no partial saves. Once a full group Save succeeds, the view
   auto-advances to the next hole. Applies to new entries going forward only.
2. **Clean up existing test hole data** — delete all Hole Play Data currently in the database
   (it's leftover test data), while keeping Players, Groups/carts, Courses, and Scoring config
   fully intact.
3. **Redesign the player switcher** on score entry — replace the dropdown with a large, centered
   player name and left/right paging arrows, with careful handling so the mobile keyboard doesn't
   disrupt scroll position.
4. **Admin-controlled Totals visibility toggle** — an admin-only on/off switch that, when off,
   keeps the Totals tab visible in navigation but replaces its content with a placeholder message
   instead of real data.
5. **Single-digit field auto-advance** — numeric entry fields (Score, Putts, Lost Balls, Ladies
   Tees) assume a one-digit entry and auto-advance to the next field; two-digit scores require
   navigating back into the field.
6. **Responsive desktop experience** — adapt the layout based on device/viewport so desktop and
   larger screens get a layout suited to the extra space, while the mobile experience (including
   everything in Items 1, 3, and 5) remains fully intact and unchanged.

---

## Item 1: Improve group score entry flow

**Current behavior:** When entering hole scores for a group/cart (multiple players), the scorer
fills in each player's fields and then must tap a "Save and go to next hole" button. This causes
two problems:
- It requires an extra manual save click per hole, per group, that doesn't need to exist.
- It advances to the next hole immediately on save — but in group entry, the scorer may have only
  finished entering one player's score, not the whole group's. This forces them to click back to
  the hole they were just on to finish entering the rest of the group.

**Root cause:** The "Save and go to next hole" action was designed around single-player entry
(enter your own score, save, move on) and is being applied unmodified to group entry, where
multiple players' data needs to be captured on the same hole before it makes sense to advance.

**Requested change — new behavior for group entry specifically:**

**A. Local staging, single explicit Save.** Database writes should not happen on every
keystroke/field change, for performance reasons.
- As the scorer enters values (Score, Putts, Lost Balls, Ladies Tees) for any player in the
  group, hold those values in local UI state only — no save/network call yet.
- Navigating between players within the same group/cart (e.g. entering Kyle's scores, then
  switching to the next player) must **preserve** everything already entered for every player,
  even though nothing has been saved to the database yet.
- A single **Save** action commits everyone's currently-entered, fully-valid values for the group
  in one action/request (see validation rule B for what counts as valid).

**B. No partial saves — validation rule.** For any player, if *any* of the four fields (Score,
Putts, Lost Balls, Ladies Tees) has a value entered, *all four* fields must have a value before
Save will succeed for that player.
- A player with all four fields blank is simply not included in that Save (fine — they haven't
  started entering for this hole yet).
- A player with some fields filled and others still blank is **incomplete** and blocks Save.
  Lost Balls and Ladies Tees are required once a player has started entering data for a hole — if
  the true value is zero, the scorer must explicitly enter `0` rather than leaving it blank.
- If Save is tapped while any started-but-incomplete player exists in the group, Save must **not**
  go through for anyone (not even the complete players) — block the whole action and clearly
  indicate which player(s) and field(s) are missing. This is a hard blocker, not a dismissible
  warning.
- **Exception:** a single player entering only their own score (not the whole group) can Save as
  soon as their own four fields are complete, independent of anyone else in the group (see D).

**C. Auto-advance.** Once Save succeeds and every player in the active group has a complete entry
(all four fields) for the current hole, move the view to the next hole automatically.
- On hole 18, advancing does nothing (stay put), or optionally show a subtle "complete" indicator.
- Editing a score after the group already advanced (e.g. jumping back to hole 12) saves normally
  but does not re-trigger auto-advance — only the *first* time a hole becomes fully complete and
  saved should it advance.
- A Save that succeeds for only some of the group's players (others haven't started that hole
  yet) should still save successfully, but must **not** trigger auto-advance.
- Navigating away from the current hole before hitting Save must not lose locally-staged values —
  they should still be included the next time Save is triggered.

**D. Single-player entry is unchanged.** Keep the existing "Save and go to next hole" button and
behavior exactly as-is when a player is entering only their own score, not their whole group's.
The all-four-fields validation from B still applies (a player can't save with their own fields
partially blank), but auto-advance continues to work exactly as it does today, triggered by the
existing button.

### What NOT to change

- Do not change the single-player "Save and go to next hole" flow.
- Do not change how hole data is stored once saved, the calculation engine, or any other view —
  this is scoped to the group entry interaction pattern only.
- Do not persist to the database on every field keystroke/change — local staging plus a single
  explicit Save per group entry is the whole point of this change.
- Do not implement a soft/dismissible warning for incomplete fields — incompleteness must fully
  block Save for the incomplete player(s), not just warn.
- Do not default blank Lost Balls or Ladies Tees to `0` automatically — a blank value on a
  started player now blocks Save until the scorer explicitly enters a value (including `0` if
  that's the true value).
- **Scope note:** this validation rule applies to new hole entries going forward only. It is not
  a data migration — do not attempt to retroactively validate, flag, or fix existing hole data
  already in the database (see Item 2 below for cleanup of that existing test data separately).

### Testing

- Entering Score and Putts (but not Lost Balls or Ladies Tees) for one player, then switching to
  another player in the same group and entering their values, does not lose the first player's
  partial entry — it's still there when the scorer returns.
- Tapping Save while any started player in the group is missing a field blocks Save entirely for
  the whole group and clearly indicates which player(s)/field(s) are incomplete.
- A player with all four fields blank does not block Save for the rest of the group — they're
  simply not included in that save.
- A player with all four fields filled, alongside other players with all four fields filled,
  saves successfully together in one action.
- No database write occurs until Save is explicitly triggered and passes validation (verify via
  network/DB inspection during manual testing).
- Once a Save succeeds where every player in the group has a complete entry, the view
  automatically advances to the next hole.
- A Save that succeeds for some players (because others in the group haven't started that hole
  yet) does not trigger auto-advance.
- On hole 18, a fully-complete group Save does not attempt to advance past the last hole and does
  not error.
- Going back to a previously-completed hole, editing a player's score (keeping all four fields
  filled), and hitting Save persists the edit but does not trigger another auto-advance.
- A single player can enter and save just their own complete hole entry via the existing
  single-player "Save and go to next hole" flow, independent of whether anyone else in their
  group has entered anything.
- A single player attempting to save with one of their own four fields blank is blocked, with a
  clear indication of the missing field.

---

## Item 2: Clean up existing test hole data

**Current behavior:** The database contains hole-by-hole score data from earlier testing of the
app, entered before this feedback round's validation rules existed. This data is not real trip
data and should not be treated as such.

**Requested change:** Delete all existing **Hole Play Data** (scores, putts, lost balls, ladies
tees, and anything derived from it — round summaries, cached calculations, etc.) from the
database.

**Do NOT delete:**
- **Players** (names, handicaps) — keep the existing player roster exactly as-is.
- **Groups/carts** and their per-round assignments — keep exactly as-is.
- **Courses** and their configuration (name, rating, slope, par, hole handicaps/pars) — keep
  exactly as-is.
- **Scoring config** (Golf Points, Money Owed, Placement Points, buy-in) — keep exactly as-is.

This is purely a cleanup of test score entries so the app starts with a clean slate for hole data
without losing the setup work already done (roster, courses, groups, config).

### Testing

- After cleanup, all Hole Play Data (scores/putts/lost balls/ladies tees) is gone, and the Round
  and Totals views show no data / an empty state, as if no scores had ever been entered.
- Players, Groups/carts (and their per-round assignments), Courses, and Scoring config are fully
  intact and unchanged after cleanup.

---

## Item 3: Redesign player switcher on the score entry screen

**Current behavior:** Switching between players on the score entry screen uses a dropdown
selector.

**Requested change:** Replace the dropdown with a paged, name-forward switcher:
- Display the active player's name larger and centered on the screen (more prominent than the
  current dropdown treatment).
- Add left and right arrow controls on either side of the name to page to the previous/next
  player, cycling through the players relevant to the current context (i.e. the active
  cart/group's players, or all players if that filter is selected — matching whatever scope the
  existing player list already respects).
- This replaces the dropdown as the primary way to switch players; it doesn't need to keep the
  dropdown alongside it unless there's a reason to keep both (your call during implementation if
  a dropdown is still useful as a secondary jump-to option, but the arrows + name should be the
  primary interaction).

**Keyboard-awareness requirement:** On mobile, when the on-screen keyboard opens (e.g. the scorer
taps into a numeric field), the score entry section's scroll position must not jump or get
interrupted by the keyboard appearing. Specifically:
- The player name/arrow switcher at the top should remain usable and not get pushed awkwardly by
  the keyboard.
- The active input field being edited should stay visible above the keyboard (not hidden behind
  it), without causing a jarring scroll jump elsewhere on the page.
- Test this on both iOS and Android mobile browsers, since keyboard behavior differs between them.

### What NOT to change

- Do not change what data is shown for the active player (Score, Putts, Lost Balls, Ladies Tees
  fields) — this item is scoped to how the player is selected/switched, not the entry fields
  themselves.
- Do not change the cart/group filtering behavior itself — the arrows should page through
  whatever player set that filter already produces.

### Testing

- Tapping the right arrow advances to the next player in the current filtered list; left arrow
  goes to the previous player. Arrows should not error or crash at the start/end of the list
  (either disable/hide the arrow at the boundary, or wrap around — your call, but it shouldn't
  break).
- The active player's name is clearly larger and centered compared to the rest of the screen.
- Switching players via the arrows preserves any locally-staged (unsaved) entries for other
  players in the group, consistent with Item 1's local staging behavior.
- On a mobile device, tapping into a field to bring up the keyboard does not cause the page to
  jump unexpectedly or hide the field being edited.
- Player switching still respects whatever cart/group filter is active, matching current behavior.

---

## Item 4: Admin-controlled Totals visibility toggle

**Current behavior:** The Totals tab is visible and shows live weekend totals to all players at
all times.

**Requested change:** Add an admin-only toggle (in Scoring config or another appropriate
admin-locked area of Setup) to hide or show the Totals view's actual content:
- When **on** (visible — default), the Totals tab behaves exactly as it does today, showing live
  weekend totals to everyone.
- When **off** (hidden), the Totals tab itself should **still appear** in the bottom navigation —
  don't remove or hide the tab. Tapping into it should instead show a simple message in place of
  the real content, along the lines of "Totals will be revealed at the end of the weekend" (exact
  wording can be refined, but the idea is a friendly placeholder, not an error or blank screen).
- This toggle should live in the same admin-only area as the rest of Scoring config, consistent
  with the access-control pattern already established (admin-only: Scoring config; open to all:
  everything else in Setup).
- The toggle's on/off state should apply globally — i.e. hides Totals for all players at once,
  not per-player.

### What NOT to change

- Do not remove the Totals tab from navigation when toggled off — it must remain visible and
  tappable, just showing the placeholder message instead of real data.
- Do not change how Totals are calculated — this only affects whether that already-calculated
  data is displayed or replaced with a placeholder message.
- Do not affect any other view's data or access when this toggle is used — it is scoped to the
  Totals view only.

### Testing

- With the toggle on (default), Totals shows real weekend data as it does today.
- With the toggle off, the Totals tab is still visible and tappable in navigation, but shows the
  placeholder message instead of real numbers.
- The toggle itself is only visible/editable within the admin-only Scoring config area, consistent
  with existing access control.
- Toggling off and back on correctly restores the real Totals view without needing a refresh (or
  restores correctly on next reasonable refresh/sync).

---

## Item 5: Single-digit field auto-advance

**Current behavior:** Numeric entry fields (Score, Putts, Lost Balls, Ladies Tees) require the
scorer to manually tap/navigate into each field one at a time.

**Requested change:** Each numeric field should default to expecting a single digit:
- When the scorer types one digit into a field, automatically move focus to the next field in
  that player's row (Score → Putts → Lost Balls → Ladies Tees), the same way a PIN-code input
  commonly behaves.
- If the actual value is two digits (e.g. a score of 10 or higher), the scorer needs to navigate
  back into that field (tap/click back into it, or use a "previous field" action) to enter the
  second digit. Once they do, that field should then wait for an explicit "done"/blur action (tap
  away, or a confirm action) rather than auto-advancing after the second digit — since at that
  point the field can no longer assume a fixed digit length.
- This behavior applies within a single player's row of fields. Moving from the last field of one
  player's row to the first field of the next player's row should continue to require a normal
  tap/navigation — auto-advance is scoped to fields within one player's entry, not across players.
- Apply this consistently to both group entry and single-player entry, since it's a data-entry
  convenience independent of the save/advance-hole behavior in Item 1.

### What NOT to change

- Do not change the save/advance-hole behavior covered in Item 1 — this item is scoped purely to
  focus movement between fields within a player's row.

### Testing

- Typing a single digit into Score, Putts, Lost Balls, or Ladies Tees auto-advances focus to the
  next field in that player's row.
- Entering a double-digit score (e.g. 10+) requires navigating back into the field, and that field
  then waits for an explicit done/blur action instead of auto-advancing after the second digit.
- Digit auto-advance works the same way in both group entry and single-player entry.

---

## Item 6: Responsive desktop experience

**Current behavior:** The app is built mobile-first and is optimized for phone use (per the
original spec), which is the primary context during an actual round of golf. On a desktop or
larger screen, the app should adapt its layout rather than simply stretching or centering the
mobile layout.

**Requested change:** Detect the device/viewport being used and adjust the experience
accordingly, while keeping the existing mobile experience fully intact:
- **Mobile stays as-is** — phones should continue to get the current mobile-optimized layout and
  interactions (including everything in Items 1, 3, and 5 above), since that's the primary
  real-world use case (players entering scores on the course).
- **Desktop/larger screens get a layout adapted to the extra space**, rather than just a
  stretched or centered version of the mobile layout. Use good judgment on what "desktop-adapted"
  means for each view — for example (not prescriptive, use your judgment during implementation):
  - Round and Totals views could use the extra width for wider tables/breakdowns without needing
    to scroll horizontally.
  - Setup could show Course details, Carts/groups, and Players side-by-side or in a less
    single-column layout instead of everything stacked vertically.
  - Score entry likely still benefits from a narrower, focused layout even on desktop (it's an
    entry-focused task), but shouldn't feel like a phone screen awkwardly centered in a sea of
    empty space.
- This should be **responsive**, not just two fixed breakpoints — use standard responsive design
  practices so the experience adapts reasonably across phone, tablet, and desktop widths, not just
  jumping abruptly at one breakpoint.
- Determine device/viewport using standard responsive web techniques (CSS media queries,
  viewport-width detection, etc.) rather than user-agent sniffing where possible, so the
  experience adapts correctly even in edge cases (e.g. a phone in landscape, a small laptop
  window, a tablet).

### What NOT to change

- Do not change or degrade the mobile experience — everything specified in this plan and the
  original build (mobile-first layout, hole-by-hole entry flow, etc.) must continue to work
  exactly as intended on phones.
- Do not change any underlying data, calculation logic, or feature behavior — this item is scoped
  to responsive layout/presentation only.

### Testing

- On a phone-width viewport, the app looks and behaves exactly as it did before this item (no
  regressions to the mobile experience).
- On a desktop-width viewport, views make better use of available space (e.g. wider tables, less
  vertical stacking) rather than simply centering or stretching the mobile layout.
- Resizing the browser window gradually between phone and desktop widths shows the layout adapting
  smoothly rather than breaking or jumping oddly at one specific breakpoint.
- Test on at least one tablet-width viewport to confirm the in-between experience is reasonable,
  not just phone and desktop extremes.
