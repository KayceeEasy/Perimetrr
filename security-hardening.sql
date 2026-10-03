-- Apply atomically with enterprise-and-transfers.sql. No data is deleted.
BEGIN;
CREATE OR REPLACE FUNCTION public.manage_tenant_staff(p_action text, p_tenant_slug text, p_staff_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant public.tenants%rowtype;
  v_office_id uuid;
  v_res jsonb;
  v_item jsonb;
  v_count int := 0;
begin
  select * into v_tenant from public.tenants where slug = lower(trim(p_tenant_slug));
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Workspace not found.');
  end if;

  if not public.is_tenant_admin(v_tenant.id) then
    raise exception 'Workspace administrator required.' using errcode = '42501';
  end if;

  select id into v_office_id from public.offices where tenant_id = v_tenant.id and is_active limit 1;

  if lower(p_action) = 'list' then
    select jsonb_agg(s_sub) into v_res from (
      select s.id, s.name, s.department as dept, s.department, s.schedule_policy,
             s.is_team_lead, s.include_in_reports, (s.device_id is not null) as device_linked, s.device_bound_at, s.created_at
      from public.staff s
      where s.tenant_id = v_tenant.id and s.is_active = true
      order by s.name
    ) s_sub;
    return jsonb_build_object('ok', true, 'staff', coalesce(v_res, '[]'::jsonb));

  elsif lower(p_action) = 'add' or lower(p_action) = 'create' then
    insert into public.staff (tenant_id, office_id, name, department, schedule_policy, is_team_lead, include_in_reports)
    values (
      v_tenant.id,
      v_office_id,
      trim(p_staff_data->>'name'),
      coalesce(nullif(trim(p_staff_data->>'dept'), ''), nullif(trim(p_staff_data->>'department'), ''), 'General'),
      coalesce(nullif(trim(p_staff_data->>'schedule_policy'), ''), 'weekly_hybrid'),
      coalesce((p_staff_data->>'is_team_lead')::boolean, false),
      coalesce((p_staff_data->>'include_in_reports')::boolean, true)
    )
    on conflict (tenant_id, name) do update set
      department = excluded.department,
      schedule_policy = excluded.schedule_policy,
      is_team_lead = excluded.is_team_lead,
      include_in_reports = excluded.include_in_reports,
      is_active = true,
      updated_at = now();

    return jsonb_build_object('ok', true, 'message', 'Staff profile saved successfully.');

  elsif lower(p_action) = 'update' then
    update public.staff
    set
      department = coalesce(nullif(trim(p_staff_data->>'dept'), ''), nullif(trim(p_staff_data->>'department'), ''), department),
      schedule_policy = coalesce(nullif(trim(p_staff_data->>'schedule_policy'), ''), schedule_policy),
      is_team_lead = coalesce((p_staff_data->>'is_team_lead')::boolean, is_team_lead),
      include_in_reports = coalesce((p_staff_data->>'include_in_reports')::boolean, include_in_reports),
      updated_at = now()
    where tenant_id = v_tenant.id and (id = (p_staff_data->>'id')::uuid or lower(name) = lower(trim(p_staff_data->>'name')));

    return jsonb_build_object('ok', true, 'message', 'Staff profile updated successfully.');

  elsif lower(p_action) = 'delete' or lower(p_action) = 'remove' then
    update public.staff
    set is_active = false, updated_at = now()
    where tenant_id = v_tenant.id and (id = (p_staff_data->>'id')::uuid or lower(name) = lower(trim(p_staff_data->>'name')));

    return jsonb_build_object('ok', true, 'message', 'Staff member removed successfully.');

  elsif lower(p_action) = 'reset_lock' then
    update public.staff
    set device_id = null, device_bound_at = null, updated_at = now()
    where tenant_id = v_tenant.id and (id = (p_staff_data->>'id')::uuid or lower(name) = lower(trim(p_staff_data->>'name')));

    return jsonb_build_object('ok', true, 'message', 'Device lock reset successfully.');

  elsif lower(p_action) = 'reset_all_locks' then
    update public.staff
    set device_id = null, device_bound_at = null, updated_at = now()
    where tenant_id = v_tenant.id and is_active = true;

    return jsonb_build_object('ok', true, 'message', 'All device locks reset successfully.');

  elsif lower(p_action) = 'batch_import' then
    for v_item in select * from jsonb_array_elements(p_staff_data)
    loop
      if trim(v_item->>'name') is not null and trim(v_item->>'name') <> '' then
        insert into public.staff (tenant_id, office_id, name, department, schedule_policy, is_team_lead, include_in_reports)
        values (
          v_tenant.id,
          v_office_id,
          trim(v_item->>'name'),
          coalesce(nullif(trim(v_item->>'dept'), ''), nullif(trim(v_item->>'department'), ''), 'General'),
          coalesce(nullif(trim(v_item->>'schedule_policy'), ''), 'weekly_hybrid'),
          coalesce((v_item->>'is_team_lead')::boolean, false),
          coalesce((v_item->>'include_in_reports')::boolean, true)
        )
        on conflict (tenant_id, name) do update set
          department = excluded.department,
          schedule_policy = excluded.schedule_policy,
          is_team_lead = excluded.is_team_lead,
          include_in_reports = excluded.include_in_reports,
          is_active = true,
          updated_at = now();
        v_count := v_count + 1;
      end if;
    end loop;

    return jsonb_build_object('ok', true, 'message', format('Successfully processed %s staff records.', v_count), 'count', v_count);

  else
    return jsonb_build_object('ok', false, 'message', 'Unknown action');
  end if;
end;
$function$;
REVOKE EXECUTE ON FUNCTION public.manage_tenant_staff(text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_tenant_staff(text,text,jsonb) TO authenticated;
COMMIT;
