#!/usr/bin/python3
"""
Generate per-department hierarchical JSON aggregates from GAA Parquet data
using the V2 7-level hierarchy (see HIERARCHY_V2.md).

Levels:
    1. Department          -> departments.json
    2. Agency              -> agencies.json
    3. FPAP                -> fpaps.json
    4. Operating Unit      -> operating_units.json
    5. Fund Sub-Category   -> fund_subcategories.json
    6. Expense Category    -> expenses.json
    7. Object              -> objects.json
    +  Yearly totals       -> yearly_totals.json

Output is written to: <output-dir>/<department-id>/

Usage:
    python create_dept_aggregates.py --department 37
    python create_dept_aggregates.py --department 37 --parquet-file gaa.parquet \
        --output-dir ../../public/data/gaa/dict
    python create_dept_aggregates.py --department all   # all departments
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd


def to_slug(text: str) -> str:
    slug = str(text).lower().replace(' ', '-')
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def is_entity_name(desc: Any) -> bool:
    if not desc or str(desc).lower() == 'nan':
        return False
    desc = str(desc)
    patterns = [
        '(' in desc and ')' in desc,
        desc.startswith('Department of'),
        desc.startswith('Office of'),
        desc.startswith('Commission on'),
        desc.startswith('The '),
        'University' in desc or 'College' in desc,
        'Congress' in desc,
        'Judiciary' in desc,
        'Automatic Appropriations' in desc,
        'Budgetary Support' in desc,
        'Allocations to' in desc,
    ]
    return any(patterns)


def best_description(group: pd.DataFrame, desc_col: str) -> str:
    desc_amounts = group.groupby(desc_col)['amt'].sum().sort_values(ascending=False)
    for desc, _ in desc_amounts.items():
        if is_entity_name(desc):
            return str(desc)
    for desc, _ in desc_amounts.items():
        if desc and str(desc).lower() != 'nan' and str(desc).strip():
            return str(desc)
    return str(group[desc_col].iloc[0])


def year_key(value: Any) -> str:
    return str(int(value))


def add_year(node: Dict[str, Any], year: Any, count: int, amount: float) -> None:
    node['years'][year_key(year)] = {'count': int(count), 'amount': float(amount)}


def create_department_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating department aggregates...")
    out: Dict[str, Dict[str, Any]] = {}
    for dept_id, dept_df in df.groupby('department'):
        dept_id = str(dept_id)
        description = best_description(dept_df, 'uacs_dpt_dsc')
        node = {
            'id': dept_id,
            'slug': to_slug(description),
            'description': description,
            'years': {},
        }
        for year, year_df in dept_df.groupby('year'):
            add_year(node, year, len(year_df), year_df['amt'].sum())
        out[dept_id] = node
    result = sorted(out.values(), key=lambda x: x['id'])
    print(f"    ✓ {len(result)} departments")
    return result


def create_agency_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating agency aggregates...")
    out: Dict[str, Dict[str, Any]] = {}
    for (dept_id, agency_code), group in df.groupby(['department', 'agency']):
        dept_id, agency_code = str(dept_id), str(agency_code)
        cid = f"{dept_id}-{agency_code}"
        description = best_description(group, 'uacs_agy_dsc')
        node = {
            'id': cid,
            'slug': to_slug(description),
            'agency_code': agency_code,
            'description': description,
            'department_id': dept_id,
            'years': {},
        }
        for year, year_df in group.groupby('year'):
            add_year(node, year, len(year_df), year_df['amt'].sum())
        out[cid] = node
    result = sorted(out.values(), key=lambda x: (x['department_id'], x['agency_code']))
    print(f"    ✓ {len(result)} agencies")
    return result


def create_fpap_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating FPAP aggregates...")
    df = df[df['prexc_fpap_id'].notna() & (df['prexc_fpap_id'].astype(str).str.strip() != '')]
    out: Dict[str, Dict[str, Any]] = {}
    for (dept_id, agency_code, fpap_id), group in df.groupby(['department', 'agency', 'prexc_fpap_id']):
        dept_id, agency_code, fpap_id = str(dept_id), str(agency_code), str(fpap_id)
        cid = f"{dept_id}-{agency_code}-{fpap_id}"
        description = best_description(group, 'dsc')
        node = {
            'id': cid,
            'slug': to_slug(description) or to_slug(fpap_id),
            'fpap_code': fpap_id,
            'description': description,
            'agency_id': f"{dept_id}-{agency_code}",
            'department_id': dept_id,
            'years': {},
        }
        for year, year_df in group.groupby('year'):
            add_year(node, year, len(year_df), year_df['amt'].sum())
        out[cid] = node
    result = sorted(out.values(), key=lambda x: (x['department_id'], x['agency_id'], x['fpap_code']))
    print(f"    ✓ {len(result)} FPAPs")
    return result


def create_operating_unit_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating operating unit aggregates...")
    df = df[
        df['prexc_fpap_id'].notna() & (df['prexc_fpap_id'].astype(str).str.strip() != '')
        & df['operunit'].notna() & (df['operunit'].astype(str).str.strip() != '')
    ]
    out: Dict[str, Dict[str, Any]] = {}
    keys = ['department', 'agency', 'prexc_fpap_id', 'operunit']
    for (dept_id, agency_code, fpap_id, operunit), group in df.groupby(keys):
        dept_id, agency_code, fpap_id, operunit = map(str, (dept_id, agency_code, fpap_id, operunit))
        cid = f"{dept_id}-{agency_code}-{fpap_id}-{operunit}"
        description = best_description(group, 'uacs_oper_dsc')
        node = {
            'id': cid,
            'slug': to_slug(description) or to_slug(operunit),
            'operunit_code': operunit,
            'description': description,
            'fpap_id': f"{dept_id}-{agency_code}-{fpap_id}",
            'agency_id': f"{dept_id}-{agency_code}",
            'department_id': dept_id,
            'years': {},
        }
        for year, year_df in group.groupby('year'):
            add_year(node, year, len(year_df), year_df['amt'].sum())
        out[cid] = node
    result = sorted(out.values(), key=lambda x: (x['department_id'], x['agency_id'], x['fpap_id'], x['operunit_code']))
    print(f"    ✓ {len(result)} operating units")
    return result


def create_fund_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating fund sub-category aggregates...")
    df = df[
        df['prexc_fpap_id'].notna() & (df['prexc_fpap_id'].astype(str).str.strip() != '')
        & df['operunit'].notna() & (df['operunit'].astype(str).str.strip() != '')
        & df['fundcd'].notna() & (df['fundcd'].astype(str).str.strip() != '')
    ]
    out: Dict[str, Dict[str, Any]] = {}
    keys = ['department', 'agency', 'prexc_fpap_id', 'operunit', 'fundcd']
    for (dept_id, agency_code, fpap_id, operunit, fundcd), group in df.groupby(keys):
        dept_id, agency_code, fpap_id, operunit, fundcd = map(str, (dept_id, agency_code, fpap_id, operunit, fundcd))
        cid = f"{dept_id}-{agency_code}-{fpap_id}-{operunit}-{fundcd}"
        description = best_description(group, 'uacs_fundsubcat_dsc')
        node = {
            'id': cid,
            'slug': to_slug(description) or to_slug(fundcd),
            'fund_code': fundcd,
            'description': description,
            'operating_unit_id': f"{dept_id}-{agency_code}-{fpap_id}-{operunit}",
            'fpap_id': f"{dept_id}-{agency_code}-{fpap_id}",
            'agency_id': f"{dept_id}-{agency_code}",
            'department_id': dept_id,
            'years': {},
        }
        for year, year_df in group.groupby('year'):
            add_year(node, year, len(year_df), year_df['amt'].sum())
        out[cid] = node
    result = sorted(out.values(), key=lambda x: (x['department_id'], x['agency_id'], x['fpap_id'], x['operating_unit_id'], x['fund_code']))
    print(f"    ✓ {len(result)} fund sub-categories")
    return result


def create_expense_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating expense category aggregates...")
    df = df[
        df['prexc_fpap_id'].notna() & (df['prexc_fpap_id'].astype(str).str.strip() != '')
        & df['operunit'].notna() & (df['operunit'].astype(str).str.strip() != '')
        & df['fundcd'].notna() & (df['fundcd'].astype(str).str.strip() != '')
        & df['uacs_exp_cd'].notna() & (df['uacs_exp_cd'].astype(str).str.strip() != '')
    ]
    out: Dict[str, Dict[str, Any]] = {}
    keys = ['department', 'agency', 'prexc_fpap_id', 'operunit', 'fundcd', 'uacs_exp_cd']
    for (dept_id, agency_code, fpap_id, operunit, fundcd, exp_cd), group in df.groupby(keys):
        dept_id, agency_code, fpap_id, operunit, fundcd, exp_cd = map(
            str, (dept_id, agency_code, fpap_id, operunit, fundcd, exp_cd)
        )
        cid = f"{dept_id}-{agency_code}-{fpap_id}-{operunit}-{fundcd}-{exp_cd}"
        description = best_description(group, 'uacs_exp_dsc')
        node = {
            'id': cid,
            'slug': to_slug(description) or to_slug(exp_cd),
            'expense_code': exp_cd,
            'description': description,
            'fund_id': f"{dept_id}-{agency_code}-{fpap_id}-{operunit}-{fundcd}",
            'operating_unit_id': f"{dept_id}-{agency_code}-{fpap_id}-{operunit}",
            'fpap_id': f"{dept_id}-{agency_code}-{fpap_id}",
            'agency_id': f"{dept_id}-{agency_code}",
            'department_id': dept_id,
            'years': {},
        }
        for year, year_df in group.groupby('year'):
            add_year(node, year, len(year_df), year_df['amt'].sum())
        out[cid] = node
    result = sorted(out.values(), key=lambda x: (x['department_id'], x['agency_id'], x['fpap_id'], x['operating_unit_id'], x['fund_id'], x['expense_code']))
    print(f"    ✓ {len(result)} expense categories")
    return result


def create_object_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating object aggregates...")
    df = df[
        df['prexc_fpap_id'].notna() & (df['prexc_fpap_id'].astype(str).str.strip() != '')
        & df['operunit'].notna() & (df['operunit'].astype(str).str.strip() != '')
        & df['fundcd'].notna() & (df['fundcd'].astype(str).str.strip() != '')
        & df['uacs_exp_cd'].notna() & (df['uacs_exp_cd'].astype(str).str.strip() != '')
        & df['uacs_sobj_cd'].notna() & (df['uacs_sobj_cd'].astype(str).str.strip() != '')
    ]
    out: Dict[str, Dict[str, Any]] = {}
    keys = ['department', 'agency', 'prexc_fpap_id', 'operunit', 'fundcd', 'uacs_exp_cd', 'uacs_sobj_cd']
    for (dept_id, agency_code, fpap_id, operunit, fundcd, exp_cd, sobj_cd), group in df.groupby(keys):
        dept_id, agency_code, fpap_id, operunit, fundcd, exp_cd, sobj_cd = map(
            str, (dept_id, agency_code, fpap_id, operunit, fundcd, exp_cd, sobj_cd)
        )
        cid = f"{dept_id}-{agency_code}-{fpap_id}-{operunit}-{fundcd}-{exp_cd}-{sobj_cd}"
        description = best_description(group, 'uacs_sobj_dsc')
        node = {
            'id': cid,
            'slug': to_slug(description) or to_slug(sobj_cd),
            'object_code': sobj_cd,
            'description': description,
            'expense_id': f"{dept_id}-{agency_code}-{fpap_id}-{operunit}-{fundcd}-{exp_cd}",
            'fund_id': f"{dept_id}-{agency_code}-{fpap_id}-{operunit}-{fundcd}",
            'operating_unit_id': f"{dept_id}-{agency_code}-{fpap_id}-{operunit}",
            'fpap_id': f"{dept_id}-{agency_code}-{fpap_id}",
            'agency_id': f"{dept_id}-{agency_code}",
            'department_id': dept_id,
            'years': {},
        }
        for year, year_df in group.groupby('year'):
            add_year(node, year, len(year_df), year_df['amt'].sum())
        out[cid] = node
    result = sorted(out.values(), key=lambda x: (x['department_id'], x['agency_id'], x['fpap_id'], x['operating_unit_id'], x['fund_id'], x['expense_id'], x['object_code']))
    print(f"    ✓ {len(result)} objects")
    return result


def create_yearly_totals(df: pd.DataFrame) -> List[Dict[str, Any]]:
    print("  → Creating yearly totals...")
    grouped = df.groupby('year').agg(count=('amt', 'count'), amount=('amt', 'sum')).reset_index()
    result = [
        {'year': int(row['year']), 'count': int(row['count']), 'amount': float(row['amount'])}
        for _, row in grouped.iterrows()
    ]
    result.sort(key=lambda x: x['year'])
    print(f"    ✓ {len(result)} years")
    return result


def write_aggregates(dept_df: pd.DataFrame, dept_id: str, output_root: Path) -> None:
    dept_dir = output_root / dept_id
    dept_dir.mkdir(parents=True, exist_ok=True)

    aggregates = {
        'departments.json': create_department_aggregates(dept_df),
        'agencies.json': create_agency_aggregates(dept_df),
        'fpaps.json': create_fpap_aggregates(dept_df),
        'operating_units.json': create_operating_unit_aggregates(dept_df),
        'fund_subcategories.json': create_fund_aggregates(dept_df),
        'expenses.json': create_expense_aggregates(dept_df),
        'objects.json': create_object_aggregates(dept_df),
        'yearly_totals.json': create_yearly_totals(dept_df),
    }

    for filename, data in aggregates.items():
        title = filename.replace('.json', '').replace('_', ' ').title()
        payload = {
            'metadata': {
                'title': f"GAA {title} (Department {dept_id})",
                'source': 'General Appropriations Act',
                'department_id': dept_id,
                'total_items': len(data),
            },
            'data': data,
        }
        out_path = dept_dir / filename
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"  ✓ {out_path.relative_to(output_root.parent)} ({len(data)} items)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Per-department V2 aggregate generator")
    parser.add_argument('--parquet-file', default='gaa.parquet')
    parser.add_argument('--output-dir', default='../ai-reports')
    parser.add_argument('--department', required=True,
                        help='Department code to filter (e.g. "37"), or "all" for every department')
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    parquet_path = Path(args.parquet_file)
    if not parquet_path.is_absolute():
        parquet_path = script_dir / parquet_path
    output_root = Path(args.output_dir)
    if not output_root.is_absolute():
        output_root = script_dir / output_root

    if not parquet_path.exists():
        print(f"✗ Parquet file not found: {parquet_path}")
        sys.exit(1)

    print(f"Loading {parquet_path}")
    df = pd.read_parquet(parquet_path)
    if df['amt'].dtype == 'object':
        df['amt'] = pd.to_numeric(df['amt'], errors='coerce').fillna(0)
    df['department'] = df['department'].astype(str)
    print(f"✓ Loaded {len(df):,} rows")

    output_root.mkdir(parents=True, exist_ok=True)

    if args.department == 'all':
        dept_ids = sorted(df['department'].dropna().unique())
    else:
        dept_ids = [args.department]

    for dept_id in dept_ids:
        dept_df = df[df['department'] == dept_id]
        if dept_df.empty:
            print(f"\n⚠ No rows for department '{dept_id}', skipping")
            continue
        print(f"\n=== Department {dept_id} ({len(dept_df):,} rows) ===")
        write_aggregates(dept_df, dept_id, output_root)

    print(f"\n✓ Done. Output: {output_root}")


if __name__ == '__main__':
    main()
