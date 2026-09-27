-- ============================================================================
-- Perimetrr v1.0.0 — clean-slate, multi-tenant production schema
-- Run in the Supabase SQL Editor on a new project. No legacy data is assumed.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists postgis;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- A customer workspace. Billing/reseller controls deliberately remain out of v1.
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 128),
  short_name text not null default '' check (char_length(short_name) between 2 and 16),
  workspace_code text not null unique check (workspace_code ~ '^[A-Z]{4}-[0-9]{4}$'),
  slug text,
  brand_color text not null default '#39FF88' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'team', 'enterprise', 'white_label')),
  subscription_status text not null default 'active' check (subscription_status in ('active', 'trialing', 'suspended')),
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Offices are a core model, not a Watch Tower-only feature. Every tenant starts
-- with one office; enterprise adds more. Watch Tower later aggregates tenants/offices.
create table public.offices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 128), address text,
  location geography(point, 4326) not null,
  radius_meters integer not null default 100 check (radius_meters between 25 and 5000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index offices_tenant_idx on public.offices (tenant_id) where is_active;
create index offices_location_gix on public.offices using gist (location);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  office_id uuid references public.offices(id) on delete set null,
  name text not null check (char_length(name) between 2 and 128), department text not null default 'General',
  is_team_lead boolean not null default false,
  schedule_policy text not null default 'office' check (schedule_policy in ('office', 'weekly_hybrid', 'remote', 'leave')),
  include_in_reports boolean not null default true,
  device_id uuid unique, device_bound_at timestamptz, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);
create index staff_tenant_active_idx on public.staff (tenant_id, name) where is_active;

-- Append-only presence ledger. Location is measured only at the attendance event.
create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  office_id uuid references public.offices(id) on delete set null,
  staff_id uuid not null references public.staff(id) on delete restrict,
  event_type text not null check (event_type in ('in', 'out')),
  status text not null check (status in ('on_site', 'late', 'remote', 'outside_perimeter', 'rejected', 'provisional_transfer')),
  occurred_at timestamptz not null default now(), distance_meters numeric(10,2),
  verification_method text not null default 'device_perimeter' check (verification_method in ('device_perimeter', 'admin_override')),
  created_at timestamptz not null default now()
);
create index attendance_tenant_time_idx on public.attendance_logs (tenant_id, occurred_at desc);
create index attendance_staff_time_idx on public.attendance_logs (staff_id, occurred_at desc);

create table public.hybrid_schedules (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1), schedule_data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (tenant_id, week_start)
);

create table public.device_transfer_requests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade, requested_device_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(), resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  unique nulls not distinct (staff_id, status)
);

-- A user can administer one or more tenants. Never store passwords or hashes here.
create table public.tenant_admins (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'manager')),
  created_at timestamptz not null default now(), primary key (tenant_id, user_id)
);

create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenant_admins where tenant_id = p_tenant_id and user_id = auth.uid());
$$;

alter table public.tenants enable row level security;
alter table public.offices enable row level security;
alter table public.staff enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.hybrid_schedules enable row level security;
alter table public.device_transfer_requests enable row level security;
alter table public.tenant_admins enable row level security;

create policy "Admins manage their tenant" on public.tenants for all to authenticated using (public.is_tenant_admin(id)) with check (public.is_tenant_admin(id));
create policy "Admins manage offices" on public.offices for all to authenticated using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "Admins manage staff" on public.staff for all to authenticated using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "Admins read attendance" on public.attendance_logs for select to authenticated using (public.is_tenant_admin(tenant_id));
create policy "Admins manage schedules" on public.hybrid_schedules for all to authenticated using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "Admins manage transfer requests" on public.device_transfer_requests for all to authenticated using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "Admins see their roles" on public.tenant_admins for select to authenticated using (user_id = auth.uid());

-- Public, deliberately minimal pairing endpoint. It returns no email, device, or admin data.
create or replace function public.get_workspace_for_pairing(p_workspace_code text)
returns table (tenant_id uuid, slug text, tenant_name text, workspace_code text, brand_color text, logo_url text)
language sql security definer set search_path = public as $$
  select id, slug, name, workspace_code, brand_color, logo_url from public.tenants
  where workspace_code = upper(trim(p_workspace_code)) and subscription_status = 'active';
$$;

