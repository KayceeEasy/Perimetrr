-- Perimetrr API boundary. No tables, data, keys, or shared invitations are deleted.
-- Apply AFTER security-hardening.sql, enterprise-and-transfers.sql, advisor-hardening.sql.
-- The matching browser release must use db.schema = 'api'. Then enable api-only
-- exposure using tools/api-schema-config.cjs enable. Never re-expose public.
begin;
set local search_path = '';
set local lock_timeout = '5s';

create schema if not exists api authorization postgres;
revoke all on schema api from public, anon, authenticated;
grant usage on schema api to anon, authenticated, service_role;
-- Function EXECUTE has a global PUBLIC default; a per-schema REVOKE alone
-- does not override it. Future postgres-created routines require explicit grants.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema api revoke all on functions from anon, authenticated;
alter default privileges for role postgres in schema api revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema api revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

-- Only these reviewed implementations receive an API entry point. This is not
-- a blanket copy of public functions or extension routines. Wrappers have no
-- dynamic user-supplied SQL. auth.uid() continues to refer to the caller's JWT.
-- SECURITY DEFINER is needed because browser roles cannot use the backing
-- public schema; the existing implementation enforces membership or device proof.
do $migration$
declare
 approved text[] := array[
  'get_workspace_for_pairing','get_workspace_staff','get_workspace_config',
  'get_workspace_schedule','get_workspace_schedule_history',
  'bind_staff_device','verify_staff_device','request_device_transfer',
  'record_attendance','get_staff_attendance','get_pending_transfers_for_lead',
  'approve_device_transfer_by_lead','create_workspace','get_admin_workspaces',
  'manage_tenant_staff','admin_resolve_device_transfer','get_my_organizations',
  'create_enterprise_organization','attach_organization_workspace',
  'create_organization_workspace','get_organization_overview','manage_organization_member'
 ];
 employee text[] := array[
  'get_workspace_for_pairing','get_workspace_staff','get_workspace_config',
  'get_workspace_schedule','get_workspace_schedule_history',
  'bind_staff_device','verify_staff_device','request_device_transfer',
  'record_attendance','get_staff_attendance','get_pending_transfers_for_lead',
  'approve_device_transfer_by_lead'
 ];
 name text; f record; arguments text; result text; body text; signature text;
begin
 foreach name in array approved loop
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=name) <> 1 then
   raise exception 'Expected exactly one reviewed public implementation: %',name;
  end if;
  select p.*,pg_catalog.pg_get_function_arguments(p.oid) as declaration,
   pg_catalog.pg_get_function_result(p.oid) as result_type,
   pg_catalog.pg_get_function_identity_arguments(p.oid) as identity
  into f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=name;
  if not f.prosecdef or not ('search_path=""'=any(f.proconfig)) or f.proowner <> 'postgres'::regrole then
   raise exception 'Unreviewed implementation privileges/search path: %',name;
  end if;
  select coalesce(string_agg(format('$%s',i),',' order by i),'') into arguments
   from pg_catalog.generate_series(1,f.pronargs) i;
  result:=f.result_type;
  if f.prorettype='public.tenants'::regtype then
   -- Do not expose an internal table's composite type through the API.
   result:='jsonb'; body:=format('select pg_catalog.to_jsonb(public.%I(%s))',name,arguments);
  elsif f.proretset then body:=format('select * from public.%I(%s)',name,arguments);
  else body:=format('select public.%I(%s)',name,arguments); end if;
  execute format('create or replace function api.%I(%s) returns %s language sql %s security definer set search_path = %L as %L',
   name,f.declaration,result,case when f.provolatile='s' then 'stable' else 'volatile' end,'',body);
  signature:=format('api.%I(%s)',name,f.identity);
  execute format('revoke all on function %s from public,anon,authenticated,service_role',signature);
  execute format('grant execute on function %s to authenticated',signature);
  if name=any(employee) then execute format('grant execute on function %s to anon',signature); end if;
 end loop;
end;
$migration$;

-- Replace the last direct browser table operations with narrow, tenant-checked
-- endpoints. Do not accept tenant_id, actors, paid entitlements, or raw SQL in a
-- generic update payload.
create or replace function api.get_admin_attendance(p_tenant_slug text,p_staff_id uuid default null,
 p_from_date timestamptz default null,p_to_date timestamptz default null,p_limit integer default 200)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant_id uuid; rows jsonb;
begin
 select t.id into v_tenant_id from public.tenants t where t.slug=lower(trim(p_tenant_slug));
 if v_tenant_id is null or not public.is_tenant_admin(v_tenant_id) then
  raise exception 'Workspace administrator access required.' using errcode='42501';
 end if;
 if p_from_date is not null and p_to_date is not null and p_from_date>p_to_date then raise exception 'The start date must come before the end date.'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.occurred_at desc,q.id desc),'[]'::jsonb) into rows from (
  select l.id,l.occurred_at,l.original_status,l.transfer_request_id,l.transfer_resolved_at,
   l.event_type,l.status,l.distance_meters,l.verification_method,
   jsonb_build_object('id',s.id,'name',s.name,'department',s.department) as staff,
   jsonb_build_object('name',o.name) as office
  from public.attendance_logs l join public.staff s on s.id=l.staff_id and s.tenant_id=l.tenant_id
  left join public.offices o on o.id=l.office_id and o.tenant_id=l.tenant_id
  where l.tenant_id=v_tenant_id and (p_staff_id is null or l.staff_id=p_staff_id)
   and (p_from_date is null or l.occurred_at>=p_from_date) and (p_to_date is null or l.occurred_at<=p_to_date)
  order by l.occurred_at desc,l.id desc limit greatest(1,least(coalesce(p_limit,200),1000))
 ) q;
 return rows;
