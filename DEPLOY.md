# Deploying Mulligan Cup

## What's already done

- Supabase project created at `https://prgxygscogwqbkenqxxx.supabase.co`.
- Schema (`supabase/schema.sql`) has been run — all 7 tables exist, RLS policies are
  open (no login needed, per the spec), Realtime is enabled, and 3 placeholder
  rounds/courses are seeded.
- `.env.local` is set up for local development (gitignored — never commit it).
- Three test players and a full Round 1 of scores were entered live to verify the
  math end-to-end. **Delete that test data before the real trip** — see "Reset
  before each trip" below.

## 1. Push the code to GitHub

```bash
git remote add origin https://github.com/<your-username>/mulligan-cup.git
git push -u origin master
```

(Create the empty repo on GitHub first if you haven't — no README/license, since
this repo already has commits.)

## 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign in (GitHub login is easiest), click
   **Add New → Project**, and import the `mulligan-cup` repo.
2. Vercel auto-detects Next.js — leave the build settings as default.
3. Before clicking Deploy, add two **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://prgxygscogwqbkenqxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable key from Supabase
     (Project Settings → API Keys — the same one in your local `.env.local`)
4. Click **Deploy**. You'll get a URL like `mulligan-cup-xyz.vercel.app` —
   that's the link to share with the group (text it, or add to a group chat).

Every future `git push` to `master` auto-redeploys. To use a custom domain,
add it under the Vercel project's **Domains** tab (optional).

## 3. Add to homescreen (each player, once)

On the golf trip, each player opens the Vercel link on their phone and uses their
browser's "Add to Home Screen" option (Safari: Share → Add to Home Screen; Chrome:
⋮ menu → Add to Home Screen). It'll behave like a regular app icon from then on.

## 4. Reset before each trip

Since courses, groups, and scores change every year but players and scoring rules
mostly don't, do a light reset rather than recreating the project:

1. In Setup → Courses, update each round's course name/rating/slope/par and all
   18 holes to that year's actual courses (replace the placeholder data).
2. In Setup → Groups, clear out last year's carts and set up fresh ones per round
   (or leave them — Groups are scoped per round, so old ones don't carry over
   automatically).
3. Clear old hole scores so last year's numbers don't linger. Easiest way: run
   this in the Supabase SQL Editor right before the trip:
   ```sql
   delete from hole_scores;
   ```
   (Leaves players, rounds/courses, and config alone — just wipes entered scores.
   Re-run the Groups step above too if you want a clean slate on carts:
   `delete from groups;` cascades and removes group_members too.)
4. Update player handicaps in Setup → Players if they've changed since last year.
5. Consider changing the admin passcode (Setup → Scoring → Admin Passcode) from
   the default `1234`.

## 5. Cost

Both Supabase's free tier and Vercel's Hobby tier are $0/month and comfortably
cover this app's scale (15 players × 3 rounds × 18 holes is a tiny amount of
data and traffic) — there's no paid tier to "turn on" for the trip.

The one thing to know: **Supabase free-tier projects auto-pause after 7 days of
inactivity.** If the project has been idle since last year, open the Supabase
dashboard before the trip — if it shows as paused, click **Restore project**
(takes about 2 minutes) before players start using the app. This is the natural
"off switch" the spec asked for — it costs nothing while paused and needs one
click to resume.
