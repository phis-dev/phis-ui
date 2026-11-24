BEGIN;

-- One stored Overlay node, its geometry restated as the block's pairs (OVERLAYS.md, "Geometry").
CREATE FUNCTION pg_temp.phi_overlay_geometry(node jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  config jsonb := node->'config';
  axis text;
  width jsonb;
  size_width jsonb;
  max_width jsonb;
BEGIN
  IF jsonb_typeof(config) IS DISTINCT FROM 'object' THEN
    RETURN node;
  END IF;
  IF node->>'overlayType' = 'drawer' THEN
    -- A Drawer's single length was the axis it opens along.
    axis := CASE WHEN config->>'placement' IN ('top', 'bottom') THEN 'height' ELSE 'width' END;
    IF jsonb_typeof(config->'size') IN ('number', 'string') THEN
      config := jsonb_set(config, '{size}', jsonb_build_object(axis, config->'size'));
    END IF;
    IF jsonb_typeof(config->'maxSize') IN ('number', 'string') THEN
      config := jsonb_set(config, '{maxSize}', jsonb_build_object(axis, config->'maxSize'));
    END IF;
    config := config - 'width';
  ELSE
    -- A Modal never read a scalar size or maxSize; the block reader would take either as a width now.
    IF jsonb_typeof(config->'size') IN ('number', 'string') THEN config := config - 'size'; END IF;
    IF jsonb_typeof(config->'maxSize') IN ('number', 'string') THEN config := config - 'maxSize'; END IF;
    IF config ? 'width' THEN
      width := config->'width';
      IF jsonb_typeof(width) = 'object' THEN
        -- The width of the widest room; a vw at medium beside a wide width was the viewport limit.
        size_width := coalesce(width->'wide', width->'medium', width->'compact');
        IF width ? 'wide' AND width->>'medium' LIKE '%vw%' THEN
          max_width := width->'medium';
        END IF;
      ELSIF jsonb_typeof(width) IN ('number', 'string') THEN
        size_width := width;
      END IF;
      -- The phone width (`calc(100vw - 32px)`) is the Modal's own viewport hold now, not a size.
      IF size_width #>> '{}' LIKE 'calc(100vw - %' THEN
        size_width := NULL;
      END IF;
      config := config - 'width';
      IF size_width IS NOT NULL THEN
        config := jsonb_set(config, '{size}',
          (CASE WHEN jsonb_typeof(config->'size') = 'object' THEN config->'size' ELSE '{}'::jsonb END)
            || jsonb_build_object('width', size_width));
      END IF;
      IF max_width IS NOT NULL THEN
        config := jsonb_set(config, '{maxSize}',
          (CASE WHEN jsonb_typeof(config->'maxSize') = 'object' THEN config->'maxSize' ELSE '{}'::jsonb END)
            || jsonb_build_object('width', max_width));
      END IF;
    END IF;
  END IF;
  RETURN jsonb_set(node, '{config}', config);
END $$;

-- Whether a stored Overlay node still carries the old geometry.
CREATE FUNCTION pg_temp.phi_overlay_needs_sweep(node jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_typeof(node->'config') = 'object' AND (
    node->'config' ? 'width'
    OR jsonb_typeof(node->'config'->'size') IN ('number', 'string')
    OR jsonb_typeof(node->'config'->'maxSize') IN ('number', 'string')), false)
$$;

UPDATE phis.site_area_revisions r
SET tree_json = jsonb_set(r.tree_json, '{overlays}', (
  SELECT jsonb_agg(pg_temp.phi_overlay_geometry(e.node) ORDER BY e.ord)
  FROM jsonb_array_elements(r.tree_json->'overlays') WITH ORDINALITY AS e(node, ord)))
WHERE jsonb_typeof(r.tree_json->'overlays') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.tree_json->'overlays') o WHERE pg_temp.phi_overlay_needs_sweep(o));

UPDATE phis.site_page_revisions r
SET tree_json = jsonb_set(r.tree_json, '{overlays}', (
  SELECT jsonb_agg(pg_temp.phi_overlay_geometry(e.node) ORDER BY e.ord)
  FROM jsonb_array_elements(r.tree_json->'overlays') WITH ORDINALITY AS e(node, ord)))
WHERE jsonb_typeof(r.tree_json->'overlays') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.tree_json->'overlays') o WHERE pg_temp.phi_overlay_needs_sweep(o));

-- Check: both counts 0.
SELECT 'area', count(*) FROM phis.site_area_revisions r, jsonb_array_elements(
  CASE WHEN jsonb_typeof(r.tree_json->'overlays') = 'array' THEN r.tree_json->'overlays' ELSE '[]' END) o
  WHERE pg_temp.phi_overlay_needs_sweep(o)
UNION ALL
SELECT 'page', count(*) FROM phis.site_page_revisions r, jsonb_array_elements(
  CASE WHEN jsonb_typeof(r.tree_json->'overlays') = 'array' THEN r.tree_json->'overlays' ELSE '[]' END) o
  WHERE pg_temp.phi_overlay_needs_sweep(o);

COMMIT;
