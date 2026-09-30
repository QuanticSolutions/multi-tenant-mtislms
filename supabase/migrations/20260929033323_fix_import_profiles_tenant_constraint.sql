/*
# Fix import_profiles unique constraint for multi-tenant isolation

The original unique constraint on (entity_key, name) allows cross-tenant
collisions. Add tenant_id to the constraint so each school can have its
own saved import profiles with the same name.
*/

ALTER TABLE public.import_profiles DROP CONSTRAINT IF EXISTS import_profiles_entity_key_name_key;

ALTER TABLE public.import_profiles ADD CONSTRAINT import_profiles_tenant_entity_name_key UNIQUE (tenant_id, entity_key, name);