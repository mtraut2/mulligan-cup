# Mulligan Cup App — Requirements Spec (v2)

*This version incorporates the original requirements doc, patterns found in the group's historical
spreadsheet (`2026_MulliganCup_EagleRidge.xlsx`), and decisions made to close prior open questions.
Open items remaining are called out explicitly at the end.*

## Background

Every year, a group of golfers (currently ~15 men, playing in groups/carts of 2–4) goes on an annual
golf trip. They play three rounds at three different courses over the weekend, competing for points
and for a cash pot funded by a buy-in plus in-round penalties.

Today, all scoring is done manually: players track hole-by-hole scores on paper, then someone
converts that paper data into round-total summaries in a spreadsheet by hand. This app replaces that
entire manual pipeline — players enter scores **hole-by-hole, directly on their phones**, and every
downstream calculation (round totals, net scores, points, money owed, final payouts) happens
automatically.

## Accessibility & Cost

- Must work well on phones (mobile-first), used by all ~15 men on the trip.
- User-friendly enough for at-the-course, quick data entry, likely by one designated
  scorer per cart (2 players) or group (4 players) entering data for their whole group.
- Any player can view or enter data for any other player — **no per-player data locks**. The
  design priority is avoiding entry conflicts (e.g., two people editing the same hole
  simultaneously), not access control.
- Small ongoing cost is acceptable, but the app/hosting should be toggle-able on/off so costs
  are incurred only during the active trip window, not year-round.

## Course Inputs

Each of the three courses played needs the following on record before a round starts:

| Input | Description |
|---|---|
| Course Name | e.g., "Course 1" (placeholder) — editable each year to the real course name |
| Course Rating | Used to calculate each player's Course Handicap |
| Slope Rating | Used to calculate each player's Course Handicap |
| Par (course total) | Used in Course Handicap calculation and Net Score context |
| Hole Handicaps (1–18) | Difficulty ranking per hole, 1 = hardest, 18 = easiest. Used to allocate strokes. |
| Hole Pars (1–18) | Par for each individual hole. Used to calculate Hole Outcome. |

**Status: course data is not yet known.** The courses played change year to year — the three courses
in last year's spreadsheet (Eagle Ridge North, Eagle Ridge South, and a third course) are historical
examples only and should **not** be hardcoded into the app. Course Name, Rating, Slope, Par, and all
18 Hole Handicaps/Pars must be fully editable, admin-entered fields, set fresh each year (or each
round) rather than fixed values baked into the build.

For initial build and testing, use generic placeholder courses — e.g., "Course 1," "Course 2,"
"Course 3" — with reasonable example rating/slope/par/hole data, so the calculation logic can be
built and verified independently of any specific real course. The admin should be able to rename
and update course data each year through the app's config/admin screen without needing a code
change.

## Game Inputs (Admin-Configurable, Not User-Editable)

These control scoring and should live in an admin-only config screen/table — editable only by the
app's designated admins (the user and her husband), not by regular players.

### Golf Points
Awarded per player per round based on how they played each hole (post-handicap outcome).

| Hole Outcome | Golf Points |
|---|---|
| Zero Putts (on a hole) | 3 |
| One Putt (on a hole) | 1 |
| Eagle | 4 |
| Birdie | 3 |
| Par | 2 |
| Bogey | 1 |

*Putts-based points (zero-putt, one-putt) and score-based points (eagle/birdie/par/bogey) are
**both** awarded per hole and summed across the round — they are not mutually exclusive. A hole
where a player one-putts for a birdie earns both the birdie points and the one-putt points.*

### Money Owed (to the pot)

| Action | $ Owed |
|---|---|
| Three-putt (per occurrence) | $1 |
| Lost ball (per occurrence) | $1 |
| Ladies tee (per occurrence) | $5 |
| Triple bogey or worse (per occurrence) | $1 |

*Note: an older penalty item, "Dicks Out/Rage" ($5), has been retired and replaced by the Ladies
Tee penalty. It should not be included in the app.*

### Placement Points
Awarded per round based on each player's rank by **Net Score** (lowest net score = 1st place).

| Place | Placement Points |
|---|---|
| 1st | 16 |
| 2nd | 14 |
| 3rd | 12 |
| 4th and lower | 10 |

**Tie-breaking logic (applies to Net Score ties):**
1. If two or more players tie on Net Score, the tie is broken by **Golf Points** (higher Golf
   Points for that round wins the better placement).
2. If Golf Points are *also* tied, split the placement points difference evenly between the tied
   players (e.g., two players tied for 1st/2nd both receive the average of the 1st and 2nd place
   point values).

*Note: the group's separate "Rules" tab mentions a putt-off tie-breaker for on-course match play —
that is a different, in-person tie-break mechanism and does not apply to Placement Points scoring
in the app.*

## Player Inputs

### User Data (static per player, set ~once per year, editable by any player for themselves or others)
- Name
- Handicap (raw input from each player — no calculation, just stored as entered)

### Calculated Per-Round Values (per player, per course/round — recalculated fresh each round)
- **Course Handicap** — calculated using the standard USGA formula:
  `Course Handicap = Handicap × (Slope Rating / 113) + (Course Rating − Par)`
- **Playing Handicap** — Course Handicap minus the lowest Course Handicap among all players *for
  that same round*. The player with the best Course Handicap that round has a Playing Handicap of
  0. Because Course Handicap depends on that round's specific course rating/slope, Playing
  Handicap is recalculated fresh for every round rather than fixed for the whole weekend.

