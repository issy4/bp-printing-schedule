-- 印刷機 × 日付 × 勤務区分単位の備考
-- 印刷スケジュール用SupabaseのSQL Editorで実行してください
create table if not exists public.schedule_cell_memos (
  machine_id uuid not null references public.machines(id) on delete cascade,
  scheduled_date date not null,
  shift_category text not null check (shift_category in ('day', 'night')),
  memo text not null default '' check (char_length(memo) <= 2000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (machine_id, scheduled_date, shift_category)
);

create index if not exists schedule_cell_memos_date_idx
  on public.schedule_cell_memos(scheduled_date);

alter table public.schedule_cell_memos enable row level security;

grant select, insert, update on public.schedule_cell_memos to authenticated;

-- ログインした社員がセル備考を参照・編集
create policy "schedule cell memo read"
  on public.schedule_cell_memos for select to authenticated
  using (true);

create policy "schedule cell memo insert"
  on public.schedule_cell_memos for insert to authenticated
  with check (updated_by = (select auth.uid()));

create policy "schedule cell memo update"
  on public.schedule_cell_memos for update to authenticated
  using (true)
  with check (updated_by = (select auth.uid()));
