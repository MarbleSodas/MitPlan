-- 0016_xivmitplan_v1_community_timelines.sql
-- User-owned/community timeline CRUD with RLS-backed public discovery.

CREATE TABLE IF NOT EXISTS community_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 128),
  description TEXT NOT NULL DEFAULT '', encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  mode ability_mode NOT NULL DEFAULT 'CURRENT',
  actions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(actions) = 'array'),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  source_timeline_id UUID REFERENCES timelines(id) ON DELETE SET NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_timelines_owner_idx ON community_timelines(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS community_timelines_public_idx ON community_timelines(is_public, updated_at DESC);
CREATE INDEX IF NOT EXISTS community_timelines_encounter_idx ON community_timelines(encounter_id, mode);

CREATE TABLE IF NOT EXISTS community_timeline_likes (
  timeline_id UUID NOT NULL REFERENCES community_timelines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (timeline_id, user_id)
);
CREATE TABLE IF NOT EXISTS community_timeline_collections (
  timeline_id UUID NOT NULL REFERENCES community_timelines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (timeline_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_timeline_likes_user_idx ON community_timeline_likes(user_id);
CREATE INDEX IF NOT EXISTS community_timeline_collections_user_idx ON community_timeline_collections(user_id);

ALTER TABLE community_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_timeline_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_timeline_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_timelines_read ON community_timelines;
CREATE POLICY community_timelines_read ON community_timelines FOR SELECT USING (is_public OR owner_id = auth.uid());
DROP POLICY IF EXISTS community_timelines_insert ON community_timelines;
CREATE POLICY community_timelines_insert ON community_timelines FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS community_timelines_update ON community_timelines;
CREATE POLICY community_timelines_update ON community_timelines FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS community_timelines_delete ON community_timelines;
CREATE POLICY community_timelines_delete ON community_timelines FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS community_timeline_likes_read ON community_timeline_likes;
CREATE POLICY community_timeline_likes_read ON community_timeline_likes FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM community_timelines t WHERE t.id = community_timeline_likes.timeline_id AND (t.is_public OR t.owner_id = auth.uid())
  )
);
DROP POLICY IF EXISTS community_timeline_likes_insert ON community_timeline_likes;
CREATE POLICY community_timeline_likes_insert ON community_timeline_likes FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM community_timelines t WHERE t.id = community_timeline_likes.timeline_id AND t.is_public)
);
DROP POLICY IF EXISTS community_timeline_likes_delete ON community_timeline_likes;
CREATE POLICY community_timeline_likes_delete ON community_timeline_likes FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS community_timeline_collections_read ON community_timeline_collections;
CREATE POLICY community_timeline_collections_read ON community_timeline_collections FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS community_timeline_collections_insert ON community_timeline_collections;
CREATE POLICY community_timeline_collections_insert ON community_timeline_collections FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM community_timelines t WHERE t.id = community_timeline_collections.timeline_id AND (t.is_public OR t.owner_id = auth.uid())
  )
);
DROP POLICY IF EXISTS community_timeline_collections_delete ON community_timeline_collections;
CREATE POLICY community_timeline_collections_delete ON community_timeline_collections FOR DELETE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION community_timelines_list(p_public_only BOOLEAN DEFAULT TRUE, p_mode TEXT DEFAULT NULL, p_query TEXT DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, owner_id UUID, name TEXT, description TEXT, encounter_id UUID, mode ability_mode, actions JSONB, is_public BOOLEAN, source_timeline_id UUID, version INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, like_count INT, collection_count INT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT t.id, t.owner_id, t.name, t.description, t.encounter_id, t.mode, t.actions, t.is_public, t.source_timeline_id, t.version, t.created_at, t.updated_at,
    (SELECT COUNT(*)::INT FROM community_timeline_likes l WHERE l.timeline_id = t.id),
    (SELECT COUNT(*)::INT FROM community_timeline_collections c WHERE c.timeline_id = t.id)
  FROM community_timelines t
  WHERE (NOT p_public_only OR t.is_public OR t.owner_id = auth.uid())
    AND (p_mode IS NULL OR p_mode = 'ALL' OR t.mode = p_mode::ability_mode)
    AND (p_query IS NULL OR t.name ILIKE '%' || p_query || '%' OR t.description ILIKE '%' || p_query || '%')
  ORDER BY t.is_public DESC, t.updated_at DESC LIMIT GREATEST(COALESCE(p_limit, 50), 1);
$$;
GRANT EXECUTE ON FUNCTION community_timelines_list(BOOLEAN, TEXT, TEXT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION community_timeline_by_id(p_id UUID)
RETURNS TABLE (id UUID, owner_id UUID, name TEXT, description TEXT, encounter_id UUID, mode ability_mode, actions JSONB, is_public BOOLEAN, source_timeline_id UUID, version INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, like_count INT, collection_count INT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT row.* FROM community_timelines_list(FALSE, NULL, NULL, 1000) AS row WHERE row.id = p_id;
$$;
GRANT EXECUTE ON FUNCTION community_timeline_by_id(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION community_timeline_create(p_name TEXT, p_description TEXT DEFAULT '', p_encounter_id UUID DEFAULT NULL, p_mode TEXT DEFAULT 'CURRENT', p_actions JSONB DEFAULT '[]'::jsonb, p_is_public BOOLEAN DEFAULT FALSE, p_source_timeline_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY INSERT INTO community_timelines(owner_id, name, description, encounter_id, mode, actions, is_public, source_timeline_id)
    VALUES(auth.uid(), p_name, COALESCE(p_description, ''), p_encounter_id, COALESCE(p_mode, 'CURRENT')::ability_mode, COALESCE(p_actions, '[]'::jsonb), COALESCE(p_is_public, FALSE), p_source_timeline_id)
    RETURNING community_timelines.id, community_timelines.created_at;
END; $$;
GRANT EXECUTE ON FUNCTION community_timeline_create(TEXT, TEXT, UUID, TEXT, JSONB, BOOLEAN, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION community_timeline_update(p_id UUID, p_name TEXT, p_description TEXT DEFAULT '', p_encounter_id UUID DEFAULT NULL, p_mode TEXT DEFAULT 'CURRENT', p_actions JSONB DEFAULT '[]'::jsonb, p_is_public BOOLEAN DEFAULT FALSE, p_source_timeline_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE changed BOOLEAN; affected INT;
BEGIN
  UPDATE community_timelines SET name=p_name, description=COALESCE(p_description, ''), encounter_id=p_encounter_id, mode=COALESCE(p_mode, 'CURRENT')::ability_mode, actions=COALESCE(p_actions, '[]'::jsonb), is_public=COALESCE(p_is_public, FALSE), source_timeline_id=p_source_timeline_id, version=version+1, updated_at=now() WHERE id=p_id AND owner_id=auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT; changed := affected > 0;
  IF NOT changed THEN RAISE EXCEPTION 'timeline not found or forbidden'; END IF;
  RETURN changed;
END; $$;
GRANT EXECUTE ON FUNCTION community_timeline_update(UUID, TEXT, TEXT, UUID, TEXT, JSONB, BOOLEAN, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION community_timeline_delete(p_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE deleted BOOLEAN; affected INT;
BEGIN DELETE FROM community_timelines WHERE id=p_id AND owner_id=auth.uid(); GET DIAGNOSTICS affected = ROW_COUNT; deleted := affected > 0; RETURN deleted; END; $$;
GRANT EXECUTE ON FUNCTION community_timeline_delete(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION community_timeline_like_toggle(p_id UUID) RETURNS TABLE(liked BOOLEAN, like_count INT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE removed_user UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM community_timelines WHERE id=p_id AND is_public) THEN RAISE EXCEPTION 'public timeline not found'; END IF;
  DELETE FROM community_timeline_likes WHERE timeline_id=p_id AND user_id=auth.uid() RETURNING user_id INTO removed_user;
  IF removed_user IS NOT NULL THEN liked := FALSE; ELSE INSERT INTO community_timeline_likes(timeline_id,user_id) VALUES(p_id,auth.uid()) ON CONFLICT DO NOTHING; liked := TRUE; END IF;
  SELECT COUNT(*)::INT INTO like_count FROM community_timeline_likes WHERE timeline_id=p_id; RETURN NEXT;
END; $$;
GRANT EXECUTE ON FUNCTION community_timeline_like_toggle(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION community_timeline_collection_toggle(p_id UUID, p_add BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF p_add THEN INSERT INTO community_timeline_collections(timeline_id,user_id) SELECT id,auth.uid() FROM community_timelines WHERE id=p_id AND (is_public OR owner_id=auth.uid()) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM community_timeline_collections WHERE timeline_id=p_id AND user_id=auth.uid(); END IF;
  RETURN p_add;
END; $$;
GRANT EXECUTE ON FUNCTION community_timeline_collection_toggle(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION community_timeline_collection_ids() RETURNS TABLE(timeline_id UUID)
LANGUAGE sql STABLE SECURITY INVOKER AS $$ SELECT c.timeline_id FROM community_timeline_collections c WHERE c.user_id=auth.uid() ORDER BY c.created_at DESC; $$;
GRANT EXECUTE ON FUNCTION community_timeline_collection_ids() TO authenticated;
