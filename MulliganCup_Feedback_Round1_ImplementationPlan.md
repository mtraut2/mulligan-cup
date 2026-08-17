# Implementation plan for Claude Code — Mulligan Cup: Feedback Round 1

Copy everything below into Claude Code in the Mulligan Cup project to make these changes.

## Summary of changes

1. **Setup access control** — only Scoring config stays admin-only; everything else in Setup
   opens up to all players.
2. **Currency formatting** — every dollar figure in the app displays with a `$`; points stay
   plain numbers.
3. **Scoring config reorganization** — split into a Points section and a Money section, and
   expand Placement Points from 4 tiers to one editable field per place/player.
4. **Round tabs show course names** — "Round 1/2/3" labels are replaced by that round's course
   name everywhere in the app.

Items 2 and 3 touch the same screen (Scoring config) and are easiest to implement together. Item 4
is fully independent and can be done in any order. Test each item separately using the checklists
below before moving to the next.

---

## Item 1: Setup view access control

I want to update access control on the **Setup** view in the Mulligan Cup app.

**Current behavior:** The entire Setup view (Course details, Carts/groups, Players/roster) is
locked down as admin-only, per the original spec.

**Requested change:** Only the **Scoring config** (Golf Points values, Money Owed values,
Placement Points values, buy-in amount — i.e. the "Game Inputs" admin config) should remain
protected. Every other tab/section under Setup — **Course details** (name, rating, slope, par,
hole handicaps/pars), **Carts/groups** assignment, and **Players/roster** management (add/edit/
remove players and handicaps) — should be open to all players, the same as the Enter Scores,
Round, and Totals views already are.

**Rationale:** This matches the spec's original accessibility principle — the group favors open
access and avoiding entry conflicts over locking down data, and admin-only status should apply
narrowly to the scoring formulas themselves (which the two admins tune), not to routine trip
logistics like which course is being played or who's in which cart. Any player might reasonably
need to fix a hole handicap, reassign carts, or add a late player to the roster during the trip.

### What to change

1. **Audit how admin-gating is currently implemented** for the Setup view (route guard,
   component-level check, feature flag, etc.) and identify exactly where it's applied.
2. **Narrow that gate to only the Scoring config section/tab.** Course details, Carts/groups, and
   Players should render and be fully editable for any user, with no admin check.
3. **Keep the Scoring config gate exactly as it is today** — same admin check, same protected
   fields (Golf Points, Money Owed, Placement Points, buy-in amount).
4. If Setup is currently a single unguarded-vs-guarded page (not tabbed), split it so the Scoring
   config lives in its own clearly separated section/tab that carries the access check
   independently from the rest of Setup.
5. Update any UI copy that currently implies all of Setup is admin-only (e.g. a lock icon, an
   "Admins only" label, or a login prompt shown before any Setup content loads) so it only appears
   on the Scoring config section.

### What NOT to change

- Do not remove or weaken the admin check on Scoring config itself.
- Do not change the underlying calculation engine, data model, or any of the other views (Enter
  Scores, Round, Totals) — this is scoped purely to Setup's access control.

### Testing

- Confirm a non-admin user can open Setup and freely edit Course details, Carts/groups, and
  Players.
- Confirm a non-admin user still cannot view or edit Scoring config.
- Confirm the admin user's experience is unchanged (full access to everything, including Scoring
  config).

---

## Item 2: Currency formatting

**Current behavior:** Dollar amounts throughout the app may not be consistently displayed with a
`$` unit — some may show as bare numbers (e.g. `50` instead of `$50`).

**Requested change:** Audit every place a dollar value is displayed or entered and apply proper
currency formatting (`$` prefix, appropriate decimal handling — e.g. `$50`, `$1`, `$127.50`, not
bare numbers). This includes at minimum:
- Scoring config: the Money Owed values (three-putt, lost ball, ladies tee, triple+) and the
  buy-in amount.
- Round view: the per-player Money Owed column and the drill-down breakdown (each penalty
  category and its subtotal).
- Totals view: per-player money owed, total pot, payout, and net earnings.
- Any other player stats or summaries that surface a dollar figure.

**Do not** apply `$` formatting to point values anywhere — Golf Points (zero putt, one putt,
eagle, birdie, par, bogey), Placement Points, and Total Points should all remain plain numbers in
their current display format. Points and money should be visually distinguishable at a glance.

### Testing

- Every dollar amount in the app (Scoring config, Round drill-down, Totals view, payouts) displays
  with a `$` and reads correctly both at round numbers ($50) and figures with cents ($127.50).
- Point values (Golf Points, Placement Points, Total Points) are unaffected and remain plain
  numbers with no `$`.

---

## Item 3: Scoring config reorganization + per-place Placement Points

