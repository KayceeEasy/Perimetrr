-- Follow-up to the live Supabase advisor review; preserves all data.
begin;
-- Owner-level changes to spatial_ref_sys/PostGIS are blocked: owned by supabase_admin.
-- The available postgres role cannot enable RLS or revoke their grants.
-- dedicated-api-schema.sql subsequently removes their browser schema access and
-- web exposure, without bypassing those ownership protections. Apply that last.
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
drop policy if exists "Anyone can register push subscriptions" on public.push_subscriptions;
alter policy "Admins see their roles" on public.tenant_admins using (user_id=(select auth.uid()));
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists organization_members_granted_by_idx on public.organization_members(granted_by);
create index if not exists tenant_admins_user_idx on public.tenant_admins(user_id,tenant_id);
create index if not exists staff_office_idx on public.staff(office_id);
create index if not exists attendance_office_idx on public.attendance_logs(office_id);
create index if not exists transfers_tenant_idx on public.device_transfer_requests(tenant_id);
create index if not exists transfers_resolved_by_idx on public.device_transfer_requests(resolved_by);
create index if not exists transfers_resolved_by_staff_idx on public.device_transfer_requests(resolved_by_staff_id);
create index if not exists schedules_updated_by_idx on public.hybrid_schedules(updated_by);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

create or replace function public.get_workspace_for_pairing(p_workspace_code text)
returns table(tenant_id uuid,slug text,tenant_name text,short_name text,workspace_code text,brand_color text,logo_url text)
language sql stable security definer set search_path='' as $$
 select t.id,t.slug,t.name,coalesce(nullif(t.short_name,''),t.name),t.workspace_code,t.brand_color,t.logo_url
 from public.tenants t where (t.workspace_code=upper(trim(p_workspace_code)) or t.slug=lower(trim(p_workspace_code)))
 and t.subscription_status in ('active','trialing');
$$;
create or replace function public.get_workspace_staff(p_workspace_code text)
returns table(id uuid,name text,dept text,is_team_lead boolean,schedule_policy text)
language sql stable security definer set search_path='' as $$
 select s.id,s.name,s.department,s.is_team_lead,s.schedule_policy from public.staff s join public.tenants t on t.id=s.tenant_id
 where t.workspace_code=upper(trim(p_workspace_code)) and t.subscription_status in ('active','trialing') and s.is_active order by s.name;
$$;
create or replace function public.get_workspace_config(p_slug text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tenants%rowtype; o public.offices%rowtype;
begin
 select * into t from public.tenants where (slug=lower(trim(p_slug)) or workspace_code=upper(trim(p_slug)))
 and subscription_status in ('active','trialing') limit 1;
 if not found then return null; end if;
 select * into o from public.offices where tenant_id=t.id and is_active order by created_at,id limit 1;
 return jsonb_build_object('tenant_id',t.id,'id',t.id,'name',t.name,'short_name',coalesce(nullif(t.short_name,''),t.name),
 'slug',t.slug,'workspace_code',t.workspace_code,'brand_color',t.brand_color,'logo_url',t.logo_url,'timezone',t.timezone,
 'office_name',o.name,'lat',case when o.location is not null then public.st_y(o.location::public.geometry) end,
 'lon',case when o.location is not null then public.st_x(o.location::public.geometry) end,'radius',o.radius_meters);
end;
$$;
revoke execute on function public.get_workspace_for_pairing(text),public.get_workspace_staff(text),public.get_workspace_config(text) from public;
grant execute on function public.get_workspace_for_pairing(text),public.get_workspace_staff(text),public.get_workspace_config(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
