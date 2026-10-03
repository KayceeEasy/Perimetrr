-- Run only with --atomic --check --apply. All fixtures and schema changes roll back.
create function pg_temp.assert_true(p_ok boolean,p_message text) returns void language plpgsql as $$
begin if not coalesce(p_ok,false) then raise exception 'TEST FAILED: %',p_message; end if; end;
$$;
grant execute on function pg_temp.assert_true(boolean,text) to authenticated,anon;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
 org_a uuid; org_b uuid; ta public.tenants; ta2 public.tenants; tb public.tenants;
 target uuid:=gen_random_uuid(); lead uuid:=gen_random_uuid(); foreign_lead uuid:=gen_random_uuid();
 old_device uuid:=gen_random_uuid(); new_device uuid:=gen_random_uuid(); third_device uuid:=gen_random_uuid(); lead_device uuid:=gen_random_uuid();
 request jsonb; result jsonb; request_id uuid; first_id uuid; office_a uuid; office_b uuid; attempt integer;
begin
 insert into auth.users(id,email,email_confirmed_at,aud,role) values
 (a,a::text||'@example.invalid',now(),'authenticated','authenticated'),
 (b,b::text||'@example.invalid',now(),'authenticated','authenticated'),
 (c,c::text||'@example.invalid',now(),'authenticated','authenticated');
 perform set_config('request.jwt.claim.sub',a::text,true);
 org_a:=(public.create_enterprise_organization('Audit Organization A')->>'organization_id')::uuid;
 ta:=public.create_organization_workspace(org_a,'Audit Branch A1','Office',6.5,3.3,100,'Africa/Lagos');
 ta2:=public.create_organization_workspace(org_a,'Audit Branch A2','Office',6.5,3.3,100,'Africa/Lagos');
 perform pg_temp.assert_true(ta.plan_tier='free','Organization setup must not self-assign paid entitlement');
 perform set_config('request.jwt.claim.sub',b::text,true);
 org_b:=(public.create_enterprise_organization('Audit Organization B')->>'organization_id')::uuid;
 tb:=public.create_organization_workspace(org_b,'Audit Branch B1','Office',6.5,3.3,100,'Africa/Lagos');
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform pg_temp.assert_true(public.is_tenant_admin(ta.id) and public.is_tenant_admin(ta2.id) and not public.is_tenant_admin(tb.id),'Organization membership must stop at organization boundary');
 perform pg_temp.assert_true(jsonb_array_length(public.get_admin_workspaces())=2,'Only two authorized branches should be listed');
 perform pg_temp.assert_true(jsonb_array_length(public.get_organization_overview(org_a)->'workspaces')=2,'Watch Tower scoped overview');
 begin perform public.get_organization_overview(org_b); raise exception 'TEST FAILED: foreign organization overview allowed'; exception when insufficient_privilege then null; end;
 begin perform public.manage_tenant_staff('list',tb.slug); raise exception 'TEST FAILED: foreign staff readable'; exception when insufficient_privilege then null; end;
 begin perform public.attach_organization_workspace(org_a,tb.id); raise exception 'TEST FAILED: foreign branch attached'; exception when insufficient_privilege then null; end;
 perform public.manage_organization_member(org_a,c::text||'@example.invalid','grant');
 perform set_config('request.jwt.claim.sub',c::text,true);
 perform pg_temp.assert_true(public.is_tenant_admin(ta2.id) and not public.is_tenant_admin(tb.id),'Delegated organization access must be scoped');
 begin perform public.manage_organization_member(org_a,b::text||'@example.invalid','grant'); raise exception 'TEST FAILED: non-owner granted personnel access'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.manage_organization_member(org_a,c::text||'@example.invalid','revoke');
 perform set_config('request.jwt.claim.sub',c::text,true);
 perform pg_temp.assert_true(not public.is_tenant_admin(ta.id),'Organization revocation must take effect immediately');
 perform set_config('request.jwt.claim.sub',a::text,true);
 select id into office_a from public.offices where tenant_id=ta.id limit 1;
 select id into office_b from public.offices where tenant_id=tb.id limit 1;
 insert into public.staff(id,tenant_id,office_id,name,device_id,is_team_lead) values
 (target,ta.id,office_a,'Audit Employee',old_device,false),
 (lead,ta.id,office_a,'Audit Lead',lead_device,true),
 (foreign_lead,tb.id,office_b,'Foreign Audit Lead',gen_random_uuid(),true);
 perform pg_temp.assert_true(not exists(select 1 from public.record_attendance(target,null,'in',6.5,3.3) where ok),'Null device rejected');
 perform pg_temp.assert_true(not exists(select 1 from public.record_attendance(target,old_device,'in',null,null) where ok),'Null GPS rejected');
 perform pg_temp.assert_true(exists(select 1 from public.record_attendance(target,old_device,'in',6.5,3.3) where ok and status='on_site'),'Original device attendance');
 request:=public.request_device_transfer(target,new_device); request_id:=(request->>'request_id')::uuid; first_id:=request_id;
 perform pg_temp.assert_true((request->>'ok')::boolean,'Transfer request created');
 perform pg_temp.assert_true(public.request_device_transfer(target,new_device)->>'request_id'=request_id::text,'Request replay must be idempotent');
 perform pg_temp.assert_true(not (public.request_device_transfer(target,third_device)->>'ok')::boolean,'Another device cannot replace pending request');
 perform pg_temp.assert_true(exists(select 1 from public.record_attendance(target,new_device,'in',6.5,3.3) where ok and status='provisional_transfer'),'Pending device records provisional attendance');
 perform public.record_attendance(target,new_device,'out',0,0);
 perform pg_temp.assert_true(not (public.approve_device_transfer_by_lead(target,request->>'transfer_code',foreign_lead,(select device_id from public.staff where id=foreign_lead))->>'ok')::boolean,'Cross-tenant lead approval denied');
 perform set_config('request.jwt.claim.sub',b::text,true);
 begin perform public.admin_resolve_device_transfer(request_id,'approve'); raise exception 'TEST FAILED: foreign admin resolved transfer'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 result:=public.admin_resolve_device_transfer(request_id,'approve');
 perform pg_temp.assert_true((result->>'ok')::boolean and (result->>'reconciled_records')::int=1,'Exactly one provisional row reconciled');
 perform pg_temp.assert_true(exists(select 1 from public.attendance_logs where staff_id=target and transfer_request_id=request_id and status='on_site' and original_status='provisional_transfer' and transfer_resolved_at is not null),'Approval retains original status and resolution audit');
 perform pg_temp.assert_true(exists(select 1 from public.attendance_logs where staff_id=target and transfer_request_id=request_id and status='outside_perimeter'),'Approval must not normalize outside-perimeter attempts');
 perform pg_temp.assert_true(not exists(select 1 from public.verify_staff_device(target,old_device) where ok),'Old credential revoked');
 request:=public.request_device_transfer(target,third_device); request_id:=(request->>'request_id')::uuid;
 perform public.record_attendance(target,third_device,'out',6.5,3.3);
 result:=public.admin_resolve_device_transfer(request_id,'reject');
 perform pg_temp.assert_true((result->>'ok')::boolean and (result->>'reconciled_records')::int=1,'Rejection reconciles only its pending attendance');
 perform pg_temp.assert_true(exists(select 1 from public.attendance_logs where transfer_request_id=request_id and status='rejected'),'Rejected request attendance is rejected');
 request:=public.request_device_transfer(target,third_device); request_id:=(request->>'request_id')::uuid;
 perform public.record_attendance(target,third_device,'out',6.5,3.3);
 perform pg_temp.assert_true(not (public.approve_device_transfer_by_lead(target,'incorrect',lead,lead_device)->>'ok')::boolean,'Incorrect code rejected');
 result:=public.approve_device_transfer_by_lead(target,request->>'transfer_code',lead,lead_device);
 perform pg_temp.assert_true((result->>'ok')::boolean,'Same-tenant lead approval works');
 perform pg_temp.assert_true((select count(*) from public.device_transfer_requests where staff_id=target and status='approved')=2,'Multiple approved requests preserved in history');
 perform pg_temp.assert_true(exists(select 1 from public.device_transfer_requests where id=request_id and resolved_by_staff_id=lead),'Lead actor audited');
 perform pg_temp.assert_true(exists(select 1 from public.attendance_logs where transfer_request_id=first_id and status='on_site'),'Later rejection must not modify earlier approved records');
 perform pg_temp.assert_true(not (public.get_staff_attendance(target,old_device)->>'ok')::boolean,'Revoked credential cannot read history');
 perform pg_temp.assert_true((public.get_staff_attendance(target,third_device)->>'ok')::boolean,'Approved credential reads own history');
 request:=public.request_device_transfer(target,old_device); request_id:=(request->>'request_id')::uuid;
 perform public.record_attendance(target,old_device,'in',6.5,3.3);
 for attempt in 1..5 loop perform public.approve_device_transfer_by_lead(target,'wrong',lead,lead_device); end loop;
 perform pg_temp.assert_true(not (public.approve_device_transfer_by_lead(target,request->>'transfer_code',lead,lead_device)->>'ok')::boolean,'Five wrong codes require administrator review');
 perform pg_temp.assert_true((public.admin_resolve_device_transfer(request_id,'approve')->>'ok')::boolean,'Administrator can resolve code-locked request');
 request:=public.request_device_transfer(target,new_device); request_id:=(request->>'request_id')::uuid;
 perform public.record_attendance(target,new_device,'in',6.5,3.3);
 update public.device_transfer_requests set expires_at=now()-interval '1 minute' where id=request_id;
 perform pg_temp.assert_true(not exists(select 1 from public.verify_staff_device(target,new_device) where ok),'Expired pending credential cannot verify');
 perform pg_temp.assert_true(not (public.admin_resolve_device_transfer(request_id,'approve')->>'ok')::boolean,'Expired request cannot be approved');
 perform pg_temp.assert_true((public.admin_resolve_device_transfer(request_id,'reject')->>'ok')::boolean,'Expired request can be rejected with audit');
 perform pg_temp.assert_true(not exists(select 1 from public.get_workspace_staff(ta.workspace_code) row where to_jsonb(row) ? 'device_id'),'Public staff directory cannot expose credentials');
 update public.tenants set subscription_status='trialing' where id=ta.id;
 perform pg_temp.assert_true(exists(select 1 from public.get_workspace_for_pairing(ta.workspace_code)),'Trial workspace can pair');
 update public.tenants set subscription_status='suspended' where id=ta.id;
 perform pg_temp.assert_true(not exists(select 1 from public.get_workspace_staff(ta.workspace_code)),'Suspended workspace roster unavailable');
 perform pg_temp.assert_true(public.get_workspace_config(ta.slug) is null,'Suspended workspace config unavailable');
 update public.tenants set subscription_status='active' where id=ta.id;
 perform pg_temp.assert_true(not has_function_privilege('anon','public.manage_tenant_staff(text,text,jsonb)','EXECUTE'),'Anonymous staff administration revoked');
 perform pg_temp.assert_true(not has_function_privilege('anon','public.admin_resolve_device_transfer(uuid,text)','EXECUTE'),'Anonymous transfer administration revoked');
 perform pg_temp.assert_true(not has_schema_privilege('authenticated','perimetrr_private','USAGE'),'Private resolver schema inaccessible');
 perform pg_temp.assert_true(not has_table_privilege('anon','public.push_subscriptions','INSERT'),'Spoofed anonymous push enrollment denied');
 perform set_config('perimetrr.test_fixture',jsonb_build_object('a',a,'b',b,'ta',ta.id,'ta_slug',ta.slug,'ta_code',ta.workspace_code,'ta2',ta2.id,'tb',tb.id,'tb_slug',tb.slug,'org_a',org_a,'org_b',org_b,'staff',target,'device',old_device)::text,true);
end;
$$;
set local role authenticated;
do $$
declare f jsonb:=current_setting('perimetrr.test_fixture')::jsonb;
begin
 perform set_config('request.jwt.claim.sub',f->>'a',true);
 perform pg_temp.assert_true(jsonb_array_length(api.get_admin_workspaces())=2,'API filters unrelated company workspaces');
 begin perform 1 from public.tenants; raise exception 'TEST FAILED: browser direct table access allowed'; exception when insufficient_privilege then null; end;
 begin update public.tenants set organization_id=(f->>'org_b')::uuid where id=(f->>'ta')::uuid; raise exception 'TEST FAILED: browser changed organization ownership'; exception when insufficient_privilege then null; end;
 begin update public.tenants set plan_tier='enterprise' where id=(f->>'ta')::uuid; raise exception 'TEST FAILED: browser assigned paid entitlement'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
set local role anon;
do $$
begin
 begin perform public.get_admin_workspaces(); raise exception 'TEST FAILED: anonymous admin RPC allowed'; exception when insufficient_privilege then null; end;
 begin perform public.get_fleet_overview(); raise exception 'TEST FAILED: anonymous overview allowed'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select 'PASS: organization boundaries, RLS, grants, entitlement protection, and transfer reconciliation' as result;
