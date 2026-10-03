-- Perimetrr organization isolation and auditable device transfers.
-- Reviewed source. Apply through the private management tool; never publish SQL.
begin;

create schema if not exists perimetrr_private;
revoke all on schema perimetrr_private from public, anon, authenticated;

create table if not exists public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 2 and 128),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table if not exists public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin')),
 granted_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key (organization_id,user_id)
);
create index if not exists organization_members_user_idx on public.organization_members(user_id,organization_id);
alter table public.tenants add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
create index if not exists tenants_organization_idx on public.tenants(organization_id) where organization_id is not null;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
revoke all on public.organizations, public.organization_members from anon, authenticated;
grant select on public.organizations, public.organization_members to authenticated;

create or replace function public.is_organization_admin(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.organization_members m
  where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.role in ('owner','admin')
 );
$$;
create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (
  exists (select 1 from public.tenant_admins a where a.tenant_id=p_tenant_id and a.user_id=auth.uid())
  or exists (select 1 from public.tenants t join public.organization_members m on m.organization_id=t.organization_id
             where t.id=p_tenant_id and m.user_id=auth.uid() and m.role in ('owner','admin'))
 );
$$;
drop policy if exists "Organization members read organization" on public.organizations;
create policy "Organization members read organization" on public.organizations for select to authenticated
 using (public.is_organization_admin(id));
drop policy if exists "Organization members read memberships" on public.organization_members;
create policy "Organization members read memberships" on public.organization_members for select to authenticated
 using (public.is_organization_admin(organization_id));

-- Branch ownership and paid entitlement cannot be rewritten through a browser table update.
revoke insert, update, delete on public.tenants from anon, authenticated;
grant update(name,short_name,brand_color,logo_url,timezone) on public.tenants to authenticated;
revoke insert, update, delete on public.device_transfer_requests from anon, authenticated;
-- No push-delivery enrollment service exists in this release. Do not accept spoofed subscriptions.
revoke insert, update, delete on public.push_subscriptions from anon, authenticated;

create or replace function public.get_admin_workspaces()
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('role',coalesce(a.role,'admin'),'tenants',to_jsonb(t)) order by t.name),'[]'::jsonb)
 from public.tenants t left join public.tenant_admins a on a.tenant_id=t.id and a.user_id=auth.uid()
 where public.is_tenant_admin(t.id);
$$;
create or replace function public.get_my_organizations()
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'role',m.role) order by o.name),'[]'::jsonb)
 from public.organizations o join public.organization_members m on m.organization_id=o.id where m.user_id=auth.uid();
