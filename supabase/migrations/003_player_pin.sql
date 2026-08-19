-- Feedback Round 4, Item 2: per-player PIN, used to claim "which group is mine" on
-- Enter Scores while results are hidden. Text, not numeric, so a PIN like `0219`
-- doesn't lose its leading zero. Defaults to null for every existing player — an
-- admin must assign real PINs in Setup > Players before hidden mode is usable.
-- Run this once in the Supabase SQL Editor against a project that already has
-- schema.sql applied. Safe to re-run.

alter table players add column if not exists pin text;
