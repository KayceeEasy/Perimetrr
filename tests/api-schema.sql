-- Append after tests/enterprise-transfers.sql in the SAME --atomic --check
-- transaction. Fixtures and permission probes must never persist.
do $$
declare t record; role_name text;
begin
 perform pg_temp.assert_true((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api')=27,'Only 27 approved API endpoints');
 perform pg_temp.assert_true(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='api' and c.relkind in ('r','p','v','m')),'No raw tables or views exposed in api');
 for role_name in select unnest(array['anon','authenticated']) loop
  perform pg_temp.assert_true(not has_schema_privilege(role_name,'public','USAGE'),'Browser role cannot reach public, including PostGIS');
  perform pg_temp.assert_true(not has_schema_privilege(role_name,'api','CREATE'),'Browser role cannot create endpoints');
  perform pg_temp.assert_true(not has_schema_privilege(role_name,'perimetrr_private','USAGE'),'Private transfer resolver remains private');
  for t in select c.oid,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relowner='postgres'::regrole loop
   perform pg_temp.assert_true(not has_table_privilege(role_name,t.oid,'SELECT,INSERT,UPDATE,DELETE'),'No direct browser permissions on '||t.relname);
   perform pg_temp.assert_true(not has_any_column_privilege(role_name,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'),'No residual column permissions on '||t.relname);
   perform pg_temp.assert_true((select relrowsecurity from pg_class where oid=t.oid),'Existing RLS preserved for '||t.relname);
  end loop;
 end loop;
 perform pg_temp.assert_true(has_schema_privilege('supabase_auth_admin','public','USAGE'),'Auth service access preserved');
 perform pg_temp.assert_true(has_schema_privilege('supabase_storage_admin','public','USAGE'),'Storage service access preserved');
 perform pg_temp.assert_true(not has_function_privilege('anon','api.get_admin_attendance(text,uuid,timestamptz,timestamptz,integer)','EXECUTE'),'Anonymous admin attendance access denied');
 perform pg_temp.assert_true(not has_function_privilege('authenticated','public.manage_tenant_staff(text,text,jsonb)','EXECUTE'),'Internal implementation cannot be called directly');
end;
$$;

-- These fail-closed probes exist only until the surrounding rollback.
create function api.unapproved_test_probe() returns integer language sql as $$ select 1 $$;
create table api.unapproved_table_probe(id integer);
alter table api.unapproved_table_probe enable row level security;
do $$ begin
 perform pg_temp.assert_true(not has_function_privilege('anon','api.unapproved_test_probe()','EXECUTE'),'Future functions not public by default');
 perform pg_temp.assert_true(not has_function_privilege('authenticated','api.unapproved_test_probe()','EXECUTE'),'Future functions require authenticated grant');
 perform pg_temp.assert_true(not has_table_privilege('authenticated','api.unapproved_table_probe','SELECT,INSERT,UPDATE,DELETE'),'Future tables not exposed by default');
end; $$;

set local role authenticated;
do $$
declare f jsonb:=current_setting('perimetrr.test_fixture')::jsonb; rows jsonb; row jsonb; result jsonb;
begin
 perform set_config('request.jwt.claim.sub',f->>'a',true);
 rows:=api.get_admin_workspaces();
 perform pg_temp.assert_true(jsonb_array_length(rows)=2,'Authenticated API lists only own company branches');
 perform pg_temp.assert_true(jsonb_array_length(api.get_my_organizations())=1,'Authenticated API lists only own organization');
 perform pg_temp.assert_true(jsonb_array_length(api.get_organization_overview((f->>'org_a')::uuid)->'workspaces')=2,'Organization overview still usable through API');
 rows:=api.get_admin_attendance(f->>'ta_slug',p_limit=>1000);
 perform pg_temp.assert_true(jsonb_array_length(rows)>0,'Authorized attendance read works');
 for row in select value from jsonb_array_elements(rows) loop
  perform pg_temp.assert_true(not (row::text like '%device_id%'),'Attendance response excludes browser credentials');
 end loop;
 perform pg_temp.assert_true(jsonb_array_length(api.get_admin_attendance(f->>'ta_slug',p_staff_id=>gen_random_uuid()))=0,'Staff filter cannot broaden records');
 perform pg_temp.assert_true(jsonb_array_length(api.get_admin_attendance(f->>'ta_slug',p_from_date=>'2099-01-01'))=0,'Empty date ranges return empty data');
 perform pg_temp.assert_true(jsonb_array_length(api.get_workspace_administrators(f->>'ta_slug'))=1,'Authorized administrator list works');
 rows:=api.get_admin_transfers(f->>'ta_slug');
 perform pg_temp.assert_true(jsonb_typeof(rows)='array' and not (rows::text like '%device_id%') and not (rows::text like '%transfer_code%'),'Transfer list excludes credentials and approval codes');
 result:=api.save_workspace_schedule(f->>'ta_slug','2026-10-05','{"Audit Employee":{"Monday":"office"}}');
 perform pg_temp.assert_true((result->>'ok')::boolean,'Authorized schedule save works');
 result:=api.save_workspace_schedule(f->>'ta_slug','2026-10-05','{"Audit Employee":{"Monday":"remote"}}');
 perform pg_temp.assert_true((result->>'ok')::boolean,'Authorized schedule update works');
 perform pg_temp.assert_true(api.get_workspace_schedule(f->>'ta_code','2026-10-05')->'Audit Employee'->>'Monday'='remote','Shared schedule reads the same saved record');
 begin perform api.save_workspace_schedule(f->>'ta_slug','2026-10-06','{}'); raise exception 'TEST FAILED: non-Monday accepted'; exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 begin perform api.save_workspace_schedule(f->>'ta_slug','2026-10-05','[]'); raise exception 'TEST FAILED: invalid schedule accepted'; exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 perform pg_temp.assert_true((api.update_workspace_short_name((f->>'ta')::uuid,'Audit Branch')->>'ok')::boolean,'Authorized short name update works');
 begin perform api.get_admin_attendance(f->>'tb_slug'); raise exception 'TEST FAILED: foreign attendance readable'; exception when insufficient_privilege then null; end;
 begin perform api.get_admin_transfers(f->>'tb_slug'); raise exception 'TEST FAILED: foreign transfer list readable'; exception when insufficient_privilege then null; end;
 begin perform api.get_workspace_administrators(f->>'tb_slug'); raise exception 'TEST FAILED: foreign administrators readable'; exception when insufficient_privilege then null; end;
 begin perform api.save_workspace_schedule(f->>'tb_slug','2026-10-05','{}'); raise exception 'TEST FAILED: foreign schedule writable'; exception when insufficient_privilege then null; end;
 begin perform api.update_workspace_short_name((f->>'tb')::uuid,'Hijacked'); raise exception 'TEST FAILED: foreign branch writable'; exception when insufficient_privilege then null; end;
 begin perform api.get_organization_overview((f->>'org_b')::uuid); raise exception 'TEST FAILED: foreign organization readable'; exception when insufficient_privilege then null; end;
 begin perform public.get_workspace_config(f->>'ta_slug'); raise exception 'TEST FAILED: direct internal RPC accessible'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.spatial_ref_sys; raise exception 'TEST FAILED: PostGIS table reachable'; exception when insufficient_privilege then null; end;
 begin perform public.st_makepoint(0,0); raise exception 'TEST FAILED: extension RPC reachable'; exception when insufficient_privilege then null; end;
 -- JSON returns avoid exposing the internal tenants composite type.
 result:=api.create_workspace('API Provisioning Probe',null,null,'#39FF88','', 'Office',6.5,3.3,100,'enterprise','Africa/Lagos');
 perform pg_temp.assert_true(result->>'plan_tier'='free','API provisioning cannot self-assign a paid plan');
 result:=api.create_organization_workspace((f->>'org_a')::uuid,'API Branch Probe','Office',6.5,3.3,100);
 perform pg_temp.assert_true(result->>'organization_id'=f->>'org_a','API branch provisioning preserves own organization');
end;
$$;
reset role;
set local role anon;
do $$
declare f jsonb:=current_setting('perimetrr.test_fixture')::jsonb;
begin
 perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.assert_true(exists(select 1 from api.get_workspace_for_pairing(f->>'ta_code')),'Shared company pairing remains usable');
 perform pg_temp.assert_true(exists(select 1 from api.get_workspace_staff(f->>'ta_code')),'Shared employee roster remains usable');
 perform pg_temp.assert_true(api.get_workspace_config(f->>'ta_slug') is not null,'Employee perimeter configuration remains usable');
 perform pg_temp.assert_true(exists(select 1 from api.verify_staff_device((f->>'staff')::uuid,(f->>'device')::uuid) where ok),'Linked employee page-load check remains usable');
 perform pg_temp.assert_true(exists(select 1 from api.record_attendance((f->>'staff')::uuid,(f->>'device')::uuid,'in',6.5,3.3) where ok),'Employee attendance remains usable without admin login');
 perform pg_temp.assert_true((api.get_staff_attendance((f->>'staff')::uuid,(f->>'device')::uuid)->>'ok')::boolean,'Employee can read own attendance');
 perform pg_temp.assert_true(not (api.get_staff_attendance((f->>'staff')::uuid,gen_random_uuid())->>'ok')::boolean,'Wrong employee credential denied');
 perform pg_temp.assert_true(api.get_workspace_schedule(f->>'ta_code','2026-10-05')->'Audit Employee'->>'Monday'='remote','Employees receive shared cloud schedule');
 begin perform api.get_admin_workspaces(); raise exception 'TEST FAILED: anonymous administrator endpoint usable'; exception when insufficient_privilege then null; end;
 begin perform api.save_workspace_schedule(f->>'ta_slug','2026-10-05','{}'); raise exception 'TEST FAILED: anonymous schedule write allowed'; exception when insufficient_privilege then null; end;
 begin perform api.create_workspace('Unauthorized',null,null,'#39FF88','','Office',6.5,3.3,100,'free'); raise exception 'TEST FAILED: anonymous workspace creation allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.spatial_ref_sys; raise exception 'TEST FAILED: anonymous PostGIS read allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.spatial_ref_sys(srid) values(999999); raise exception 'TEST FAILED: anonymous PostGIS write allowed'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select 'PASS: API allowlist, default-deny grants, raw-table/extension denial, employee flows, and scoped administrator endpoints' as result;