$$;
create or replace function public.create_enterprise_organization(p_name text,p_existing_tenant_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_existing uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to create an organization.' using errcode='42501'; end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 128 then raise exception 'Organization name must be 2–128 characters.'; end if;
 if p_existing_tenant_id is not null then
  select organization_id into v_existing from public.tenants where id=p_existing_tenant_id for update;
  if not found or not exists(select 1 from public.tenant_admins where tenant_id=p_existing_tenant_id and user_id=auth.uid() and role='owner') then
   raise exception 'Only the workspace owner can attach this branch.' using errcode='42501';
  end if;
  if v_existing is not null then raise exception 'This workspace already belongs to an organization.'; end if;
 end if;
 insert into public.organizations(name,created_by) values(trim(p_name),auth.uid()) returning id into v_id;
 insert into public.organization_members(organization_id,user_id,role,granted_by) values(v_id,auth.uid(),'owner',auth.uid());
 if p_existing_tenant_id is not null then update public.tenants set organization_id=v_id where id=p_existing_tenant_id; end if;
 return jsonb_build_object('ok',true,'organization_id',v_id);
end;
$$;
create or replace function public.attach_organization_workspace(p_organization_id uuid,p_tenant_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_existing uuid;
begin
 if not public.is_organization_admin(p_organization_id) then raise exception 'Organization administrator required.' using errcode='42501'; end if;
 select organization_id into v_existing from public.tenants where id=p_tenant_id for update;
 if not found or not exists(select 1 from public.tenant_admins where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then
  raise exception 'Only the workspace owner can attach this branch.' using errcode='42501';
 end if;
 if v_existing is not null and v_existing<>p_organization_id then raise exception 'This workspace already belongs to another organization.'; end if;
 update public.tenants set organization_id=p_organization_id where id=p_tenant_id;
 return jsonb_build_object('ok',true);
end;
$$;
-- Same provisioning path for a standalone workspace and an organization branch.
-- A selected label is not proof of payment: paid entitlements are never self-assigned.
create or replace function public.create_workspace(p_name text,p_slug text,p_workspace_code text,p_brand_color text,p_logo_url text,p_office_name text,p_latitude double precision,p_longitude double precision,p_radius_meters integer,p_plan_tier text,p_timezone text default 'Africa/Lagos')
returns public.tenants language plpgsql security definer set search_path = '' as $$
declare v_tenant public.tenants; v_code text; v_slug text; v_bytes bytea;
begin
 if auth.uid() is null then raise exception 'An authenticated administrator is required.' using errcode='42501'; end if;
 if p_latitude is null or p_longitude is null or not (p_latitude between -90 and 90) or not (p_longitude between -180 and 180) then raise exception 'Valid office coordinates required.'; end if;
 if p_radius_meters is null or p_radius_meters not between 25 and 5000 then raise exception 'Perimeter radius must be 25–5000 metres.'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Invalid workspace timezone.'; end if;
 v_bytes:=extensions.gen_random_bytes(8);
 v_code:=chr(65+get_byte(v_bytes,0)%26)||chr(65+get_byte(v_bytes,1)%26)||chr(65+get_byte(v_bytes,2)%26)||chr(65+get_byte(v_bytes,3)%26)||'-'||
  lpad((('x'||encode(substring(v_bytes from 5 for 4),'hex'))::bit(32)::bigint%10000)::text,4,'0');
 v_slug:=lower(v_code);
 -- Supplied legacy pairing codes are not trusted as authorization or entitlement.
 insert into public.tenants(name,slug,workspace_code,brand_color,logo_url,plan_tier,timezone)
 values(trim(p_name),v_slug,v_code,coalesce(p_brand_color,'#39FF88'),nullif(p_logo_url,''),'free',p_timezone) returning * into v_tenant;
 insert into public.offices(tenant_id,name,location,radius_meters)
 values(v_tenant.id,trim(p_office_name),public.st_setsrid(public.st_makepoint(p_longitude,p_latitude),4326)::public.geography,p_radius_meters);
 insert into public.tenant_admins(tenant_id,user_id,role) values(v_tenant.id,auth.uid(),'owner');
 return v_tenant;
end;
$$;
create or replace function public.create_organization_workspace(p_organization_id uuid,p_name text,p_office_name text,p_latitude double precision,p_longitude double precision,p_radius_meters integer,p_timezone text default 'Africa/Lagos')
returns public.tenants language plpgsql security definer set search_path = '' as $$
declare v_tenant public.tenants;
begin
 if not public.is_organization_admin(p_organization_id) then raise exception 'Organization administrator required.' using errcode='42501'; end if;
 v_tenant:=public.create_workspace(p_name,null,null,'#39FF88','',p_office_name,p_latitude,p_longitude,p_radius_meters,'free',p_timezone);
 update public.tenants set organization_id=p_organization_id where id=v_tenant.id returning * into v_tenant;
 return v_tenant;
end;
$$;
create or replace function public.get_organization_overview(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_workspaces jsonb; v_members jsonb; v_name text; v_role text;
begin
 if not public.is_organization_admin(p_organization_id) then raise exception 'Access to this organization is not authorized.' using errcode='42501'; end if;
 select o.name,m.role into v_name,v_role from public.organizations o join public.organization_members m on m.organization_id=o.id
  where o.id=p_organization_id and m.user_id=auth.uid();
 select coalesce(jsonb_agg(to_jsonb(q) order by q.name),'[]'::jsonb) into v_workspaces from (
  select t.id,t.name,t.short_name,t.slug,t.workspace_code,t.plan_tier,t.subscription_status,t.timezone,
   (select count(*) from public.offices o where o.tenant_id=t.id and o.is_active) as office_count,
   (select count(*) from public.staff s where s.tenant_id=t.id and s.is_active) as staff_count,
   (select count(*) from public.device_transfer_requests r where r.tenant_id=t.id and r.status='pending') as pending_transfers,
   (select count(*) from (select distinct on(l.staff_id) l.event_type from public.attendance_logs l
     where l.tenant_id=t.id and l.status in ('on_site','late','remote','provisional_transfer')
      and l.occurred_at>=date_trunc('day',now() at time zone t.timezone) at time zone t.timezone
     order by l.staff_id,l.occurred_at desc,l.created_at desc,l.id desc) a where a.event_type='in') as present_today,
   (select count(*) from public.attendance_logs l where l.tenant_id=t.id and l.status='provisional_transfer') as provisional_records
  from public.tenants t where t.organization_id=p_organization_id
 ) q;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role) order by m.created_at),'[]'::jsonb)
 into v_members from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=p_organization_id;
 return jsonb_build_object('organization',jsonb_build_object('id',p_organization_id,'name',v_name,'role',v_role),'workspaces',v_workspaces,'members',v_members);
end;
$$;
create or replace function public.manage_organization_member(p_organization_id uuid,p_email text,p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_role text;
begin
 -- Serialize membership mutations; owners cannot be removed by this operation.
 perform 1 from public.organizations where id=p_organization_id for update;
 if not exists(select 1 from public.organization_members where organization_id=p_organization_id and user_id=auth.uid() and role='owner') then
  raise exception 'Only the organization owner can authorize personnel.' using errcode='42501';
 end if;
 if p_action is null or p_action not in ('grant','revoke') then raise exception 'Invalid membership action.'; end if;
 select id into v_user_id from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if v_user_id is null then raise exception 'Use a confirmed Perimetrr account email. Ask the person to register and confirm their email first.'; end if;
 select role into v_role from public.organization_members where organization_id=p_organization_id and user_id=v_user_id;
 if v_role='owner' then raise exception 'The organization owner cannot be changed here.'; end if;
 if p_action='grant' then
  insert into public.organization_members(organization_id,user_id,role,granted_by) values(p_organization_id,v_user_id,'admin',auth.uid())
  on conflict(organization_id,user_id) do nothing;
 else delete from public.organization_members where organization_id=p_organization_id and user_id=v_user_id and role='admin'; end if;
 return jsonb_build_object('ok',true);
end;
$$;

-- Remove the old all-platform dashboard API. Compatibility calls are organization-scoped.
create or replace function public.get_fleet_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_ids uuid[];
begin
 select array_agg(organization_id) into v_ids from public.organization_members where user_id=auth.uid();
 if coalesce(array_length(v_ids,1),0)<>1 then raise exception 'Select an authorized organization in Watch Tower.' using errcode='42501'; end if;
 return public.get_organization_overview(v_ids[1]);
end;
$$;

-- Every request remains in history. Only one pending request per employee is allowed.
alter table public.device_transfer_requests drop constraint if exists device_transfer_requests_staff_id_status_key;
create unique index if not exists device_transfer_one_pending_idx on public.device_transfer_requests(staff_id) where status='pending';
alter table public.device_transfer_requests add column if not exists previous_device_id uuid;
alter table public.device_transfer_requests add column if not exists expires_at timestamptz not null default now()+interval '24 hours';
alter table public.device_transfer_requests add column if not exists approval_attempts integer not null default 0;
alter table public.device_transfer_requests add column if not exists resolution_reason text;
alter table public.attendance_logs add column if not exists transfer_request_id uuid references public.device_transfer_requests(id) on delete restrict;
alter table public.attendance_logs add column if not exists original_status text;
alter table public.attendance_logs add column if not exists transfer_resolved_at timestamptz;
create index if not exists attendance_transfer_idx on public.attendance_logs(transfer_request_id) where transfer_request_id is not null;

create or replace function perimetrr_private.resolve_transfer(p_request_id uuid,p_action text,p_lead_id uuid default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_request public.device_transfer_requests%rowtype; v_staff public.staff%rowtype; v_staff_id uuid; v_count integer;
begin
 -- All attendance/request/approval operations lock staff before the transfer row.
 select staff_id into v_staff_id from public.device_transfer_requests where id=p_request_id;
 select * into v_staff from public.staff where id=v_staff_id for update;
 select * into v_request from public.device_transfer_requests where id=p_request_id for update;
 if not found or v_request.tenant_id is distinct from v_staff.tenant_id then return jsonb_build_object('ok',false,'message','Transfer request unavailable.'); end if;
 if p_action is null or p_action not in ('approve','reject') then raise exception 'Invalid transfer action.'; end if;
 if v_request.status<>'pending' then return jsonb_build_object('ok',false,'message','This request has already been resolved.'); end if;
 if p_action='approve' then
  if v_request.expires_at<=now() then return jsonb_build_object('ok',false,'message','This request has expired. Request a new transfer.'); end if;
  if not v_staff.is_active or v_staff.device_id is distinct from v_request.previous_device_id then
   return jsonb_build_object('ok',false,'message','The staff device changed since this request. Reject it and request a new transfer.');
  end if;
  if exists(select 1 from public.staff where device_id=v_request.requested_device_id and id<>v_staff.id) then
   return jsonb_build_object('ok',false,'message','The requested device is linked to another staff profile.');
  end if;
  update public.staff set device_id=v_request.requested_device_id,device_bound_at=now() where id=v_staff.id;
 end if;
 update public.device_transfer_requests set status=case when p_action='approve' then 'approved' else 'rejected' end,
  resolved_at=now(),resolved_by=auth.uid(),resolved_by_staff_id=p_lead_id,resolution_reason=p_reason where id=p_request_id;
 update public.attendance_logs set status=case when p_action='approve' then 'on_site' else 'rejected' end,
  original_status=coalesce(original_status,'provisional_transfer'),transfer_resolved_at=now()
 where transfer_request_id=p_request_id and tenant_id=v_request.tenant_id and staff_id=v_request.staff_id and status='provisional_transfer';
 get diagnostics v_count=row_count;
 return jsonb_build_object('ok',true,'reconciled_records',v_count,'message',case when p_action='approve'
  then 'Transfer approved. Provisional attendance reconciled.' else 'Transfer rejected. Related provisional attendance was rejected.' end);
exception when unique_violation then return jsonb_build_object('ok',false,'message','The requested device is already linked to another profile.');
end;
$$;
revoke all on function perimetrr_private.resolve_transfer(uuid,text,uuid,text) from public,anon,authenticated;

create or replace function public.admin_resolve_device_transfer(p_request_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
 select tenant_id into v_tenant from public.device_transfer_requests where id=p_request_id;
 if not public.is_tenant_admin(v_tenant) then raise exception 'Workspace administrator required.' using errcode='42501'; end if;
 return perimetrr_private.resolve_transfer(p_request_id,lower(p_action));
end;
$$;
create or replace function public.request_device_transfer(p_staff_id uuid,p_device_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_staff public.staff%rowtype; v_request public.device_transfer_requests%rowtype; v_code text;
begin
 if p_device_id is null then return jsonb_build_object('ok',false,'message','Device identity required.'); end if;
 select * into v_staff from public.staff where id=p_staff_id and is_active for update;
 if not found or not exists(select 1 from public.tenants where id=v_staff.tenant_id and subscription_status in ('active','trialing')) then
  return jsonb_build_object('ok',false,'message','Staff profile unavailable.');
 end if;
 if v_staff.device_id is null then return jsonb_build_object('ok',false,'message','Select your staff profile to link an unbound device first.'); end if;
 if v_staff.device_id=p_device_id then return jsonb_build_object('ok',false,'message','This device is already linked. No transfer is needed.'); end if;
 if exists(select 1 from public.staff where device_id=p_device_id) then return jsonb_build_object('ok',false,'message','This device is linked to another profile.'); end if;
 select * into v_request from public.device_transfer_requests where staff_id=p_staff_id and status='pending' for update;
 if found then
  if v_request.expires_at<=now() then
   perform perimetrr_private.resolve_transfer(v_request.id,'reject',null,'expired');
  elsif v_request.requested_device_id=p_device_id then
   return jsonb_build_object('ok',true,'request_id',v_request.id,'transfer_code',v_request.transfer_code,'expires_at',v_request.expires_at,'provisional',true);
  else return jsonb_build_object('ok',false,'message','A different device transfer is already pending. Ask an administrator to review it.'); end if;
 end if;
 v_code := lpad((('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint % 1000000)::text,6,'0');
 insert into public.device_transfer_requests(tenant_id,staff_id,previous_device_id,requested_device_id,transfer_code,status)
 values(v_staff.tenant_id,v_staff.id,v_staff.device_id,p_device_id,v_code,'pending') returning * into v_request;
 return jsonb_build_object('ok',true,'request_id',v_request.id,'transfer_code',v_code,'expires_at',v_request.expires_at,'provisional',true);
end;
$$;
create or replace function public.verify_staff_device(p_staff_id uuid,p_device_id uuid)
returns table(ok boolean,message text) language sql stable security definer set search_path = '' as $$
 select coalesce(p_device_id is not null and (s.device_id=p_device_id or exists(select 1 from public.device_transfer_requests r
  where r.staff_id=s.id and r.tenant_id=s.tenant_id and r.previous_device_id=s.device_id and r.requested_device_id=p_device_id
   and r.status='pending' and r.expires_at>now())),false),
 case when s.device_id=p_device_id then 'Device verified.' when exists(select 1 from public.device_transfer_requests r
  where r.staff_id=s.id and r.tenant_id=s.tenant_id and r.previous_device_id=s.device_id and r.requested_device_id=p_device_id
   and r.status='pending' and r.expires_at>now()) then 'Transfer pending. Attendance will be provisional.'
  else 'This device is not linked to this staff profile.' end
 from public.staff s join public.tenants t on t.id=s.tenant_id where s.id=p_staff_id and s.is_active and t.subscription_status in ('active','trialing');
$$;
create or replace function public.bind_staff_device(p_staff_id uuid,p_device_id uuid)
returns table(ok boolean,message text) language plpgsql security definer set search_path = '' as $$
declare v_staff public.staff%rowtype;
begin
 if p_device_id is null then return query select false,'Device identity required.'; return; end if;
 select * into v_staff from public.staff where id=p_staff_id and is_active for update;
 if not found or not exists(select 1 from public.tenants where id=v_staff.tenant_id and subscription_status in ('active','trialing')) then
  return query select false,'Staff profile unavailable.'; return;
 end if;
 if v_staff.device_id is not null and v_staff.device_id<>p_device_id then return query select false,'This profile is already linked. Request a device transfer.'; return; end if;
 if exists(select 1 from public.staff where device_id=p_device_id and id<>p_staff_id) then return query select false,'This device is already linked to another profile.'; return; end if;
 update public.staff set device_id=p_device_id,device_bound_at=coalesce(device_bound_at,now()) where id=p_staff_id;
 return query select true,'Device linked successfully.';
exception when unique_violation then return query select false,'This device is already linked to another profile.';
end;
$$;
create or replace function public.record_attendance(p_staff_id uuid,p_device_id uuid,p_event_type text,p_latitude double precision,p_longitude double precision)
returns table(ok boolean,status text,message text,distance_meters numeric) language plpgsql security definer set search_path = '' as $$
declare v_staff public.staff%rowtype; v_office public.offices%rowtype; v_request_id uuid; v_distance numeric; v_status text;
begin
 if p_device_id is null or p_event_type is null or lower(p_event_type) not in ('in','out') then
  return query select false,'rejected','Valid device and attendance action required.',null::numeric; return;
 end if;
 if p_latitude is null or p_longitude is null or not (p_latitude between -90 and 90) or not (p_longitude between -180 and 180) then
  return query select false,'rejected','Valid GPS coordinates required.',null::numeric; return;
 end if;
 select * into v_staff from public.staff where id=p_staff_id and is_active for update;
 if not found or not exists(select 1 from public.tenants where id=v_staff.tenant_id and subscription_status in ('active','trialing')) then
  return query select false,'rejected','Staff profile unavailable.',null::numeric; return;
 end if;
 if v_staff.device_id is distinct from p_device_id then
  select r.id into v_request_id from public.device_transfer_requests r where r.staff_id=v_staff.id and r.tenant_id=v_staff.tenant_id
   and r.previous_device_id=v_staff.device_id and r.requested_device_id=p_device_id and r.status='pending' and r.expires_at>now() for update;
  if v_request_id is null then return query select false,'rejected','This device is not linked to this profile.',null::numeric; return; end if;
 end if;
 select * into v_office from public.offices where id=v_staff.office_id and tenant_id=v_staff.tenant_id and is_active;
 if not found or v_office.location is null then return query select false,'rejected','No active office is assigned.',null::numeric; return; end if;
 v_distance:=public.st_distance(v_office.location,public.st_setsrid(public.st_makepoint(p_longitude,p_latitude),4326)::public.geography);
 v_status:=case when v_distance>v_office.radius_meters then 'outside_perimeter' when v_request_id is not null then 'provisional_transfer' else 'on_site' end;
 insert into public.attendance_logs(tenant_id,office_id,staff_id,event_type,status,distance_meters,transfer_request_id,original_status)
 values(v_staff.tenant_id,v_office.id,v_staff.id,lower(p_event_type),v_status,v_distance,v_request_id,case when v_status='provisional_transfer' then v_status end);
 return query select v_status<>'outside_perimeter',v_status,case when v_status='outside_perimeter' then 'You are outside the Perimeter.'
  when v_status='provisional_transfer' then 'Attendance saved provisionally. It becomes verified when this transfer is approved.' else 'Presence verified inside the Perimeter.' end,v_distance;
end;
$$;
create or replace function public.get_pending_transfers_for_lead(p_lead_staff_id uuid,p_lead_device_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid; v_requests jsonb;
begin
 select tenant_id into v_tenant from public.staff where id=p_lead_staff_id and is_active and is_team_lead and device_id=p_lead_device_id and p_lead_device_id is not null;
 if v_tenant is null then return jsonb_build_object('ok',false,'message','Authorized Team Lead device required.'); end if;
 select coalesce(jsonb_agg(jsonb_build_object('request_id',r.id,'staff_id',s.id,'staff_name',s.name,'department',s.department,'requested_at',r.requested_at,'expires_at',r.expires_at)),'[]'::jsonb)
 into v_requests from public.device_transfer_requests r join public.staff s on s.id=r.staff_id and s.tenant_id=r.tenant_id
 where r.tenant_id=v_tenant and r.status='pending' and r.expires_at>now();
 return jsonb_build_object('ok',true,'requests',v_requests);
end;
$$;
-- Employee history is restricted to a linked device or its still-valid pending request.
create or replace function public.get_staff_attendance(p_staff_id uuid,p_device_id uuid,p_limit integer default 10)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_allowed boolean; v_logs jsonb;
begin
 select v.ok into v_allowed from public.verify_staff_device(p_staff_id,p_device_id) v;
 if not coalesce(v_allowed,false) then return jsonb_build_object('ok',false,'message','Device authorization required.'); end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.occurred_at desc),'[]'::jsonb) into v_logs from (
  select l.id,l.event_type,l.status,l.occurred_at,l.distance_meters,l.original_status,l.transfer_request_id,l.transfer_resolved_at
  from public.attendance_logs l where l.staff_id=p_staff_id order by l.occurred_at desc,l.created_at desc,l.id desc limit greatest(1,least(coalesce(p_limit,10),50))
 ) q;
 return jsonb_build_object('ok',true,'logs',v_logs);
end;
$$;
create or replace function public.get_workspace_schedule(p_workspace_code text,p_week_start date)
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce((select h.schedule_data from public.hybrid_schedules h join public.tenants t on t.id=h.tenant_id
  where t.workspace_code=upper(trim(p_workspace_code)) and t.subscription_status in ('active','trialing') and h.week_start=p_week_start),'{}'::jsonb);
$$;
create or replace function public.get_workspace_schedule_history(p_workspace_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(to_jsonb(q) order by q.week_start desc),'[]'::jsonb) from (
  select h.week_start,h.schedule_data,h.updated_at from public.hybrid_schedules h join public.tenants t on t.id=h.tenant_id
  where t.workspace_code=upper(trim(p_workspace_code)) and t.subscription_status in ('active','trialing') order by h.week_start desc limit 30
 ) q;
$$;
create or replace function public.approve_device_transfer_by_lead(p_staff_id uuid,p_transfer_code text,p_lead_staff_id uuid,p_lead_device_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_request public.device_transfer_requests%rowtype;
begin
 -- Consistent staff-row ordering also handles two team leads transferring concurrently.
 perform 1 from public.staff where id in (p_staff_id,p_lead_staff_id) order by id for update;
 select tenant_id into v_tenant from public.staff where id=p_lead_staff_id and is_active and is_team_lead and device_id=p_lead_device_id and p_lead_device_id is not null;
 if v_tenant is null or p_staff_id=p_lead_staff_id then return jsonb_build_object('ok',false,'message','Authorized Team Lead device required. You cannot approve your own transfer.'); end if;
 select * into v_request from public.device_transfer_requests where staff_id=p_staff_id and tenant_id=v_tenant and status='pending' and expires_at>now() for update;
 if not found then return jsonb_build_object('ok',false,'message','No active transfer request found in your workspace.'); end if;
 if v_request.approval_attempts>=5 then return jsonb_build_object('ok',false,'message','Too many incorrect codes. A workspace administrator must review this request.'); end if;
 if p_transfer_code is null or v_request.transfer_code<>trim(p_transfer_code) then
  update public.device_transfer_requests set approval_attempts=approval_attempts+1 where id=v_request.id;
  return jsonb_build_object('ok',false,'message','Incorrect transfer code.');
 end if;
 return perimetrr_private.resolve_transfer(v_request.id,'approve',p_lead_staff_id);
end;
$$;

-- New authenticated RPCs have explicit execute grants. Employee RPCs stay usable without admin login.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('is_organization_admin','is_tenant_admin','get_admin_workspaces','get_my_organizations',
  'create_enterprise_organization','attach_organization_workspace','create_workspace','create_organization_workspace','get_organization_overview','manage_organization_member','get_fleet_overview','admin_resolve_device_transfer')
 loop execute format('revoke execute on function %s from public,anon',f.signature); execute format('grant execute on function %s to authenticated',f.signature); end loop;
end $$;
revoke execute on function public.get_staff_attendance(uuid,uuid,integer) from public;
grant execute on function public.get_staff_attendance(uuid,uuid,integer) to anon,authenticated;
revoke execute on function public.get_workspace_schedule(text,date), public.get_workspace_schedule_history(text) from public;
grant execute on function public.get_workspace_schedule(text,date), public.get_workspace_schedule_history(text) to anon,authenticated;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('bind_staff_device','verify_staff_device','request_device_transfer','record_attendance','get_pending_transfers_for_lead','approve_device_transfer_by_lead')
 loop execute format('revoke execute on function %s from public',f.signature); execute format('grant execute on function %s to anon,authenticated',f.signature); end loop;
end $$;
notify pgrst, 'reload schema';
commit;
