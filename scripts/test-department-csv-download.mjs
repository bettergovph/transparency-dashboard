#!/usr/bin/env node
/**
 * Department CSV Download Integration Test
 *
 * Exercises the exact same Meilisearch query and CSV-building logic used by
 * the "Raw Data CSV" button on the Department page, then:
 *   1. Parses the generated CSV back into rows.
 *   2. Compares aggregated totals (row count, sum of amounts, per-agency
 *      breakdown) against the pre-computed aggregates in
 *      public/data/gaa/aggregates/departments.json + agencies.json.
 *
 * This verifies that the raw data surfaced to users in the CSV download is
 * consistent with the numbers displayed on the page.
 *
 * Usage:
 *   node scripts/test-department-csv-download.mjs [--slug <dept-slug>] [--year <year>]
 *
 * Defaults: slug = department-of-information-and-communications-technology-dict
 *           year = 2026
 *
 * Env: reads VITE_MEILISEARCH_HOST / VITE_MEILISEARCH_API_KEY from .env
 */

import { MeiliSearch } from 'meilisearch';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MEILISEARCH_HOST = process.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.VITE_MEILISEARCH_API_KEY || '';

// ── CLI args ────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = { slug: 'department-of-information-and-communications-technology-dict', year: 2026 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug' && argv[i + 1]) { args.slug = argv[++i]; }
    else if (argv[i] === '--year' && argv[i + 1]) { args.year = parseInt(argv[++i], 10); }
  }
  return args;
}

// ── Test runner ─────────────────────────────────────────────────────────────
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[31m${err.message}\x1b[0m`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}\n      expected: ${expected}\n      actual:   ${actual}`);
  }
}

function assertClose(actual, expected, tolerance, msg) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`${msg}\n      expected: ${expected}\n      actual:   ${actual}\n      diff:     ${diff} (tolerance ${tolerance})`);
  }
}

