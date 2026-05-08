#!/usr/bin/python3
"""
Build a complete per-department "dossier" of the GAA data.

For each department it produces, in `<output-dir>/<dept_id>/`:
  - The 7-level V2 aggregates (delegates to create_dept_aggregates.write_aggregates)
  - `full_extract.csv` -- every source row for the department (audit trail)
  - `REPORT_PROMPT.md` -- a per-department prompt rendered from REPORT_PROMPT.md,
    ready to feed to an LLM to produce REPORT.md

Usage:
    python build_dept_dossiers.py --department all
    python build_dept_dossiers.py --department 37
    python build_dept_dossiers.py --department 18,37,07
    python build_dept_dossiers.py --department all --skip-csv
    python build_dept_dossiers.py --department all --skip-prompt
    python build_dept_dossiers.py --department all --skip-aggregates
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from create_dept_aggregates import write_aggregates, best_description  # noqa: E402


SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent
PROMPT_TEMPLATE_PATH = SCRIPT_DIR / 'REPORT_PROMPT.md'
RENDER_MARKER = '<!-- RENDER:START -->'
DEFAULT_REFERENCE_FILE = REPO_ROOT / 'public' / 'data' / 'gaa' / 'aggregates' / 'departments.json'


def export_dept_csv(dept_df: pd.DataFrame, dept_id: str, output_root: Path) -> Path:
    csv_path = output_root / dept_id / 'full_extract.csv'
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"  → Writing CSV ({len(dept_df):,} rows)...")
    dept_df.to_csv(csv_path, index=False)
    size_mb = csv_path.stat().st_size / (1024 * 1024)
    print(f"    ✓ {csv_path.name} ({size_mb:.1f} MB)")
    return csv_path


def render_prompt(
    template: str,
    dept_id: str,
    dept_name: str,
    dept_dir: Path,
    total_rows: int,
    years: List[int],
) -> str:
    if RENDER_MARKER not in template:
        body = template
    else:
        body = template.split(RENDER_MARKER, 1)[1].lstrip('\n')

    try:
        dept_dir_rel = dept_dir.resolve().relative_to(REPO_ROOT.resolve())
    except ValueError:
        dept_dir_rel = dept_dir
    dept_dir_str = str(dept_dir_rel)

    first_year = str(min(years))
    last_year = str(max(years))
    years_str = ', '.join(str(y) for y in sorted(years))
    rendered = (
        body
        .replace('{{DEPT_ID}}', dept_id)
        .replace('{{DEPT_NAME}}', dept_name)
        .replace('{{DEPT_DIR}}', dept_dir_str)
        .replace('{{TOTAL_ROWS}}', f"{total_rows:,}")
        .replace('{{YEARS}}', years_str)
        .replace('{{FIRST_YEAR}}', first_year)
        .replace('{{LAST_YEAR}}', last_year)
    )
    return rendered


def write_prompt(
    dept_id: str,
    dept_name: str,
    dept_df: pd.DataFrame,
    output_root: Path,
) -> Path:
    if not PROMPT_TEMPLATE_PATH.exists():
        print(f"    ⚠ Prompt template not found at {PROMPT_TEMPLATE_PATH}, skipping prompt")
        return None
    template = PROMPT_TEMPLATE_PATH.read_text(encoding='utf-8')
    dept_dir = output_root / dept_id
    years = sorted({int(y) for y in dept_df['year'].dropna().unique()})
    rendered = render_prompt(
        template,
        dept_id=dept_id,
        dept_name=dept_name,
        dept_dir=dept_dir,
        total_rows=len(dept_df),
        years=years,
    )
    out_path = dept_dir / 'REPORT_PROMPT.md'
    out_path.write_text(rendered, encoding='utf-8')
    print(f"    ✓ {out_path.name}")
    return out_path


def parse_dept_arg(arg: str, all_dept_ids: List[str]) -> List[str]:
    if arg == 'all':
        return list(all_dept_ids)
    return [d.strip() for d in arg.split(',') if d.strip()]


def load_reference_order(
    reference_path: Path,
    order_by: str,
) -> List[str]:
    """
    Read the reference departments.json and return dept IDs sorted by the
    requested metric, descending.
        order_by = 'total_amount' -> sum across all years
        order_by = 'latest_amount' -> most recent year's amount
    """
    if not reference_path.exists():
        raise FileNotFoundError(f"Reference file not found: {reference_path}")
    payload = json.loads(reference_path.read_text(encoding='utf-8'))
    rows = payload.get('data', [])

    def total(row: dict) -> float:
        return sum(v.get('amount', 0) for v in row.get('years', {}).values())

    def latest(row: dict) -> float:
        years = row.get('years', {})
        if not years:
            return 0.0
        last = max(years.keys())
        return years[last].get('amount', 0)

    metric = total if order_by == 'total_amount' else latest
    sorted_rows = sorted(rows, key=metric, reverse=True)
    return [str(r['id']) for r in sorted_rows]


def order_dept_ids(
    requested: List[str],
    order_by: str,
    reference_path: Optional[Path],
) -> List[str]:
    if order_by == 'id':
        return sorted(requested)
    if reference_path is None:
        reference_path = DEFAULT_REFERENCE_FILE
    ranked = load_reference_order(reference_path, order_by)
    requested_set = set(requested)
    ordered = [d for d in ranked if d in requested_set]
    # Append anything from `requested` not present in the reference (preserves order)
    for d in requested:
        if d not in ranked:
            ordered.append(d)
    return ordered


def main() -> None:
    parser = argparse.ArgumentParser(description="Build per-department GAA dossiers")
    parser.add_argument('--parquet-file', default='gaa.parquet')
    parser.add_argument('--output-dir', default='../ai-reports')
    parser.add_argument('--department', required=True,
                        help='Department code, comma-separated list, or "all"')
    parser.add_argument('--skip-aggregates', action='store_true')
    parser.add_argument('--skip-csv', action='store_true')
    parser.add_argument('--skip-prompt', action='store_true')
    parser.add_argument(
        '--order-by',
        choices=['id', 'total_amount', 'latest_amount'],
        default='id',
        help='Processing order. "total_amount" / "latest_amount" read --reference-file (default: '
             'public/data/gaa/aggregates/departments.json) and sort descending.',
    )
    parser.add_argument(
        '--reference-file',
        default=None,
        help='Path to a departments.json to use for ordering when --order-by is total_amount or latest_amount.',
    )
    args = parser.parse_args()

    parquet_path = Path(args.parquet_file)
    if not parquet_path.is_absolute():
        parquet_path = SCRIPT_DIR / parquet_path
    output_root = Path(args.output_dir)
    if not output_root.is_absolute():
        output_root = SCRIPT_DIR / output_root

    if not parquet_path.exists():
        print(f"✗ Parquet file not found: {parquet_path}")
        sys.exit(1)

    print(f"Loading {parquet_path}")
    df = pd.read_parquet(parquet_path)
    if df['amt'].dtype == 'object':
        df['amt'] = pd.to_numeric(df['amt'], errors='coerce').fillna(0)
    df['department'] = df['department'].astype(str)
    print(f"✓ Loaded {len(df):,} rows\n")

    output_root.mkdir(parents=True, exist_ok=True)

    all_dept_ids = sorted(df['department'].dropna().unique())
    requested_ids = parse_dept_arg(args.department, all_dept_ids)

    reference_path = Path(args.reference_file) if args.reference_file else None
    if reference_path and not reference_path.is_absolute():
        reference_path = SCRIPT_DIR / reference_path
    dept_ids = order_dept_ids(requested_ids, args.order_by, reference_path)

    if args.order_by != 'id':
        ref_used = reference_path or DEFAULT_REFERENCE_FILE
        print(f"Order: {args.order_by} (descending), per {ref_used.relative_to(REPO_ROOT) if ref_used.is_absolute() else ref_used}")
    print(f"Building dossiers for {len(dept_ids)} department(s) -> {output_root}\n")

    summary = []
    for i, dept_id in enumerate(dept_ids, 1):
        dept_df = df[df['department'] == dept_id]
        if dept_df.empty:
            print(f"[{i}/{len(dept_ids)}] ⚠ No rows for department '{dept_id}', skipping\n")
            continue

        dept_name = best_description(dept_df, 'uacs_dpt_dsc')
        print(f"[{i}/{len(dept_ids)}] === Dept {dept_id}: {dept_name} ({len(dept_df):,} rows) ===")
        (output_root / dept_id).mkdir(parents=True, exist_ok=True)

        if not args.skip_aggregates:
            write_aggregates(dept_df, dept_id, output_root)
        else:
            print("  (skipping aggregates)")

        if not args.skip_csv:
            export_dept_csv(dept_df, dept_id, output_root)
        else:
            print("  (skipping CSV)")

        if not args.skip_prompt:
            write_prompt(dept_id, dept_name, dept_df, output_root)
        else:
            print("  (skipping prompt)")

        summary.append((dept_id, dept_name, len(dept_df)))
        print()

    print("=" * 70)
    print(f"✓ Built {len(summary)} dossier(s)")
    print(f"✓ Output: {output_root}")
    print("=" * 70)


if __name__ == '__main__':
    main()
