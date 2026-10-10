-- Índices nas chaves estrangeiras apontadas pelo Supabase Advisor (performance).
create index if not exists assignments_giver_idx on public.assignments (giver_id);
create index if not exists assignments_receiver_idx on public.assignments (receiver_id);
create index if not exists exclusions_a_idx on public.exclusions (a);
create index if not exists exclusions_b_idx on public.exclusions (b);
create index if not exists groups_owner_user_idx on public.groups (owner_user_id);
create index if not exists groups_organization_idx on public.groups (organization_id);
create index if not exists nudges_group_idx on public.nudges (group_id);
create index if not exists nudges_from_participant_idx on public.nudges (from_participant_id);
create index if not exists nudges_to_participant_idx on public.nudges (to_participant_id);
create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists participants_user_idx on public.participants (user_id);
create index if not exists wish_items_product_idx on public.wish_items (product_id);