end;
$$;

create or replace function api.get_admin_transfers(p_tenant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant_id uuid; rows jsonb;
begin
 select t.id into v_tenant_id from public.tenants t where t.slug=lower(trim(p_tenant_slug));
 if v_tenant_id is null or not public.is_tenant_admin(v_tenant_id) then raise exception 'Workspace administrator access required.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.requested_at desc),'[]'::jsonb) into rows from (
  select r.id,r.staff_id,r.status,r.requested_at,r.expires_at,
   jsonb_build_object('name',s.name,'department',s.department) as staff
  from public.device_transfer_requests r join public.staff s on s.id=r.staff_id and s.tenant_id=r.tenant_id
  where r.tenant_id=v_tenant_id and r.status='pending' order by r.requested_at desc limit 1000
 ) q;
 return rows;
end;
$$;

create or replace function api.get_workspace_administrators(p_tenant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant_id uuid; rows jsonb;
begin
 select t.id into v_tenant_id from public.tenants t where t.slug=lower(trim(p_tenant_slug));
 if v_tenant_id is null or not public.is_tenant_admin(v_tenant_id) then raise exception 'Workspace administrator access required.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',a.user_id,'role',a.role)),'[]'::jsonb)
 into rows from public.tenant_admins a where a.tenant_id=v_tenant_id;
 return rows;
end;
$$;

create or replace function api.save_workspace_schedule(p_tenant_slug text,p_week_start date,p_schedule_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_tenant_id uuid;
begin
 select t.id into v_tenant_id from public.tenants t where t.slug=lower(trim(p_tenant_slug));
 if v_tenant_id is null or not public.is_tenant_admin(v_tenant_id) then raise exception 'Workspace administrator access required.' using errcode='42501'; end if;
 if p_week_start is null or extract(isodow from p_week_start)<>1 then raise exception 'Schedules must start on a Monday.'; end if;
 if p_schedule_data is null or jsonb_typeof(p_schedule_data)<>'object' or pg_column_size(p_schedule_data)>1048576 then
  raise exception 'Provide a schedule object smaller than 1 MB.';
 end if;
 insert into public.hybrid_schedules(tenant_id,week_start,schedule_data,updated_by)
 values(v_tenant_id,p_week_start,p_schedule_data,auth.uid())
 on conflict(tenant_id,week_start) do update
 set schedule_data=excluded.schedule_data,updated_by=excluded.updated_by;
 return jsonb_build_object('ok',true,'message','Hybrid schedule saved.');
end;
$$;

create or replace function api.update_workspace_short_name(p_tenant_id uuid,p_short_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_tenant_admin(p_tenant_id) then raise exception 'Workspace administrator access required.' using errcode='42501'; end if;
 if p_short_name is null or char_length(trim(p_short_name)) not between 1 and 128 then raise exception 'Short name must be 1–128 characters.'; end if;
 update public.tenants set short_name=trim(p_short_name) where id=p_tenant_id;
 return jsonb_build_object('ok',true);
end;
$$;

revoke all on function api.get_admin_attendance(text,uuid,timestamptz,timestamptz,integer),
 api.get_admin_transfers(text),api.get_workspace_administrators(text),
 api.save_workspace_schedule(text,date,jsonb),api.update_workspace_short_name(uuid,text)
 from public,anon,authenticated,service_role;
grant execute on function api.get_admin_attendance(text,uuid,timestamptz,timestamptz,integer),
 api.get_admin_transfers(text),api.get_workspace_administrators(text),
 api.save_workspace_schedule(text,date,jsonb),api.update_workspace_short_name(uuid,text) to authenticated;

-- Application tables remain in their existing section; IDs, data, foreign keys,
-- indexes, and RLS policies are preserved. Remove direct browser table grants,
-- including column-level grants which survive a table-level REVOKE.
do $migration$
declare t record; columns text; f record; role_name text;
begin
 for t in select c.oid,c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and c.relowner='postgres'::regrole loop
  execute format('revoke all on table public.%I from public,anon,authenticated',t.relname);
  select string_agg(quote_ident(attname),',') into columns from pg_catalog.pg_attribute where attrelid=t.oid and attnum>0 and not attisdropped;
  execute format('revoke select(%s),insert(%s),update(%s),references(%s) on table public.%I from public,anon,authenticated',columns,columns,columns,columns,t.relname);
 end loop;
 for f in select p.oid::regprocedure as signature from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proowner='postgres'::regrole and not exists(
   select 1 from pg_catalog.pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e') loop
  execute format('revoke execute on function %s from public,anon,authenticated',f.signature);
 end loop;
 -- Preserve the existing platform/service access before removing PUBLIC usage.
 -- Never grant CREATE, change system-owned PostGIS objects, or modify auth keys.
 for role_name in select rolname from pg_catalog.pg_roles where
  (rolname like 'supabase_%' or rolname in ('postgres','service_role','dashboard_user','authenticator','pgbouncer'))
  and has_schema_privilege(oid,'public','USAGE') loop
  execute format('grant usage on schema public to %I',role_name);
 end loop;
end;
$migration$;
revoke usage on schema public from public,anon,authenticated;
revoke create on schema api from public,anon,authenticated;
-- Fail closed if an inherited role could still reach extension tables/functions.
do $$ begin
 if has_schema_privilege('anon','public','USAGE') or has_schema_privilege('authenticated','public','USAGE') then
  raise exception 'Browser roles still inherit public schema usage.';
 end if;
end; $$;
notify pgrst,'reload schema';
commit;
