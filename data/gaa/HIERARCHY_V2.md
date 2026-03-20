# GAA Hierarchy V2 - 7-Level Structure

## Overview

The V2 aggregation (`create_aggregates_v2.py`) implements a proper 7-level hierarchical structure that matches the source CSV data structure from the General Appropriations Act (GAA).

This enables tree-like navigation from Department all the way down to individual Object line items.

## Hierarchy Levels

### Level 1: Department
- **ID Field**: `department`
- **Description Field**: `uacs_dpt_dsc`
- **Composite Key**: `department`
- **Parent**: None (root level)

**Example:**
```json
{
  "id": "18",
  "slug": "department-of-public-works-and-highways-dpwh",
  "description": "Department of Public Works and Highways (DPWH)",
  "years": {
    "2024": { "count": 12345, "amount": 500000000.00 }
  }
}
```

### Level 2: Agency
- **ID Field**: `agency`
- **Description Field**: `uacs_agy_dsc`
- **Composite Key**: `{department}-{agency}`
- **Parent**: `department_id`

**Example:**
```json
{
  "id": "29-015",
  "agency_code": "015",
  "slug": "national-museum-of-the-philippines",
  "description": "National Museum of the Philippines",
  "department_id": "29",
  "years": {
    "2024": { "count": 234, "amount": 1000000.00 }
  }
}
```

### Level 3: FPAP (Financial Plan and Activity Program)
- **ID Field**: `prexc_fpap_id`
- **Description Field**: `dsc`
- **Composite Key**: `{department}-{agency}-{prexc_fpap_id}`
- **Parents**: `agency_id`, `department_id`

**Example:**
```json
{
  "id": "18-001-300207100311000",
  "fpap_code": "300207100311000",
  "slug": "construction-of-municipal-police-station",
  "description": "Construction of Dingras Municipal Police Station Building",
  "agency_id": "18-001",
  "department_id": "18",
  "years": {
    "2024": { "count": 15, "amount": 50000000.00 }
  }
}
```

### Level 4: Operating Unit
- **ID Field**: `operunit`
- **Description Field**: `uacs_oper_dsc`
- **Composite Key**: `{department}-{agency}-{prexc_fpap_id}-{operunit}`
- **Parents**: `fpap_id`, `agency_id`, `department_id`

**Example:**
```json
{
  "id": "18-001-300207100311000-001",
  "operunit_code": "001",
  "slug": "regional-office-i",
  "description": "Regional Office I",
  "fpap_id": "18-001-300207100311000",
  "agency_id": "18-001",
  "department_id": "18",
  "years": {
    "2024": { "count": 8, "amount": 30000000.00 }
  }
}
```

### Level 5: Fund Sub-Category
- **ID Field**: `fundcd`
- **Description Field**: `uacs_fundsubcat_dsc`
- **Composite Key**: `{department}-{agency}-{prexc_fpap_id}-{operunit}-{fundcd}`
- **Parents**: `operating_unit_id`, `fpap_id`, `agency_id`, `department_id`

**Example:**
```json
{
  "id": "18-001-300207100311000-001-101",
  "fund_code": "101",
  "slug": "regular-agency-fund",
  "description": "Regular Agency Fund",
  "operating_unit_id": "18-001-300207100311000-001",
  "fpap_id": "18-001-300207100311000",
  "agency_id": "18-001",
  "department_id": "18",
  "years": {
    "2024": { "count": 5, "amount": 20000000.00 }
  }
}
```

### Level 6: Expense Category
- **ID Field**: `uacs_exp_cd`
- **Description Field**: `uacs_exp_dsc`
- **Composite Key**: `{department}-{agency}-{prexc_fpap_id}-{operunit}-{fundcd}-{uacs_exp_cd}`
- **Parents**: `fund_id`, `operating_unit_id`, `fpap_id`, `agency_id`, `department_id`

**Example:**
```json
{
  "id": "18-001-300207100311000-001-101-5021306",
  "expense_code": "5021306",
  "slug": "construction-supplies-and-materials",
  "description": "Construction Supplies and Materials",
  "fund_id": "18-001-300207100311000-001-101",
  "operating_unit_id": "18-001-300207100311000-001",
  "fpap_id": "18-001-300207100311000",
  "agency_id": "18-001",
  "department_id": "18",
  "years": {
    "2024": { "count": 3, "amount": 15000000.00 }
  }
}
```

