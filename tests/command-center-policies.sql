-- Authorization and policy integration checks. Always rolled back.
begin;
select set_config('request.jwt.claims','{"sub":"7d7b4bf6-c026-4451-a4f4-68f66375248a","role":"authenticated"}',true);
set local role authenticated;
do $$
declare c jsonb; other jsonb; r jsonb;
begin
 other:=api.get_workspace_config('dbmx-8827');
 r:=api.update_workspace_config('byfu-9307','WORK_DAYS','0_5');
 c:=r->'config';
 if c->>'workdays'<>'0_5' or (c->>'hybrid_office_days')::int<>2 then raise exception 'Six-day policy failed'; end if;
 perform api.update_workspace_config('byfu-9307','HYBRID_OFFICE_DAYS','6');
 perform api.update_workspace_config('byfu-9307','WORK_DAYS','0_2');
 c:=api.get_workspace_config('byfu-9307');
 if (c->>'hybrid_office_days')::int<>3 then raise exception 'Quota was not clamped atomically'; end if;
 begin
  perform api.update_workspace_config('byfu-9307','HYBRID_OFFICE_DAYS','4');
  raise exception 'Oversized quota accepted';
 exception when raise_exception then if sqlerrm='Oversized quota accepted' then raise; end if; end;
 perform api.update_workspace_config('byfu-9307','OFFICE_LOCATION','{"lat":6.44,"lon":3.48}');
 perform api.update_workspace_config('byfu-9307','OFFICE_LAT','6.44');
 perform api.update_workspace_config('byfu-9307','OFFICE_LON','3.48');
 perform api.update_workspace_config('byfu-9307','RADIUS_METERS','175');
 perform api.update_workspace_config('byfu-9307','TIMEZONE','Europe/London');
 perform api.update_workspace_config('byfu-9307','LATE_CUTOFF_MINUTES','540');
 perform api.update_workspace_config('byfu-9307','WORKDAY_END_MINUTES','1080');
 perform api.update_workspace_config('byfu-9307','COUNT_WFH_IN_ATTENDANCE_QUOTA','false');
 perform api.update_workspace_config('byfu-9307','TEAM_LEAD_PRIORITY_SORT','false');
 if api.get_workspace_config('dbmx-8827') is distinct from other then raise exception 'Another branch changed'; end if;
 if jsonb_array_length(api.get_admin_attendance('byfu-9307',null,'2026-09-27T23:00:00Z','2026-10-04T22:59:59Z',1000))<>56 then raise exception 'Attendance fixture contract changed'; end if;
end $$;
reset role;
do $$
declare sid uuid; device uuid:=gen_random_uuid(); result record; original text; request jsonb;
begin
 select id into sid from public.staff where tenant_id='6ffc65e8-0197-4b79-8543-5458c5be9b7a' and name='Alex Rivera';
 update public.staff set device_id=device where id=sid;
 perform api.update_workspace_config('byfu-9307','LATE_CUTOFF_MINUTES','0');
 select * into result from api.record_attendance(sid,device,'in',6.44,3.48);
 if not result.ok or result.status<>'late' then raise exception 'Saved cutoff was not enforced'; end if;
 select * into result from api.record_attendance(sid,gen_random_uuid(),'in',6.44,3.48);
 if result.ok then raise exception 'Unlinked device accepted'; end if;
 sid:=gen_random_uuid();
 insert into public.staff(id,tenant_id,office_id,name,department,device_id)
 select sid,'6ffc65e8-0197-4b79-8543-5458c5be9b7a',id,'Policy test '||sid::text,'Temporary test',gen_random_uuid()
 from public.offices where tenant_id='6ffc65e8-0197-4b79-8543-5458c5be9b7a' and is_active order by created_at,id limit 1;
 device:=gen_random_uuid();
 request:=api.request_device_transfer(sid,device);
 if not coalesce((request->>'ok')::boolean,false) then raise exception 'Transfer test setup failed'; end if;
 select * into result from api.record_attendance(sid,device,'in',6.44,3.48);
 if not result.ok or result.status<>'provisional_transfer' then raise exception 'Provisional attendance failed'; end if;
 select original_status into original from public.attendance_logs where staff_id=sid order by occurred_at desc limit 1;
 if original<>'late' then raise exception 'Approval cannot restore original attendance status'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin perform api.update_workspace_config('byfu-9307','RADIUS_METERS','200'); raise exception 'Unauthorized update succeeded';
 exception when insufficient_privilege then null; end;
end $$;
select 'PASS: policy persistence, quota clamp, attendance endpoint, branch isolation, unauthorized denial' as verification;
rollback;
