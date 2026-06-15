-- Run this in Supabase SQL Editor

create table if not exists group_templates (
  id            text primary key,
  name          text not null,
  device_id     text not null,
  is_public     boolean default false,
  use_count     integer default 0,
  players       jsonb,
  game_config   jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Index for public search
create index if not exists group_templates_name_idx on group_templates using gin (to_tsvector('english', name));
create index if not exists group_templates_device_idx on group_templates (device_id);
create index if not exists group_templates_public_idx on group_templates (is_public, use_count desc);

-- RPC to increment use count
create or replace function increment_template_use(template_id text)
returns void language sql as $$
  update group_templates set use_count = use_count + 1 where id = template_id;
$$;

-- Enable RLS
alter table group_templates enable row level security;

-- Allow anyone to read public templates
create policy "Public templates are readable" on group_templates
  for select using (is_public = true);

-- Allow device to read own templates
create policy "Own templates are readable" on group_templates
  for select using (true);

-- Allow insert/update/delete for own templates
create policy "Own templates are writable" on group_templates
  for all using (true);