create or replace function public.get_workspace_staff(p_workspace_code text)
returns table (id uuid, name text, dept text, is_team_lead boolean, schedule_policy text)
language sql security definer set search_path = public as $$
  select s.id, s.name, s.department, s.is_team_lead, s.schedule_policy
  from public.staff s join public.tenants t on t.id = s.tenant_id
  where t.workspace_code = upper(trim(p_workspace_code)) and t.subscription_status = 'active' and s.is_active
  order by s.name;
$$;

-- A device can bind itself once. Staff cannot remove or replace the binding; an
-- authenticated tenant admin handles transfers through the Command Center.
create or replace function public.bind_staff_device(p_staff_id uuid, p_device_id uuid)
returns table (ok boolean, message text)
language plpgsql security definer set search_path = public as $$
declare v_existing uuid;
begin
  select device_id into v_existing from public.staff where id = p_staff_id and is_active for update;
  if not found then return query select false, 'Staff profile is unavailable.'; return; end if;
  if v_existing is not null and v_existing <> p_device_id then return query select false, 'This staff profile is already linked to another device.'; return; end if;
  if exists (select 1 from public.staff where device_id = p_device_id and id <> p_staff_id) then
    return query select false, 'This device is already linked to another staff profile.'; return;
  end if;
  update public.staff set device_id = p_device_id, device_bound_at = coalesce(device_bound_at, now()) where id = p_staff_id;
  return query select true, 'Device linked successfully.';
end;
$$;

create or replace function public.verify_staff_device(p_staff_id uuid, p_device_id uuid)
returns table (ok boolean, message text)
language sql security definer set search_path = public as $$
  select (device_id = p_device_id), case when device_id = p_device_id then 'Device verified.' else 'This device is not linked to this staff profile.' end
  from public.staff where id = p_staff_id and is_active;
$$;

create or replace function public.create_workspace(
  p_name text, p_slug text, p_workspace_code text, p_brand_color text, p_logo_url text,
  p_office_name text, p_latitude double precision, p_longitude double precision,
  p_radius_meters integer, p_plan_tier text, p_timezone text default 'Africa/Lagos'
) returns public.tenants
language plpgsql security definer set search_path = public as $$
declare v_tenant public.tenants; v_office_id uuid;
begin
  if auth.uid() is null then raise exception 'An authenticated administrator is required.'; end if;
  insert into public.tenants (name, slug, workspace_code, brand_color, logo_url, plan_tier, timezone)
  values (p_name, p_slug, upper(p_workspace_code), coalesce(p_brand_color, '#39FF88'), nullif(p_logo_url, ''), p_plan_tier, p_timezone)
  returning * into v_tenant;
  insert into public.offices (tenant_id, name, location, radius_meters)
  values (v_tenant.id, p_office_name, st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography, p_radius_meters)
  returning id into v_office_id;
  insert into public.tenant_admins (tenant_id, user_id, role) values (v_tenant.id, auth.uid(), 'owner');
  return v_tenant;
end;
$$;

-- Attendance is processed server-side so the browser never decides whether it is in range.
create or replace function public.record_attendance(
  p_staff_id uuid, p_device_id uuid, p_event_type text, p_latitude double precision, p_longitude double precision
) returns table (ok boolean, status text, message text, distance_meters numeric)
language plpgsql security definer set search_path = public as $$
declare 
  v_staff public.staff%rowtype; 
  v_office public.offices%rowtype; 
  v_distance numeric;
  v_has_pending boolean := false;
  v_is_provisional boolean := false;
