# Build prompt for Claude Code — Mulligan Cup App

Copy everything below into Claude Code (in the terminal, VS Code, or the desktop app) to kick off
the build. It references the attached spec — keep `MulliganCup_Spec_v2.md` in the project folder
or paste its contents in alongside this prompt.

---

## Prompt

I want to build a mobile-friendly web app called **Mulligan Cup** for my husband's annual golf
trip. Full requirements are in `MulliganCup_Spec_v2.md` in this folder — read it in full before
writing any code. It contains the exact scoring formulas, tie-break rules, and payout math; follow
it literally rather than approximating.

**What the app does:** ~15 golfers play three rounds at three courses over a weekend. Currently
they enter scores on paper and calculate everything by hand in a spreadsheet. This app replaces
that: players enter scores **hole-by-hole** on their phones, and the app calculates strokes,
outcomes, points, money owed, and final payouts automatically.

### Stack and infrastructure

- Mobile-first responsive web app (works great on phones, usable on desktop).
- Use **Supabase** for the database and auth-free data storage — no login system needed since
  any player can view/edit any other player's data (see spec's Accessibility section). A shared
  Supabase project with row-level access open to anyone with the app link is fine for this
  group's use case.
- Real-time or near-real-time sync: when one cart enters a score, other players should see
  updated leaderboards without a manual refresh (Supabase's realtime subscriptions are a good
  fit).
- Deploy somewhere with a generous free tier (Vercel, Netlify, or similar) since this app is only
  actively used a few days a year — cost should be near-zero most of the year. Mention if
  Supabase's free tier is sufficient, or if usage patterns suggest a paid tier is safer.
- No native app needed — a well-built mobile web app (add-to-homescreen friendly) is sufficient.

### Data model

Build the schema directly from the spec's "Course Inputs," "Player Inputs," and "Game Inputs"
sections. Specifically:

- **Courses**: one per round (3 total per weekend), fully admin-editable — name, rating, slope,
  par, and 18 holes each with a hole handicap (1–18) and hole par. Ship with generic placeholder
  data ("Course 1," "Course 2," "Course 3" with reasonable example values) since real course data
  isn't known yet and changes every year — do not hardcode last year's course names.
- **Players**: name + handicap (raw input, no calculation).
- **Groups/carts**: assigned **per round**, not fixed for the weekend — the same player may be in
  a different cart in Round 2 than Round 1. Support an easy "copy previous round's groups" action
  since groups don't always change.
- **Hole Play Data**: per player, per hole, per round — Score, Putts, Lost Balls, Ladies Tees.
  This is the only data players manually enter; everything else derives from it.
- **Game Inputs config** (Golf Points values, Money Owed values, Placement Points values, buy-in
  amount): admin-only editable settings, not hardcoded constants, so the two admins (my husband
  and I) can adjust scoring rules year to year without a code change.

### Calculation engine

Implement exactly as described in the spec's "Player Inputs" and "Pointing and Payouts" sections:

1. Course Handicap via the standard USGA formula.
2. Playing Handicap, recalculated per round (lowest Course Handicap that round = 0).
3. Stroke allocation per hole based on Course Handicap vs. hole handicap rank.
4. Hole Outcome (eagle/birdie/par/bogey/triple+) from net score vs. hole par.
5. Golf Points and Money Owed, summed per round from hole-level data.
6. Net Score per round, placement ranking (lowest net score wins), with the tie-break rule:
   Net Score tie → higher Golf Points wins → still tied → split placement points evenly.
7. Total Points per round = Placement Points + Golf Points.
8. Weekend totals: sum of Total Points and Money Owed across all three rounds.
9. Payout: 50% / 30% / 20% of the total pot to 1st / 2nd / 3rd by weekend Total Points, pot =
   ($50 buy-in × player count) + all money owed across the weekend.
10. Net Earnings per player = payout (if any) − buy-in − that player's total money owed.

### UI — four main views

I already validated this flow and layout in a working prototype — match this structure and these
specific interaction patterns:

1. **Enter scores** — Round selector (Round 1/2/3) at top. A cart/group filter narrows the
   player list to just that round's cart, with an "all players" option to see everyone. Player
   selector, then hole navigator (1–18, with visual indication of which holes are already
   filled). Entry fields per hole: Score, Putts, Lost Balls, Ladies Tees. Show the calculated
   Hole Outcome and strokes-applied live as soon as a score is entered, so the scorer gets
   immediate feedback.

2. **Round** — Per-round breakdown table, not just a leaderboard. Columns: Place, Player, Net
   Score, Golf Points, Placement Points, Total Points, Money Owed. Tapping a player's row expands
   a drill-down showing exactly how their Golf Points and Money Owed were built — each category
   (e.g. "Birdies (3 × 3 pts) = 9", "Ladies Tees (2 × $5) = $10"), not just the totals.

3. **Totals** — Weekend-level rollup per player: total points across all three rounds, rounds
   played, total money owed, and calculated payout/net earnings based on final weekend standing.

4. **Setup** (admin-only, or at least clearly separated from player-facing views) — Course
   details per round (name, rating, slope, par, 18 holes' handicap/par), cart/group assignment
   per round, and player roster management (add/remove, edit handicap).

### Design

- Clean, mobile-first, easy to use one-handed standing on a golf course.
- Should feel fast — this replaces a manual spreadsheet process, so snappy hole-by-hole entry
  is the most important interaction to get right.
- No login/auth friction — anyone with the app link should be able to view and enter data
  immediately, per the spec's accessibility requirements.

### What to build first

1. Data model + Supabase schema.
2. Calculation engine as a well-tested, isolated module (this is the part most worth getting
   exactly right — consider unit tests against a few hand-calculated examples before wiring up
   the UI).
3. Enter scores view, wired to real data.
4. Round and Totals views.
5. Setup/admin view.
6. Real-time sync polish.

Ask me clarifying questions if anything in the spec is ambiguous, but don't guess on the scoring
formulas or tie-break logic — those are spelled out exactly in the spec document.
