-- Metadata only: no accounts, attendance, device credentials, or customer rows.
select jsonb_build_object(
 'schemas',(select jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl)) from pg_namespace where nspname in ('public','api','perimetrr_private')),
 'public_usage',(select jsonb_agg(jsonb_build_object('role',rolname,'usage',has_schema_privilege(oid,'public','USAGE'),'create',has_schema_privilege(oid,'public','CREATE'))) from pg_roles),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'args',pg_get_function_arguments(p.oid),'result',pg_get_function_result(p.oid),'acl',p.proacl)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e')),
 'extensions',(select jsonb_agg(jsonb_build_object('name',extname,'version',extversion,'schema',n.nspname)) from pg_extension e join pg_namespace n on n.oid=e.extnamespace),
 'role_settings',(select jsonb_agg(jsonb_build_object('role',pg_get_userbyid(setrole),'settings',setconfig)) from pg_db_role_setting where setrole in (select oid from pg_roles where rolname in ('anon','authenticated','authenticator'))),
 'publications',(select jsonb_agg(jsonb_build_object('name',pubname,'schema',schemaname,'table',tablename)) from pg_publication_tables where schemaname='public')
) as inspection;