// ── CSV helpers (mirror component logic) ────────────────────────────────────
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(hits) {
  const headers = [
    'id', 'year', 'amount', 'description', 'department', 'agency',
    'operating_unit', 'fund_subcategory', 'expense_code', 'expense_description',
    'object_code', 'object_description',
    'sub_object_code', 'sub_object_description',
    'division',
  ];
  const rows = hits.map(doc => [
    escapeCSV(doc.id),
    escapeCSV(doc.year),
    escapeCSV(doc.amt),
    escapeCSV(doc.dsc),
    escapeCSV(doc.uacs_dpt_dsc),
    escapeCSV(doc.uacs_agy_dsc),
    escapeCSV(doc.uacs_oper_dsc),
    escapeCSV(doc.uacs_fundsubcat_dsc),
    escapeCSV(doc.uacs_exp_cd),
    escapeCSV(doc.uacs_exp_dsc),
    escapeCSV(doc.uacs_obj_cd),
    escapeCSV(doc.uacs_obj_dsc),
    escapeCSV(doc.uacs_sobj_cd),
    escapeCSV(doc.uacs_sobj_dsc),
    escapeCSV(doc.uacs_div_dsc),
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

// RFC 4180-ish CSV parser (handles quoted fields, escaped quotes, embedded commas/newlines).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0];
  const records = rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = r[idx]; });
    return o;
  });
  return { headers, records };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const { slug, year } = parseArgs();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' Department Raw-Data CSV Download Test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Department slug: ${slug}`);
  console.log(`  Year:            ${year}`);
  console.log(`  Meilisearch:     ${MEILISEARCH_HOST}`);
  console.log('───────────────────────────────────────────────────────────\n');

  // Load aggregates (ground truth for the department page)
  const deptJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/gaa/aggregates/departments.json'), 'utf8'));
  const agenciesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/gaa/aggregates/agencies.json'), 'utf8'));

  const department = deptJson.data.find(d => d.slug === slug);
  if (!department) {
    console.error(`\x1b[31mDepartment with slug "${slug}" not found in departments.json.\x1b[0m`);
    process.exit(1);
  }
  const expected = department.years[String(year)];
  if (!expected) {
    console.error(`\x1b[31mNo aggregate data for ${department.description} in year ${year}.\x1b[0m`);
    process.exit(1);
  }
  const expectedAgencies = agenciesJson.data.filter(
    a => a.department_id === department.id && a.years[String(year)] && a.years[String(year)].amount > 0
  );

  console.log(`  Department:      ${department.description} (id=${department.id})`);
  console.log(`  Expected total:  amount=${expected.amount.toLocaleString()} count=${expected.count.toLocaleString()}`);
  console.log(`  Expected active agencies: ${expectedAgencies.length}\n`);

  // Fetch raw hits from Meilisearch (same logic as downloadRawCSV)
  const client = new MeiliSearch({ host: MEILISEARCH_HOST, apiKey: MEILISEARCH_API_KEY });
  const index = client.index('gaa');
  const filter = `year = ${year} AND uacs_dpt_dsc = "${department.description.replace(/"/g, '\\"')}"`;
  const batchSize = 1000;
  const allHits = [];
  let total = 0;
  console.log('Fetching raw line items from Meilisearch...');
  const first = await index.search('', { filter, limit: batchSize, offset: 0 });
  allHits.push(...first.hits);
  total = first.estimatedTotalHits;
  process.stdout.write(`  fetched ${allHits.length}/${total}\r`);
  let offset = batchSize;
  while (offset < total) {
    const next = await index.search('', { filter, limit: batchSize, offset });
    if (next.hits.length === 0) break;
    allHits.push(...next.hits);
    offset += batchSize;
    process.stdout.write(`  fetched ${allHits.length}/${total}\r`);
  }
  process.stdout.write(`  fetched ${allHits.length}/${total}\n\n`);

  // Build CSV (same function as the component) and parse it back
  const csv = buildCSV(allHits);
  const { headers, records } = parseCSV(csv);

  console.log('Running assertions:\n');

  test('CSV has the expected header row', () => {
    assertEqual(
      headers.join(','),
      'id,year,amount,description,department,agency,operating_unit,fund_subcategory,expense_code,expense_description,object_code,object_description,sub_object_code,sub_object_description,division',
      'Header mismatch'
    );
  });

  test('CSV row count matches number of Meilisearch hits', () => {
    assertEqual(records.length, allHits.length, 'Parsed CSV row count differs from fetched hits');
  });

  test('CSV row count matches aggregate count in departments.json', () => {
    assertEqual(records.length, expected.count, 'CSV line-item count does not match aggregated count');
  });

  test('Sum of CSV amounts matches aggregate amount in departments.json', () => {
    const sum = records.reduce((acc, r) => acc + parseFloat(r.amount || '0'), 0);
    // Aggregates are stored as floats (e.g. 476440976.0); allow a tiny epsilon for fp drift.
    assertClose(sum, expected.amount, 1, 'Summed CSV amount does not match aggregate amount');
  });

  test('Every row belongs to the requested department', () => {
    const mismatches = records.filter(r => r.department !== department.description);
    assert(mismatches.length === 0, `${mismatches.length} rows have a different department`);
  });

  test('Every row belongs to the requested year', () => {
    const mismatches = records.filter(r => String(r.year) !== String(year));
    assert(mismatches.length === 0, `${mismatches.length} rows have a different year`);
  });

  test('Object description column is present (raw object data is included)', () => {
    const withObject = records.filter(r => r.object_description && r.object_description.length > 0 && r.object_description !== 'nan');
    assert(withObject.length > 0, 'No rows contain object_description — raw object data is missing');
  });

  test('Object code column is populated for at least some rows', () => {
    const withCode = records.filter(r => r.object_code && r.object_code.length > 0 && r.object_code !== 'nan');
    assert(withCode.length > 0, 'No rows contain object_code');
  });

  test('Per-agency sums from CSV match agencies.json aggregates', () => {
    const byAgency = new Map();
    for (const r of records) {
      const key = r.agency;
      const prev = byAgency.get(key) || { amount: 0, count: 0 };
      prev.amount += parseFloat(r.amount || '0');
      prev.count += 1;
      byAgency.set(key, prev);
    }

    const mismatches = [];
    for (const agency of expectedAgencies) {
      const yd = agency.years[String(year)];
      const csvAgg = byAgency.get(agency.description);
      if (!csvAgg) {
        mismatches.push(`  - missing from CSV: ${agency.description}`);
        continue;
      }
      if (Math.abs(csvAgg.amount - yd.amount) > 1) {
        mismatches.push(`  - amount mismatch for ${agency.description}: csv=${csvAgg.amount} aggregate=${yd.amount}`);
      }
      if (csvAgg.count !== yd.count) {
        mismatches.push(`  - count mismatch for ${agency.description}: csv=${csvAgg.count} aggregate=${yd.count}`);
      }
    }
    assert(mismatches.length === 0, `Per-agency reconciliation failed:\n${mismatches.join('\n')}`);
  });

  test('CSV escaping round-trip preserves values with quotes/commas', () => {
    const probe = [
      { id: 't1', year: 2026, amt: 10, dsc: 'A, with comma', uacs_dpt_dsc: 'D', uacs_agy_dsc: 'A',
        uacs_oper_dsc: '', uacs_fundsubcat_dsc: '', uacs_exp_cd: '', uacs_exp_dsc: '',
        uacs_obj_cd: '', uacs_obj_dsc: 'Has "quotes"',
        uacs_sobj_cd: '', uacs_sobj_dsc: '', uacs_div_dsc: '' },
    ];
    const probeCsv = buildCSV(probe);
    const { records: parsed } = parseCSV(probeCsv);
    assertEqual(parsed.length, 1, 'Round-trip produced wrong number of rows');
    assertEqual(parsed[0].description, 'A, with comma', 'Comma-containing value corrupted');
    assertEqual(parsed[0].object_description, 'Has "quotes"', 'Quote-containing value corrupted');
  });

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log('\n───────────────────────────────────────────────────────────');
  console.log(` Results: \x1b[32m${passed} passed\x1b[0m, ${failed > 0 ? `\x1b[31m${failed} failed\x1b[0m` : `${failed} failed`}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n\x1b[31mFatal error:\x1b[0m', err.message);
  console.error(err.stack);
  process.exit(1);
});
