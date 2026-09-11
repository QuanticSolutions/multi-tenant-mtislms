CREATE OR REPLACE FUNCTION public.merge_staff_import(_entity text, _values jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_table text;
  v_key text;
  v_allowed text[];
  v_payload jsonb;
  v_existing jsonb;
  v_patch jsonb := '{}'::jsonb;
  v_id uuid;
  v_department uuid;
  v_teaching boolean;
  v_columns text;
  v_select text;
  v_set text;
  v_field text;
  v_value jsonb;
  v_preserved integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF jsonb_typeof(_values) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Import values must be an object';
  END IF;
  IF _entity = 'departments' THEN
    v_table := 'departments'; v_key := 'name';
    v_allowed := ARRAY['name','is_teaching'];
  ELSIF _entity = 'employees' THEN
    v_table := 'teachers'; v_key := 'employee_no';
    v_allowed := ARRAY['employee_no','full_name','department_id','email','phone','designation','base_salary','date_of_joining','status','gender','date_of_birth','address'];
  ELSIF _entity = 'teachers' THEN
    v_table := 'teachers'; v_key := 'employee_no';
    v_allowed := ARRAY['employee_no','full_name','department_id','email','phone','gender','date_of_birth','qualification','specialization','date_of_joining','status','address','subject_id','fee_group_id'];
  ELSE
    RAISE EXCEPTION 'Unsupported staff import entity';
  END IF;
  SELECT coalesce(jsonb_object_agg(key, CASE WHEN jsonb_typeof(value) = 'string' THEN to_jsonb(btrim(value #>> '{}')) ELSE value END), '{}'::jsonb)
  INTO v_payload FROM jsonb_each(_values)
  WHERE key = ANY(v_allowed) AND value <> 'null'::jsonb AND btrim(value #>> '{}') <> '';
  IF coalesce(v_payload->>v_key, '') = '' THEN RAISE EXCEPTION 'Missing record identifier'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_table || ':' || (v_payload->>v_key), 0));
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %I = $1 FOR UPDATE', v_table, v_key)
    INTO v_existing USING v_payload->>v_key;
  IF v_table = 'teachers' THEN
    IF v_existing IS NULL AND (NOT v_payload ? 'full_name' OR NOT v_payload ? 'date_of_joining' OR NOT v_payload ? 'department_id') THEN
      RAISE EXCEPTION 'New employees require full name, date of joining and department';
    END IF;
    v_department := coalesce(nullif(v_existing->>'department_id',''), v_payload->>'department_id')::uuid;
    IF v_department IS NULL THEN RAISE EXCEPTION 'Department is required'; END IF;
    SELECT is_teaching INTO v_teaching FROM public.departments WHERE id = v_department;
    IF NOT FOUND THEN RAISE EXCEPTION 'Department was not found'; END IF;
    IF _entity = 'teachers' AND NOT v_teaching THEN
      RAISE EXCEPTION 'Employee belongs to a non-teaching department; review the employee department before importing teaching details';
    END IF;
    IF v_payload ? 'base_salary' AND (v_payload->>'base_salary')::numeric < 0 THEN
      RAISE EXCEPTION 'Base salary cannot be negative';
    END IF;
  ELSIF v_existing IS NULL AND NOT v_payload ? 'is_teaching' THEN
    RAISE EXCEPTION 'New departments require the teaching flag';
  END IF;
  IF v_existing IS NOT NULL THEN
    v_id := (v_existing->>'id')::uuid;
    FOR v_field, v_value IN SELECT key, value FROM jsonb_each(v_payload) LOOP
      IF v_field = v_key THEN CONTINUE; END IF;
      IF v_existing->v_field IS NULL OR v_existing->v_field = 'null'::jsonb OR v_existing->>v_field = '' THEN
        v_patch := v_patch || jsonb_build_object(v_field, v_value);
      ELSIF v_existing->v_field IS DISTINCT FROM v_value THEN
        v_preserved := v_preserved + 1;
      END IF;
    END LOOP;
    IF v_patch = '{}'::jsonb THEN
      RETURN jsonb_build_object('status','skipped','reason', CASE WHEN v_preserved > 0 THEN 'Existing values preserved; no empty fields to complete' ELSE 'Already complete; no changes' END);
    END IF;
    SELECT string_agg(format('%I = (jsonb_populate_record(NULL::public.%I, $1)).%I', key, v_table, key), ', ')
      INTO v_set FROM jsonb_object_keys(v_patch) AS keys(key);
    EXECUTE format('UPDATE public.%I SET %s WHERE id = $2 RETURNING id', v_table, v_set)
      INTO v_id USING v_patch, v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Record could not be updated'; END IF;
    RETURN jsonb_build_object('status','updated','reason', CASE WHEN v_preserved > 0 THEN 'Empty fields completed; existing values preserved' ELSE 'Empty fields completed' END);
  END IF;
  SELECT string_agg(format('%I', key), ', '), string_agg(format('(jsonb_populate_record(NULL::public.%I, $1)).%I', v_table, key), ', ')
    INTO v_columns, v_select FROM jsonb_object_keys(v_payload) AS keys(key);
  EXECUTE format('INSERT INTO public.%I (%s) SELECT %s RETURNING id', v_table, v_columns, v_select)
    INTO v_id USING v_payload;
  RETURN jsonb_build_object('status','inserted');
END;
$$;
REVOKE ALL ON FUNCTION public.merge_staff_import(text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_staff_import(text,jsonb) TO authenticated;
