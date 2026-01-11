import csv
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NSS = {
    "ss": "urn:schemas-microsoft-com:office:spreadsheet",
    "html": "http://www.w3.org/TR/REC-html40",
}

MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Total",
]


def get_cell_text(cell):
    """Extract text from a cell, handling SpreadsheetML and HTML-formatted data."""
    d = cell.find("ss:Data", NSS)
    if d is not None:
        text = "".join(d.itertext()).strip()
        if text:
            return text

    # HTML-style content inside ss:Data
    for html_node in cell.findall(".//html:*", NSS):
        txt = "".join(html_node.itertext()).strip()
        if txt:
            return txt

    return ""


def row_to_values(row):
    """Convert a <Row> into a list of values, expanding ss:Index gaps."""
    values = []
    current_col = 1
    for cell in row.findall("ss:Cell", NSS):
        idx_attr = f"{{{NSS['ss']}}}Index"
        idx = cell.get(idx_attr)
        if idx is not None:
            target_col = int(idx)
            while current_col < target_col:
                values.append("")
                current_col += 1

        values.append(get_cell_text(cell))
        current_col += 1

    return values


def detect_header_and_month_indices(table):
    """Locate the header row and return header, label_col, month_indices, start_row_index."""
    rows = table.findall("ss:Row", NSS)
    for i, row in enumerate(rows):
        vals = row_to_values(row)
        if "Particulars" in vals:
            label_col_index = vals.index("Particulars")
            month_indices = {}
            for m in MONTH_NAMES:
                if m in vals:
                    month_indices[m] = vals.index(m)
            return vals, label_col_index, month_indices, i + 1
    return None, None, None, None


def is_notes_row(vals):
    non_empty = [v for v in vals if v.strip()]
    if not non_empty:
        return False
    return non_empty[0] == "Notes:"


def any_month_value(vals, month_indices):
    for col in month_indices.values():
        if col < len(vals) and vals[col].strip() != "":
            return True
    return False


def extract_rows_with_hierarchy(table, sheet_name):
    header, label_col, month_indices, start_row_i = detect_header_and_month_indices(table)
    if header is None:
        return []

    rows = table.findall("ss:Row", NSS)
    results = []

    # hierarchy: map column index -> label at that column
    hierarchy = {}

    for row in rows[start_row_i:]:
        vals = row_to_values(row)
        if not any(v.strip() for v in vals):
            continue

        if is_notes_row(vals):
            break

        # Find first non-empty cell
        first_idx = None
        first_text = None
        for idx, v in enumerate(vals):
            if v.strip():
                first_idx, first_text = idx, v.strip()
                break

        if first_idx is None:
            continue

        txt_lower = first_text.lower()
        if not txt_lower.startswith("notes:") and "of which" not in txt_lower:
            # Reset deeper levels
            to_delete = [c for c in hierarchy if c >= first_idx]
            for c in to_delete:
                del hierarchy[c]
            hierarchy[first_idx] = first_text

        # Only emit a row if it has month values
        if not any_month_value(vals, month_indices):
            continue

        # Parents: hierarchy entries with index < first_idx
        parents = [hierarchy[c] for c in sorted(hierarchy) if c < first_idx]
        item = first_text

        max_levels = 5
        levels = parents[-max_levels:]
        levels = [""] * (max_levels - len(levels)) + levels
        level_keys = {f"level_{i+1}": levels[i] for i in range(max_levels)}

        month_values = {}
        for m in MONTH_NAMES:
            col = month_indices.get(m)
            val = vals[col].strip() if col is not None and col < len(vals) else ""
            month_values[m] = val

        row_dict = {
            "sheet": sheet_name,
            **level_keys,
            "item": item,
            **month_values,
        }
        results.append(row_dict)

    return results


def parse_excel_xml(path: Path, only_sheet: str | None = None):
    tree = ET.parse(path)
    root = tree.getroot()

    all_rows = []

    for ws in root.findall("ss:Worksheet", NSS):
        sheet_name = ws.get(f"{{{NSS['ss']}}}Name", "Sheet")
        if only_sheet is not None and sheet_name != only_sheet:
            continue
        table = ws.find("ss:Table", NSS)
        if table is None:
            continue
        rows = extract_rows_with_hierarchy(table, sheet_name)
        all_rows.extend(rows)

    return all_rows


def build_item_key(row_dict: dict) -> str:
    """Build a stable column name for an item from its hierarchy.

    Example: "Revenues > Tax Revenues > BIR".
    """
    parts = [
        row_dict.get("level_1", "").strip(),
        row_dict.get("level_2", "").strip(),
        row_dict.get("level_3", "").strip(),
        row_dict.get("level_4", "").strip(),
        row_dict.get("level_5", "").strip(),
        row_dict.get("item", "").strip(),
    ]
    parts = [p for p in parts if p]
    return " > ".join(parts)


def pivot_months_as_rows(rows):
    """Pivot extracted rows so that months become rows and items become columns.

    Input rows: list of dicts with hierarchy + month values.
    Output: list of dicts with columns: sheet, month, and one column per item key.
    """
    # Determine all item columns
    item_keys = []
    seen = set()
    for r in rows:
        key = build_item_key(r)
        if key not in seen:
            seen.add(key)
            item_keys.append(key)

    # Build month rows per sheet
    pivoted = []
    for r in rows:
        sheet = r["sheet"]
        item_key = build_item_key(r)
        for m in MONTH_NAMES:
            val = r.get(m, "")
            if val == "":
                continue  # skip empty values to keep CSV smaller
            # Find existing row for (sheet, month) or create one
            lookup_key = (sheet, m)
            row_obj = next((row for row in pivoted if (row["sheet"], row["month"]) == lookup_key), None)
            if row_obj is None:
                row_obj = {"sheet": sheet, "month": m}
                # initialize all item columns empty
                for ik in item_keys:
                    row_obj[ik] = ""
                pivoted.append(row_obj)
            row_obj[item_key] = val

    # Ensure consistent column order: sheet, month, sorted item keys
    fieldnames = ["sheet", "month"] + item_keys
    return pivoted, fieldnames


def main(xml_path, out_csv, only_sheet=None):
    xml_path = Path(xml_path)
    rows = parse_excel_xml(xml_path, only_sheet=only_sheet)

    if not rows:
        print("No data rows found.", file=sys.stderr)
        return

    pivoted, fieldnames = pivot_months_as_rows(rows)

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in pivoted:
            writer.writerow(r)

    print(f"Wrote {out_csv} with {len(pivoted)} rows and {len(fieldnames) - 2} item columns")


if __name__ == "__main__":
    # Usage examples:
    #   python parse_cor_xml_hier.py INPUT_XML OUTPUT_CSV
    #   python parse_cor_xml_hier.py INPUT_XML OUTPUT_CSV 2024
    if len(sys.argv) < 3:
        print("Usage: python parse_cor_xml_hier.py INPUT_XML OUTPUT_CSV [SHEET_NAME]", file=sys.stderr)
        sys.exit(1)
    xml_path = sys.argv[1]
    out_csv = sys.argv[2]
    sheet = sys.argv[3] if len(sys.argv) > 3 else None
    main(xml_path, out_csv, sheet)
