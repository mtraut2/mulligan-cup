-- Feedback Round 1: replace the fixed 4-tier Placement Points columns with a
-- single jsonb array (one entry per place, sized to the player roster) so
-- Setup can show one editable field per place instead of a 1st/2nd/3rd/4th+
-- catch-all. Run this once in the Supabase SQL Editor against a project that
-- already has the original schema.sql applied. Safe to re-run.

alter table game_config add column if not exists placement_points jsonb;

update game_config
  set placement_points = to_jsonb(
    array[placement_first, placement_second, placement_third, placement_fourth_plus]
  )
  where placement_points is null;

alter table game_config alter column placement_points set not null;

alter table game_config drop column if exists placement_first;
alter table game_config drop column if exists placement_second;
alter table game_config drop column if exists placement_third;
alter table game_config drop column if exists placement_fourth_plus;
