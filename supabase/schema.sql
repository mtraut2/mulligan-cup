-- Mulligan Cup schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- against a fresh Supabase project. Safe to re-run: everything is
-- `create ... if not exists` / `create or replace` except the seed inserts,
-- which are guarded by `on conflict do nothing`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handicap numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Rounds (one per course played that weekend) + their 18 holes
-- ---------------------------------------------------------------------
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  round_number int not null unique check (round_number between 1 and 3),
  course_name text not null,
  course_rating numeric not null,
  slope_rating numeric not null,
  course_par int not null,
  created_at timestamptz not null default now()
);

create table if not exists holes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  hole_handicap int not null check (hole_handicap between 1 and 18),
  hole_par int not null check (hole_par > 0),
  unique (round_id, hole_number)
);

-- ---------------------------------------------------------------------
-- Carts/groups — assigned per round, not fixed for the weekend
-- ---------------------------------------------------------------------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  unique (group_id, player_id)
);

-- ---------------------------------------------------------------------
-- Hole Play Data — the only table players write to directly during a round
-- ---------------------------------------------------------------------
create table if not exists hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  score int not null check (score > 0),
  putts int not null default 0 check (putts >= 0),
  lost_balls int not null default 0 check (lost_balls >= 0),
  ladies_tees int not null default 0 check (ladies_tees >= 0),
  updated_at timestamptz not null default now(),
  unique (round_id, player_id, hole_number)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hole_scores_set_updated_at on hole_scores;
create trigger hole_scores_set_updated_at
  before update on hole_scores
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Game config — single-row table of admin-editable scoring values
-- ---------------------------------------------------------------------
create table if not exists game_config (
  id smallint primary key default 1 check (id = 1),
  golf_zero_putt numeric not null default 3,
  golf_one_putt numeric not null default 1,
  golf_eagle numeric not null default 4,
  golf_birdie numeric not null default 3,
  golf_par numeric not null default 2,
  golf_bogey numeric not null default 1,
  money_three_putt numeric not null default 1,
  money_lost_ball numeric not null default 1,
  money_ladies_tee numeric not null default 5,
  money_triple_plus numeric not null default 1,
  placement_first numeric not null default 16,
  placement_second numeric not null default 14,
  placement_third numeric not null default 12,
  placement_fourth_plus numeric not null default 10,
  buy_in numeric not null default 50,
  admin_passcode text not null default '1234',
  updated_at timestamptz not null default now()
);

drop trigger if exists game_config_set_updated_at on game_config;
create trigger game_config_set_updated_at
  before update on game_config
  for each row execute function set_updated_at();

insert into game_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Row-level security — the app has no login: any player can view or edit
-- any other player's data (see spec's Accessibility section), so policies
-- are intentionally wide open for the anon key. This is fine for a small
-- private group app shared only via a direct link.
-- ---------------------------------------------------------------------
alter table players enable row level security;
alter table rounds enable row level security;
alter table holes enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table hole_scores enable row level security;
alter table game_config enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['players','rounds','holes','groups','group_members','hole_scores','game_config']
  loop
    execute format('drop policy if exists "open_select" on %I', t);
    execute format('create policy "open_select" on %I for select using (true)', t);
    execute format('drop policy if exists "open_insert" on %I', t);
    execute format('create policy "open_insert" on %I for insert with check (true)', t);
    execute format('drop policy if exists "open_update" on %I', t);
    execute format('create policy "open_update" on %I for update using (true) with check (true)', t);
    execute format('drop policy if exists "open_delete" on %I', t);
    execute format('create policy "open_delete" on %I for delete using (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Realtime — so other phones see updates without a manual refresh
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table hole_scores;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table groups;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table group_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table rounds;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table holes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table game_config;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- Seed: 3 placeholder rounds/courses with example rating/slope/par/hole
-- data, so the app is fully usable before real course data is known.
-- Do NOT put real course names here — admins edit these in Setup each year.
-- ---------------------------------------------------------------------
insert into rounds (round_number, course_name, course_rating, slope_rating, course_par)
values
  (1, 'Course 1', 71.5, 128, 72),
  (2, 'Course 2', 70.8, 122, 72),
  (3, 'Course 3', 72.1, 131, 72)
on conflict (round_number) do nothing;

-- Generic 18-hole layout (par 72, standard 4/4/4/3/5 hole-handicap-style
-- distribution) applied to all 3 placeholder rounds as example data.
do $$
declare
  r record;
  hole_pars int[] := array[4,4,3,5,4,4,3,5,4, 4,4,3,5,4,4,3,5,4];
  hole_handicaps int[] := array[7,1,15,5,3,11,17,9,13, 8,2,16,6,4,12,18,10,14];
  i int;
begin
  for r in select id from rounds loop
    for i in 1..18 loop
      insert into holes (round_id, hole_number, hole_handicap, hole_par)
      values (r.id, i, hole_handicaps[i], hole_pars[i])
      on conflict (round_id, hole_number) do nothing;
    end loop;
  end loop;
end $$;
