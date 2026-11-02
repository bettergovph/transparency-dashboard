-- Exports philgeps.parquet to CSV for MeiliSearch with a deterministic id.
-- Run from data/:  duckdb < philgeps/philgeps-export.sql
--
-- id = md5 of the record's content + '-' + occurrence number among identical rows.
-- The same parquet always produces the same ids, so rebuilds don't reshuffle them.
-- The source has no natural key (reference_id is null on ~35% of rows) and some rows
-- are exact copies of each other, so the occurrence number keeps every row and keeps ids unique.
-- The id shipped in the parquet is kept as source_id.

COPY (
  WITH keyed AS (
    SELECT md5(to_json([
             reference_id, contract_no, award_title, notice_title, awardee_name,
             organization_name, area_of_delivery, business_category,
             printf('%.4f', contract_amount),
             strftime(award_date, '%Y-%m-%d %H:%M:%S'),
             award_status
           ])) AS content_hash,
           *
    FROM 'philgeps/philgeps.parquet'
  )
  SELECT content_hash || '-' || row_number() OVER (PARTITION BY content_hash ORDER BY id) AS id,
         id AS source_id,
         * EXCLUDE (id, content_hash)
  FROM keyed
  ORDER BY id
) TO 'philgeps/philgeps.csv' (HEADER, DELIMITER ',');