### Hole Play Data (entered per player, per hole, per round — this is the new core workflow)
For each of the 18 holes, per player:
- Score (raw strokes taken on that hole)
- # of Putts on that hole
- # of Lost Balls on that hole
- # of Ladies Tees used on that hole (0 or 1, typically)

*Field naming note: this field is standardized as "Ladies Tees" throughout the app (data model,
labels, and admin config) — the spreadsheet had inconsistent variants ("Ladies Tee," "Ladies
Tee's," "Ladies Tees") across its tabs; the app should use one consistent name everywhere.*

**Hole Outcome (auto-calculated per hole, not entered):**
1. Determine if the player receives a stroke on this hole: compare the hole's Hole Handicap
   (1–18 difficulty rank) against the player's Course Handicap for that round. A player with
   Course Handicap ≥ the hole's Hole Handicap rank receives one stroke on that hole (if Course
   Handicap ≥ 18, every hole gets a stroke; if Course Handicap ≥ 36, every hole gets two strokes,
   and so on).
2. Apply the stroke(s) to the raw Score to get the player's net score for that hole.
3. Compare that net hole score to the hole's Par to classify the outcome: eagle (−2), birdie
   (−1), par (0), bogey (+1), triple-or-worse (+3 or more), etc.
4. This Hole Outcome feeds both the Golf Points table (eagle/birdie/par/bogey) and the Money
   Owed table (triples+).

*Putts and Lost Balls are tracked independently of Hole Outcome — putts feed the zero-putt/
one-putt Golf Points and the three-putt Money Owed line directly from the raw putt count, not
from the handicap-adjusted outcome.*

### Course Play Data (auto-calculated per player, per round, by summing that round's 18 holes)
- Total Score (sum of raw hole scores)
- Net Score (Total Score minus the player's Playing Handicap for that round)
- Total # of: Zero Putts, One Putts, Eagles, Birdies, Pars, Bogeys, Three Putts, Lost Balls,
  Ladies Tees, Triples+

*All of these were previously hand-calculated from paper scorecards and typed into the
spreadsheet as static numbers. In the app, they are 100% derived from the Hole Play Data — no
manual entry or manual math required.*

## Pointing and Payouts

**Per round:**
1. Calculate each player's Net Score for the round (from Hole Play Data, as above).
2. Rank players by Net Score (lowest wins) to assign Placement Points, applying the tie-break
   rule above.
3. Sum each player's Golf Points for the round (from hole outcomes and putts).
4. **Total Points (that round) = Placement Points + Golf Points.**
5. Sum each player's Money Owed for the round (three-putts, lost balls, ladies tees, triples+).
   Money Owed does **not** affect points or placement — it is tracked purely for the payout
   calculation below.

**For the weekend (after all three rounds):**
1. **Total Points (weekend) = sum of Total Points across all three rounds.** This determines
   final weekend ranking.
2. **Total Money Owed (weekend) = sum of Money Owed across all three rounds**, plus...
3. **Buy-in: $50 per player, for the entire weekend** (not per round — total pot = $50 × number
   of players).
4. **Total Pot = sum of all buy-ins + sum of all money owed across the weekend.**
5. Rank players by Total Points (weekend) to determine finishing order.
6. **Payout:**
   - 1st place: 50% of the Total Pot
   - 2nd place: 30% of the Total Pot
   - 3rd place: 20% of the Total Pot
   - 4th and lower: no share of the pot
7. **Net Earnings per player = (Payout, if any) − (that player's buy-in + money owed for the
   weekend).**

## UI Notes from Prototype Testing

The following came out of building and testing an interactive prototype, and should carry into
the real build:

- **Cart/group filtering on the entry screen.** Players should be able to filter the hole-entry
  view down to just their cart or group (2–4 players), while still being able to switch to an
  "all players" view. This keeps entry fast and reduces the chance of a scorer accidentally
  editing the wrong player's data.
- **Carts/groups are set per round, not fixed for the weekend.** Group1 is not not necessarily
  the same as Group2 or Group3 — carts commonly reshuffle between rounds. The app should let
  admins assign cart/group membership separately for each of the three rounds (with an easy way
  to copy the prior round's assignments as a starting point, since groups don't always change).
- **Round summary view should be a real breakdown, not just a leaderboard.** For each round,
  show a table with every player's Place, Net Score, Golf Points, Placement Points, Total
  Points, and Money Owed — not just a ranked list of totals.
- **Drill-down on golf points and money owed.** Tapping/selecting a player in the round summary
  should expand a detail view showing exactly how their Golf Points and Money Owed were built —
  each scoring/penalty category (e.g. birdies, one-putts, three-putts, ladies tees), the count for
  that round, the per-item value, and the resulting subtotal — not just the final numbers.
- **A weekend-level "Totals" view** (final naming: **Totals**, not "Weekend") that rolls up all
  three rounds per player: total points across the weekend, rounds played, money owed, and the
  calculated payout/net earnings based on final standing.

## Open Items Still Needed Before the Real Trip

- [ ] **Real course data for this year's three courses**: Course Name, Rating, Slope, Par, and
      all 18 Hole Handicaps + Hole Pars. Not needed to start building — the app will be built and
      tested against generic placeholder courses first, with course data fully editable by admins
      so this year's real courses can be entered whenever they're known (and updated again next
      year without a rebuild).