### Level 7: Object (Finest Granularity)
- **ID Field**: `uacs_sobj_cd`
- **Description Field**: `uacs_sobj_dsc`
- **Composite Key**: `{department}-{agency}-{prexc_fpap_id}-{operunit}-{fundcd}-{uacs_exp_cd}-{uacs_sobj_cd}`
- **Parents**: `expense_id`, `fund_id`, `operating_unit_id`, `fpap_id`, `agency_id`, `department_id`

**Example:**
```json
{
  "id": "18-001-300207100311000-001-101-5021306-502130603",
  "object_code": "502130603",
  "slug": "cement-and-cement-products",
  "description": "Cement and Cement Products",
  "expense_id": "18-001-300207100311000-001-101-5021306",
  "fund_id": "18-001-300207100311000-001-101",
  "operating_unit_id": "18-001-300207100311000-001",
  "fpap_id": "18-001-300207100311000",
  "agency_id": "18-001",
  "department_id": "18",
  "years": {
    "2024": { "count": 1, "amount": 5000000.00 }
  }
}
```

## Composite Key Structure

Each level builds upon its parent's composite key, enabling easy hierarchical navigation:

```
Level 1: {dept}
Level 2: {dept}-{agency}
Level 3: {dept}-{agency}-{fpap}
Level 4: {dept}-{agency}-{fpap}-{operunit}
Level 5: {dept}-{agency}-{fpap}-{operunit}-{fund}
Level 6: {dept}-{agency}-{fpap}-{operunit}-{fund}-{expense}
Level 7: {dept}-{agency}-{fpap}-{operunit}-{fund}-{expense}-{object}
```

## Parent References

Each level includes references to all parent levels, enabling:
- **Bottom-up navigation**: From object → expense → fund → operating unit → FPAP → agency → department
- **Top-down filtering**: Show all objects within a specific agency
- **Cross-level queries**: Find all expenses across multiple FPAPs

## Data Filtering Logic

The aggregation script filters out incomplete hierarchies:

- **Level 3 (FPAP)**: Requires non-null `prexc_fpap_id`
- **Level 4 (Operating Unit)**: Requires non-null `prexc_fpap_id` AND `operunit`
- **Level 5 (Fund)**: Requires non-null `prexc_fpap_id`, `operunit`, AND `fundcd`
- **Level 6 (Expense)**: Requires all above + non-null `uacs_exp_cd`
- **Level 7 (Object)**: Requires all above + non-null `uacs_sobj_cd`

This ensures clean hierarchies without orphaned records.

## Output Files

The script generates 8 JSON files in `public/data/gaa/v2/aggregates/`:

1. **departments.json** - Level 1 aggregates
2. **agencies.json** - Level 2 aggregates
3. **fpaps.json** - Level 3 aggregates
4. **operating_units.json** - Level 4 aggregates
5. **fund_subcategories.json** - Level 5 aggregates
6. **expenses.json** - Level 6 aggregates
7. **objects.json** - Level 7 aggregates (finest granularity)
8. **yearly_totals.json** - Overall yearly summaries

## Testing

Run the test script to validate hierarchy extraction:

```bash
python test_hierarchy.py
```

This tests the hierarchy using "National Museum of the Philippines" as a case study, verifying:
- All 7 levels are present and correctly extracted
- Composite keys are properly formed
- Parent references are accurate
- Data flows correctly through the hierarchy

## Usage Example

To generate the v2 aggregates:

```bash
cd data/gaa
python create_aggregates_v2.py
```

With custom paths:

```bash
python create_aggregates_v2.py --parquet-file gaa.parquet --output-dir ../../public/data/gaa/v2/aggregates
```

## Migration from V1

**Key differences from V1 (`create_aggregates.py`):**

| Aspect | V1 | V2 |
|--------|----|----|
| Hierarchy levels | 5 (simplified) | 7 (complete) |
| FPAP level | ❌ Missing | ✅ Level 3 |
| Operating Units | ❌ Missing | ✅ Level 4 |
| Composite keys | Partial | Full hierarchy chain |
| Parent references | Single parent | All ancestor levels |
| Filter logic | Basic | Hierarchical validation |

## Benefits

1. **Complete data representation**: All CSV hierarchy preserved
2. **Flexible navigation**: Top-down, bottom-up, cross-level queries
3. **Data integrity**: Composite keys prevent collisions across departments/agencies
4. **Tree-like structure**: Natural drilldown from department to individual line items
5. **Year-over-year comparison**: Each level includes yearly breakdowns
