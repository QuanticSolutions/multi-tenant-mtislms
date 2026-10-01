/*
# Faculty Chat — Data Model & RLS

1. New Tables
- `chat_channels` — id, tenant_id, name, type (direct|group|announcement), created_by, created_at.
- `chat_channel_members` — id, channel_id, user_id, joined_at.
- `chat_messages` — id, channel_id, sender_id, body, created_at, edited_at.

2. Security (RLS)
- All three tables tenant-scoped. Membership scoped to admin+teacher roles.
- chat_channels: members see channels they belong to; staff can create.
- chat_channel_members: read own; insert by self/admin/channel creator; delete by self/admin.
- chat_messages: members read; members insert (announcement = admin only); sender can update; sender/admin can delete.

3. Auto-All-Staff Channel
- Trigger on user_roles INSERT (admin or teacher): auto-add to school's All Staff channel.
*/

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'group' CHECK (type IN ('direct', 'group', 'announcement')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant ON public.chat_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON public.chat_messages(channel_id, created_at);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_channels: read if you're a member
DROP POLICY IF EXISTS "chat_channels member read" ON public.chat_channels;
CREATE POLICY "chat_channels member read" ON public.chat_channels
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channels.id AND m.user_id = auth.uid()
  ));

-- chat_channels: create — admin or teacher only
DROP POLICY IF EXISTS "chat_channels staff create" ON public.chat_channels;
CREATE POLICY "chat_channels staff create" ON public.chat_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- chat_channels: update — admin or creator
DROP POLICY IF EXISTS "chat_channels admin update" ON public.chat_channels;
CREATE POLICY "chat_channels admin update" ON public.chat_channels
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- chat_channels: delete — admin or creator
DROP POLICY IF EXISTS "chat_channels admin delete" ON public.chat_channels;
CREATE POLICY "chat_channels admin delete" ON public.chat_channels
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- chat_channel_members: read if you're a member of that channel
DROP POLICY IF EXISTS "chat_members read own channels" ON public.chat_channel_members;
CREATE POLICY "chat_members read own channels" ON public.chat_channel_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_channel_members m2
      WHERE m2.channel_id = chat_channel_members.channel_id AND m2.user_id = auth.uid()
    )
  );

-- chat_channel_members: insert — self, admin, or channel creator
DROP POLICY IF EXISTS "chat_members insert" ON public.chat_channel_members;
CREATE POLICY "chat_members insert" ON public.chat_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = chat_channel_members.channel_id AND c.created_by = auth.uid()
    )
  );

-- chat_channel_members: delete — self or admin
DROP POLICY IF EXISTS "chat_members delete" ON public.chat_channel_members;
CREATE POLICY "chat_members delete" ON public.chat_channel_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- chat_messages: read if you're a member of the channel
DROP POLICY IF EXISTS "chat_messages member read" ON public.chat_messages;
CREATE POLICY "chat_messages member read" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_messages.channel_id AND m.user_id = auth.uid()
  ));

-- chat_messages: insert — must be member; announcement channels require admin
DROP POLICY IF EXISTS "chat_messages member insert" ON public.chat_messages;
CREATE POLICY "chat_messages member insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_channel_members m
      WHERE m.channel_id = chat_messages.channel_id AND m.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND c.type = 'announcement'
        AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- chat_messages: update own messages
DROP POLICY IF EXISTS "chat_messages sender update" ON public.chat_messages;
CREATE POLICY "chat_messages sender update" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- chat_messages: delete — sender or admin
DROP POLICY IF EXISTS "chat_messages sender delete" ON public.chat_messages;
CREATE POLICY "chat_messages sender delete" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Function to ensure "All Staff" channel exists for a tenant and return its id
CREATE OR REPLACE FUNCTION public.ensure_all_staff_channel()
  RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_tenant uuid;
  v_channel uuid;
BEGIN
  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_channel
  FROM public.chat_channels
  WHERE tenant_id = v_tenant AND type = 'announcement' AND name = 'All Staff'
  LIMIT 1;

  IF v_channel IS NULL THEN
    INSERT INTO public.chat_channels (tenant_id, name, type, created_by)
    VALUES (v_tenant, 'All Staff', 'announcement', auth.uid())
    RETURNING id INTO v_channel;
  END IF;

  RETURN v_channel;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_all_staff_channel() TO authenticated;

-- Trigger: when a user gets admin or teacher role, auto-add them to All Staff channel
CREATE OR REPLACE FUNCTION public.auto_join_all_staff()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_channel uuid;
  v_tenant text;
BEGIN
  IF NEW.role NOT IN ('admin', 'teacher') THEN RETURN NEW; END IF;

  SELECT tenant_id::text INTO v_tenant FROM public.profiles WHERE id = NEW.user_id;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.current_tenant', v_tenant, true);

  v_channel := public.ensure_all_staff_channel();
  IF v_channel IS NOT NULL THEN
    INSERT INTO public.chat_channel_members (channel_id, user_id)
    VALUES (v_channel, NEW.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_join_all_staff ON public.user_roles;
CREATE TRIGGER trg_auto_join_all_staff
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.auto_join_all_staff();