begin
  select * into v_staff from public.staff where id = p_staff_id and is_active;
  if not found then return query select false, 'rejected', 'Staff profile is unavailable.', null::numeric; return; end if;

  if v_staff.device_id is distinct from p_device_id then
    select exists (
      select 1 from public.device_transfer_requests dtr
      where dtr.staff_id = p_staff_id and dtr.requested_device_id = p_device_id and dtr.status = 'pending'
    ) into v_has_pending;

    if not v_has_pending then
      return query select false, 'rejected', 'This device is not linked to this staff profile.', null::numeric;
      return;
    end if;
    v_is_provisional := true;
  end if;

  select * into v_office from public.offices where id = v_staff.office_id and is_active;
  if not found then return query select false, 'rejected', 'No active office is assigned.', null::numeric; return; end if;

  v_distance := st_distance(v_office.location, st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography);
  if v_distance > v_office.radius_meters then
    insert into public.attendance_logs (tenant_id, office_id, staff_id, event_type, status, distance_meters)
    values (v_staff.tenant_id, v_office.id, v_staff.id, lower(p_event_type), 'outside_perimeter', v_distance);
    return query select false, 'outside_perimeter', 'You are outside your office Perimeter.', v_distance; 
    return;
  end if;

  if v_is_provisional then
    insert into public.attendance_logs (tenant_id, office_id, staff_id, event_type, status, distance_meters)
    values (v_staff.tenant_id, v_office.id, v_staff.id, lower(p_event_type), 'provisional_transfer', v_distance);
    return query select true, 'provisional_transfer', 'Presence verified inside the Perimeter (Pending Device Transfer).', v_distance;
  else
    insert into public.attendance_logs (tenant_id, office_id, staff_id, event_type, status, distance_meters)
    values (v_staff.tenant_id, v_office.id, v_staff.id, lower(p_event_type), 'on_site', v_distance);
    return query select true, 'on_site', 'Presence verified inside the Perimeter.', v_distance;
  end if;
end;
$$;

create or replace function public.get_fleet_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tenants_count int;
  v_offices_count int;
  v_staff_count int;
  v_checkins_today int;
  v_recent_tenants jsonb;
begin
  select count(*) into v_tenants_count from public.tenants;
  select count(*) into v_offices_count from public.offices where is_active;
  select count(*) into v_staff_count from public.staff where is_active;
  select count(*) into v_checkins_today from public.attendance_logs
    where occurred_at >= (current_date at time zone 'UTC');

  select jsonb_agg(t_sub) into v_recent_tenants from (
    select t.id, t.name, t.slug, t.workspace_code, t.plan_tier, t.subscription_status,
           t.brand_color, t.logo_url, t.created_at,
           count(distinct o.id) as office_count,
           count(distinct s.id) as staff_count
    from public.tenants t
    left join public.offices o on o.tenant_id = t.id and o.is_active
    left join public.staff s on s.tenant_id = t.id and s.is_active
    group by t.id
    order by t.created_at desc
    limit 50
  ) t_sub;

  return jsonb_build_object(
    'tenants_count', coalesce(v_tenants_count, 0),
    'offices_count', coalesce(v_offices_count, 0),
    'staff_count', coalesce(v_staff_count, 0),
    'checkins_today', coalesce(v_checkins_today, 0),
    'tenants', coalesce(v_recent_tenants, '[]'::jsonb)
  );
end;
$$;

create trigger tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger offices_updated_at before update on public.offices for each row execute function public.set_updated_at();
create trigger staff_updated_at before update on public.staff for each row execute function public.set_updated_at();
create trigger schedules_updated_at before update on public.hybrid_schedules for each row execute function public.set_updated_at();

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on public.tenants, public.offices, public.staff, public.attendance_logs, public.hybrid_schedules, public.device_transfer_requests, public.tenant_admins to authenticated;
grant insert, update, delete on public.tenants, public.offices, public.staff, public.hybrid_schedules, public.device_transfer_requests to authenticated;
grant execute on function public.get_workspace_for_pairing(text), public.get_workspace_staff(text), public.bind_staff_device(uuid, uuid), public.verify_staff_device(uuid, uuid), public.record_attendance(uuid, uuid, text, double precision, double precision), public.get_fleet_overview() to anon, authenticated;
grant execute on function public.create_workspace(text, text, text, text, text, text, double precision, double precision, integer, text, text) to authenticated;

-- Roadmap: Push Subscriptions & Team Lead / Device Transfer RPCs
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (tenant_id, subscription)
);

alter table public.push_subscriptions enable row level security;
create policy "Admins manage push subscriptions" on public.push_subscriptions for all to authenticated using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "Anyone can register push subscriptions" on public.push_subscriptions for insert to anon, authenticated with check (true);
grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;

grant execute on function public.request_device_transfer(uuid, uuid), 
  public.approve_device_transfer_by_lead(uuid, text, uuid, uuid),
  public.get_pending_transfers_for_lead(uuid, uuid),
  public.admin_resolve_device_transfer(uuid, text),
  public.get_workspace_config(text),
  public.manage_tenant_staff(text, text, jsonb)
to anon, authenticated;


