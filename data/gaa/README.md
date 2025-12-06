# GAA (General Appropriations Act) Data Processing

This directory contains scripts to process GAA budget data from CSV files into Parquet format and generate aggregated JSON files for the budget browser.

## Directory Structure

```
data/gaa/
├── data/                          # CSV source files
│   ├── GAA-2020.csv
│   ├── GAA-2021.csv
│   ├── GAA-2022.csv
│   ├── GAA-2023.csv
│   ├── GAA-2024.csv
│   └── GAA-2025.csv
├── gaa.parquet                    # Combined Parquet file (generated)
├── gaa_csv_to_parquet.py         # Convert CSV to Parquet
├── create_aggregates.py          # Generate JSON aggregates
└── import_gaa.py                 # Import to MeiliSearch
```

## Data Pipeline Workflow

### Step 1: Convert CSV to Parquet

Combines all yearly CSV files into a single Parquet file with an `id` column and `year` column:

```bash
python gaa_csv_to_parquet.py --csv-dir data --output gaa.parquet
```

**Output:** `gaa.parquet` with all years combined

**Key Features:**
- Automatically extracts year from filename (e.g., GAA-2025.csv → year = 2025)
- Adds auto-incrementing `id` field (required for MeiliSearch)
- Lowercases all column names for consistency
- **Converts `amt` column to numeric (float)** with proper handling of:
  - Commas in numbers (e.g., "543,636" → 543636.0)
  - Accounting parentheses for negatives (e.g., "(4,450)" → -4450.0)
  - Empty/null/dash values → 0.0
- Keeps other columns as strings for consistency
- Uses Snappy compression for efficient storage

### Step 2: Generate Aggregate JSON Files

Creates hierarchical JSON aggregates for the frontend:

```bash
python create_aggregates.py --parquet-file gaa.parquet --output-dir ../../public/data/gaa/aggregates
```

**Output Files:**
- `departments.json` - Department-level aggregates by year
- `agencies.json` - Agency-level aggregates (linked to departments)
- `fund_subcategories.json` - Fund sub-category aggregates
- `expenses.json` - Expense category aggregates
- `objects.json` - Object code aggregates
- `yearly_totals.json` - Year-by-year totals

**JSON Structure Example (departments.json):**
```json
{
  "metadata": {
    "title": "GAA Departments",
    "source": "General Appropriations Act",
    "total_items": 50
  },
  "data": [
    {
      "id": "01",
      "description": "Office of the President",
      "years": {
        "2025": { "count": 1234, "amount": 50000000000 },
        "2024": { "count": 1150, "amount": 48000000000 }
      }
    }
  ]
}
```

### Step 3: Import to MeiliSearch (Optional)

Import the Parquet data to MeiliSearch for full-text search:

```bash
python import_gaa.py --parquet-file gaa.parquet --index-name gaa
```

**Configuration:**
- Index name: `gaa`
- Searchable attributes: All fields
- Filterable attributes: `year`, `department`, `agency`, etc.
- Sortable attributes: `id`, `amt`, `year`

## Field Mapping Reference

### ID and Description Pattern

Each entity has an ID field and a corresponding description field:

| Entity | ID Field | Description Field |
|--------|----------|-------------------|
| Department | `department` | `uacs_dpt_dsc` |
| Agency | `agency` | `uacs_gy_dsc` |
| Operating Unit | `operunit` | `uacs_oper_dsc` |
| Fund Sub-Category | (description only) | `uacs_fundsubcat_dsc` |
| Expense Category | `uacs_exp_cd` | `uacs_exp_dsc` |
| Object Code | `uacs_sobj_cd` | `uacs_sobj_dsc` |
| Division | (varies by year) | `uacs_div_dsc` |

### Complete Field List

- `id` - Auto-generated incrementing ID
- `year` - Budget year (2020-2025)
- `department` - Department ID
- `uacs_dpt_dsc` - Department description
- `agency` - Agency ID
- `uacs_gy_dsc` - Agency description
- `prexc_fpap_id` - PREXC/FPAP ID
- `dsc` - Line item description
- `operunit` - Operating unit ID
- `uacs_oper_dsc` - Operating unit description
- `uacs_reg_id` - Region ID
- `fundcd` - Fund code
- `uacs_fundsubcat_dsc` - Fund sub-category description
- `uacs_exp_cd` - Expense category code
- `uacs_exp_dsc` - Expense category description
- `uacs_sobj_cd` - Object code
- `uacs_sobj_dsc` - Object description
- `uacs_div_dsc` - Division description (2025 only)
- `amt` - Budget amount (numeric float, cleaned during CSV-to-Parquet conversion)

## Data Aggregation Logic

### Hierarchical Structure

```
Department
└── Agency
    ├── Fund Sub-Category
    ├── Expense Category
    └── Object Code
```

### Year-Aware Aggregation

All aggregates maintain year-by-year breakdowns:
- Each entity has a `years` object with year keys
- Each year contains `count` (number of line items) and `amount` (total budget)
- Allows year-over-year comparison and trend analysis

### Parent-Child Relationships

Child entities maintain references to parents:
- Agencies link to `department_id`
- Fund sub-categories, expenses, and objects link to both `department_id` and `agency_id`

## Usage in Frontend

The budget browser (`/src/components/budget/BudgetBrowser.tsx`) uses these aggregates to:

1. **Year Navigation**: Switch between budget years using tabs
2. **Summary Statistics**: Display total budget, line item count, department count
3. **Visualizations**: 
   - Year-over-year trend line chart
   - Top 10 departments bar chart
4. **Sample Data Table**: Show first 100 budget line items ordered by ID
5. **CSV Export**: Download sample data for the selected year

## Data Source

GAA data is sourced from official government budget documents. CSV files should be placed in the `data/` subdirectory with the naming convention `GAA-YYYY.csv`.

## Notes

- **Data Integrity**: The `amt` column is converted to numeric (float) during CSV import to ensure accurate aggregations
- All monetary amounts are stored as numeric values (no commas or formatting)
- The frontend handles currency formatting (billions/trillions)
- Column names are normalized to lowercase
- Missing/null values in `amt` are converted to 0.0
- The `id` field ensures each budget line item is uniquely identifiable