**Current behavior:** The Scoring config tab mixes Golf Points values, Money Owed values, and the
buy-in amount together without clear grouping. Placement Points configuration already exists, but
only covers four tiers — 1st, 2nd, 3rd, and "4th and lower" as a single catch-all value — matching
the original spec's default table.

**Requested changes:**

1. **Reorganize Scoring config into two clearly separated sections:**
   - **Points section** — the existing Golf Points values (zero putt, one putt, eagle, birdie,
     par, bogey) plus the expanded Placement Points fields (see below).
   - **Money section** — the buy-in amount and the existing Money Owed values (three-putt, lost
     ball, ladies tee, triple+). Apply Item 2's `$` formatting to every field in this section.

2. **Expand Placement Points to one editable field per place, for every player in the field** —
   not just four tiers. With N total players in a round, there should be N editable Placement
   Points fields: one for 1st, one for 2nd, one for 3rd, ... down to last place. This should scale
   automatically with the actual number of players (e.g. an 8-player round shows 8 fields, a
   12-player round shows 12 fields) rather than being fixed at 4 tiers with a catch-all for
   everyone below 3rd.
   - Sensible defaults: pre-fill using a reasonable descending pattern (e.g. 16, 14, 12, 10, 9, 8,
     7, 6... down to 1, adjusting for however many players are in the field) so the admin isn't
     starting from blank fields. **These are placeholder defaults only** — the group hasn't
     finalized actual point values for every place yet, so every field must be freely editable,
     and the UI should make clear these are starting values to be adjusted, not fixed defaults
     (e.g. a subtle "default — edit as needed" hint, or similar).
   - Wire these into the existing placement-points calculation logic directly — a player's
     placement (including any tie-break-adjusted split, per the existing tie-break rule) should
     look up its exact point value from this per-place list instead of falling into a "4th and
     lower" bucket.
   - If the number of players changes between rounds (someone joins or drops), the list of
     placement fields should reflect that round's actual player count.

### What NOT to change

- Do not change the underlying calculation formulas themselves (Course Handicap, stroke
  allocation, hole outcome) — this item only reorganizes the config UI and expands how granular
  Placement Points can be configured.
- Do not change the existing tie-break logic (Net Score → Golf Points → split evenly) — it should
  still apply the same way, just pulling from per-place values instead of the old 4-tier table.

### Testing

- The Scoring config tab shows a Points section (Golf Points + per-place Placement Points) and a
  Money section (Buy-in + Money Owed) as visually distinct groupings.
- With N players in a round, Scoring config shows exactly N editable Placement Points fields, one
  per place.
- Editing any individual place's Placement Points value changes that specific placement's points
  on the Round view and flows through correctly to Total Points and the Totals view, without
  affecting other places' values.
- A tie between two players still splits the two adjacent placement values evenly, now pulling
  from the per-place list rather than the old 4-tier table.
- Re-confirm Item 1's access control still holds: Scoring config (now including the expanded
  Placement Points fields) remains admin-only, while the rest of Setup remains open to all
  players.

---

## Item 4: Round tabs should show course names, not "Round #"

**Current behavior:** Rounds are labeled generically throughout the app — "Round 1," "Round 2,"
"Round 3" — in the round tabs on Enter Scores, Round, and Setup, and anywhere else a round is
referenced.

**Requested change:** Replace "Round #" labeling with the actual **course name** for that round,
pulled from the Course details already configured in Setup (e.g. a tab currently labeled "Round 1"
should instead show "Pebble Creek," or whatever that round's course is named). This should apply
**everywhere** a round is referenced in the UI, not just the main round tabs — check the Enter
Scores view, the Round view, Setup's course/cart sections, and the Totals view (if it references
individual rounds at all, e.g. in a per-round breakdown).

**Fallback behavior:** If a course's name hasn't been set yet (still using a placeholder like
"Course 1") or is blank, fall back to showing "Round #" (or the placeholder name itself, e.g.
"Course 1") so the tab is never empty or broken — don't require a course name to exist before the
tabs can render.

**Live updates:** If an admin renames a course in Setup mid-trip, the corresponding tab label
elsewhere in the app should update to match — this should read from the same Course data already
in the data model, not a separately stored label.

### What NOT to change

- Do not change round ordering, round count (still 3 rounds), or which data belongs to which
  round — this is a display-label change only.
- Do not require course names to be unique, but if two rounds end up with the same course name
  (unlikely, but possible if an admin makes a typo or copies data), don't break — just show the
  duplicate names as-is rather than erroring.

### Testing

- Confirm each round tab shows that round's course name instead of "Round 1/2/3" throughout Enter
  Scores, Round, Setup, and Totals (wherever rounds are referenced).
- Confirm renaming a course in Setup updates the tab label immediately (or on next reasonable
  refresh/sync) everywhere else in the app.
- Confirm a round still using a placeholder or blank course name falls back gracefully instead of
  showing an empty tab.
