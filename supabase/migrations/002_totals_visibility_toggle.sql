-- Feedback Round 2, Item 4: admin-controlled toggle to hide/show the Totals view's
-- real content (the Totals tab itself always stays in the bottom nav). Run this once
-- in the Supabase SQL Editor against a project that already has schema.sql applied.
-- Safe to re-run.

alter table game_config
  add column if not exists totals_visible boolean not null default true;
