-- Installed once by the recovery script. Kept in source for self-hosted deployments.
CREATE TABLE IF NOT EXISTS app_snapshot_versions (
  id bigserial PRIMARY KEY, key text NOT NULL, revision bigint NOT NULL,
  payload text NOT NULL, saved_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION bitepay_guard_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE field text; rows jsonb; row jsonb; incoming jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Data protection: snapshots cannot be deleted'; END IF;
  incoming := NEW.payload::jsonb;
  IF jsonb_typeof(incoming) <> 'object' THEN RAISE EXCEPTION 'Invalid snapshot'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.revision <> OLD.revision + 1 THEN RAISE EXCEPTION 'Data protection: stale snapshot revision'; END IF;
    FOR field, rows IN SELECT * FROM jsonb_each(OLD.payload::jsonb) LOOP
      IF jsonb_typeof(rows) = 'array' THEN
        FOR row IN SELECT * FROM jsonb_array_elements(rows) LOOP
          IF row ? 'id' AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(incoming->field)='array' THEN incoming->field ELSE '[]'::jsonb END) item
            WHERE item->'id' = row->'id'
          ) THEN RAISE EXCEPTION 'Data protection: % records cannot be removed', field; END IF;
        END LOOP;
      ELSIF field='treasuries' THEN
        IF NOT COALESCE(incoming->field ?& ARRAY(SELECT jsonb_object_keys(rows)), false) THEN
          RAISE EXCEPTION 'Data protection: treasury records cannot be removed';
        END IF;
      END IF;
    END LOOP;
    INSERT INTO app_snapshot_versions(key, revision, payload) VALUES (OLD.key, OLD.revision, OLD.payload);
  END IF;
  INSERT INTO app_snapshot_versions(key, revision, payload) VALUES (NEW.key, NEW.revision, NEW.payload);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bitepay_snapshot_guard ON app_snapshots;
CREATE TRIGGER bitepay_snapshot_guard BEFORE INSERT OR UPDATE OR DELETE ON app_snapshots
FOR EACH ROW EXECUTE FUNCTION bitepay_guard_snapshot();