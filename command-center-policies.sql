-- Run after dedicated-api-schema.sql. Policy storage remains private; all writes
-- use a narrow administrator-checked endpoint, not generic table access.
begin;
create table if not exists public.workspace_policies (
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 workday_start smallint not null default 0 check(workday_start between 0 and 6),
 workday_end smallint not null default 4 check(workday_end between 0 and 6),
 hybrid_office_days smallint not null default 2,
 late_cutoff_minutes smallint not null default 510 check(late_cutoff_minutes between 0 and 1439),
 closing_minutes smallint not null default 1020 check(closing_minutes between 0 and 1439),
 count_wfh boolean not null default true,
 lead_priority boolean not null default true,
 allow_remote_signout boolean not null default false,
 check(workday_start<=workday_end),
 check(hybrid_office_days between 1 and (workday_end-workday_start+1)),
 check(late_cutoff_minutes<closing_minutes)
);
alter table public.workspace_policies enable row level security;
revoke all on public.workspace_policies from public,anon,authenticated;

create or replace function public.get_workspace_config(p_slug text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tenants; o public.offices; p public.workspace_policies;
begin
 select * into t from public.tenants where (slug=lower(trim(p_slug)) or workspace_code=upper(trim(p_slug)))
 and subscription_status in ('active','trialing') limit 1;
 if not found then return null; end if;
 select * into o from public.offices where tenant_id=t.id and is_active order by created_at,id limit 1;
 select * into p from public.workspace_policies where tenant_id=t.id;
 return jsonb_build_object('tenant_id',t.id,'id',t.id,'name',t.name,'short_name',coalesce(nullif(t.short_name,''),t.name),
 'slug',t.slug,'workspace_code',t.workspace_code,'brand_color',t.brand_color,'logo_url',t.logo_url,'timezone',t.timezone,
 'office_name',o.name,'lat',public.st_y(o.location::public.geometry),'lon',public.st_x(o.location::public.geometry),'radius',o.radius_meters,
 'workdays',coalesce(p.workday_start,0)||'_'||coalesce(p.workday_end,4),
 'hybrid_office_days',coalesce(p.hybrid_office_days,2),'late_cutoff_minutes',coalesce(p.late_cutoff_minutes,510),
 'workday_end_minutes',coalesce(p.closing_minutes,1020),'count_wfh_in_attendance_quota',coalesce(p.count_wfh,true),
 'team_lead_priority_sort',coalesce(p.lead_priority,true),'allow_remote_signout_post_closing',coalesce(p.allow_remote_signout,false));
end; $$;

create or replace function api.update_workspace_config(p_tenant_slug text,p_key text,p_value text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare tid uuid; oid uuid; p public.workspace_policies; parts text[]; n numeric; point jsonb;
begin
 select id into tid from public.tenants where slug=lower(trim(p_tenant_slug)) for update;
 if tid is null or not public.is_tenant_admin(tid) then raise exception 'Workspace administrator access required.' using errcode='42501'; end if;
 if p_value is null then raise exception 'A value is required.'; end if;
 insert into public.workspace_policies(tenant_id) values(tid) on conflict do nothing;
 select * into p from public.workspace_policies where tenant_id=tid for update;
 select id into oid from public.offices where tenant_id=tid and is_active order by created_at,id limit 1 for update;
 case p_key
 when 'WORK_DAYS' then
  if p_value !~ '^[0-6]_[0-6]$' then raise exception 'Select valid working days.'; end if;
  parts:=string_to_array(p_value,'_');
  if parts[1]::int>parts[2]::int then raise exception 'End day must follow start day.'; end if;
  update public.workspace_policies set workday_start=parts[1]::smallint,workday_end=parts[2]::smallint,
   hybrid_office_days=least(hybrid_office_days,parts[2]::int-parts[1]::int+1) where tenant_id=tid;
 when 'HYBRID_OFFICE_DAYS' then
  if p_value !~ '^[1-7]$' or p_value::int>p.workday_end-p.workday_start+1 then raise exception 'Office quota must fit the working week.'; end if;
  update public.workspace_policies set hybrid_office_days=p_value::smallint where tenant_id=tid;
 when 'LATE_CUTOFF_MINUTES','WORKDAY_END_MINUTES','CLOSING_TIME_MINUTES' then
  if p_value !~ '^[0-9]{1,4}$' or p_value::int>1439 then raise exception 'Invalid time.'; end if;
  if p_key='LATE_CUTOFF_MINUTES' then
   update public.workspace_policies set late_cutoff_minutes=p_value::smallint where tenant_id=tid;
  else update public.workspace_policies set closing_minutes=p_value::smallint where tenant_id=tid; end if;
 when 'COUNT_WFH_IN_ATTENDANCE_QUOTA','TEAM_LEAD_PRIORITY_SORT','ALLOW_REMOTE_SIGNOUT_POST_CLOSING' then
  if p_value not in ('true','false') then raise exception 'Choose enabled or disabled.'; end if;
  if p_key='COUNT_WFH_IN_ATTENDANCE_QUOTA' then update public.workspace_policies set count_wfh=p_value::boolean where tenant_id=tid;
  elsif p_key='TEAM_LEAD_PRIORITY_SORT' then update public.workspace_policies set lead_priority=p_value::boolean where tenant_id=tid;
  else update public.workspace_policies set allow_remote_signout=p_value::boolean where tenant_id=tid; end if;
 when 'TIMEZONE' then
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_value) then raise exception 'Invalid timezone.'; end if;
  update public.tenants set timezone=p_value where id=tid;
 when 'OFFICE_LOCATION' then
  point:=p_value::jsonb;
  if oid is null or jsonb_typeof(point)<>'object' or jsonb_typeof(point->'lat') is distinct from 'number'
   or jsonb_typeof(point->'lon') is distinct from 'number' then raise exception 'Valid office coordinates required.'; end if;
  if not((point->>'lat')::numeric between -90 and 90) or not((point->>'lon')::numeric between -180 and 180) then raise exception 'Valid office coordinates required.'; end if;
  update public.offices set location=public.st_setsrid(public.st_makepoint((point->>'lon')::double precision,(point->>'lat')::double precision),4326)::public.geography,updated_at=now() where id=oid;
 when 'OFFICE_LAT','OFFICE_LON','RADIUS_METERS' then
  if oid is null then raise exception 'No active office is configured.'; end if;
  n:=p_value::numeric;
  if p_key='OFFICE_LAT' then
   if not(n between -90 and 90) then raise exception 'Latitude must be -90 to 90.'; end if;
   update public.offices set location=public.st_setsrid(public.st_makepoint(public.st_x(location::public.geometry),n::double precision),4326)::public.geography,updated_at=now() where id=oid;
  elsif p_key='OFFICE_LON' then
   if not(n between -180 and 180) then raise exception 'Longitude must be -180 to 180.'; end if;
   update public.offices set location=public.st_setsrid(public.st_makepoint(n::double precision,public.st_y(location::public.geometry)),4326)::public.geography,updated_at=now() where id=oid;
  else
   if not(n between 25 and 5000) or n<>trunc(n) then raise exception 'Radius must be a whole number from 25 to 5000 metres.'; end if;
   update public.offices set radius_meters=n::int,updated_at=now() where id=oid;
  end if;
 else raise exception 'Unsupported workspace setting.';
 end case;
 return jsonb_build_object('ok',true,'message','Workspace settings saved.','config',public.get_workspace_config(p_tenant_slug));
end; $$;
-- Keep device and transfer authorization intact while using the saved cutoff
-- and closing time. A pending device never gains remote sign-out privileges.
create or replace function public.record_attendance(p_staff_id uuid,p_device_id uuid,p_event_type text,p_latitude double precision,p_longitude double precision)
returns table(ok boolean,status text,message text,distance_meters numeric)
language plpgsql security definer set search_path='' as $$
declare s public.staff; o public.offices; p public.workspace_policies; request_id uuid;
 distance numeric; result_status text; normal_status text; local_now timestamp; tz text; remote_out boolean:=false;
begin
 if p_device_id is null or p_event_type is null or lower(p_event_type) not in ('in','out') then
  return query select false,'rejected','Valid device and attendance action required.',null::numeric; return; end if;
 if p_latitude is null or p_longitude is null or not(p_latitude between -90 and 90) or not(p_longitude between -180 and 180) then
  return query select false,'rejected','Valid GPS coordinates required.',null::numeric; return; end if;
 select * into s from public.staff where id=p_staff_id and is_active for update;
 if not found then return query select false,'rejected','Staff profile unavailable.',null::numeric; return; end if;
 select timezone into tz from public.tenants where id=s.tenant_id and subscription_status in ('active','trialing');
 if not found then return query select false,'rejected','Staff profile unavailable.',null::numeric; return; end if;
 if s.device_id is distinct from p_device_id then
  select r.id into request_id from public.device_transfer_requests r where r.staff_id=s.id and r.tenant_id=s.tenant_id
   and r.previous_device_id=s.device_id and r.requested_device_id=p_device_id and r.status='pending' and r.expires_at>now() for update;
  if request_id is null then return query select false,'rejected','This device is not linked to this profile.',null::numeric; return; end if;
 end if;
 select * into o from public.offices where id=s.office_id and tenant_id=s.tenant_id and is_active;
 if not found or o.location is null then return query select false,'rejected','No active office is assigned.',null::numeric; return; end if;
 select * into p from public.workspace_policies where tenant_id=s.tenant_id;
 local_now:=now() at time zone tz;
 distance:=public.st_distance(o.location,public.st_setsrid(public.st_makepoint(p_longitude,p_latitude),4326)::public.geography);
 remote_out:=lower(p_event_type)='out' and request_id is null and coalesce(p.allow_remote_signout,false)
  and extract(hour from local_now)*60+extract(minute from local_now)>=coalesce(p.closing_minutes,1020)
  and exists(select 1 from public.attendance_logs l where l.tenant_id=s.tenant_id and l.staff_id=s.id and l.event_type='in'
   and l.status in ('on_site','late') and (l.occurred_at at time zone tz)::date=local_now::date);
 normal_status:=case when lower(p_event_type)='in' and extract(hour from local_now)*60+extract(minute from local_now)>=coalesce(p.late_cutoff_minutes,510)
  then 'late' else 'on_site' end;
 result_status:=case when distance>o.radius_meters and not remote_out then 'outside_perimeter'
  when request_id is not null then 'provisional_transfer' else normal_status end;
 insert into public.attendance_logs(tenant_id,office_id,staff_id,event_type,status,distance_meters,transfer_request_id,original_status)
 values(s.tenant_id,o.id,s.id,lower(p_event_type),result_status,distance,request_id,case when result_status='provisional_transfer' then normal_status end);
 return query select result_status<>'outside_perimeter',result_status,case when result_status='outside_perimeter' then 'You are outside the Perimeter.'
  when result_status='provisional_transfer' then 'Attendance saved provisionally. It becomes verified when this transfer is approved.'
  when result_status='late' then 'Attendance verified. Arrival is after the workspace cutoff.' else 'Attendance verified.' end,distance;
end; $$;

revoke all on function api.update_workspace_config(text,text,text) from public,anon;
grant execute on function api.update_workspace_config(text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
