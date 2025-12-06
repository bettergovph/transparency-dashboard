# GAA Composite Key Implementation

## Problem

Agency IDs (and other entity IDs) are **not globally unique** across the GAA dataset. The same agency code can appear under different departments, representing different agencies.

### Example
- Agency code `001` appears under:
  - Department `01` (Congress) → Senate
  - Department `26` (DOF) → Anti-Money Laundering Council
  - And potentially other departments

This caused data aggregation errors where agencies from different departments were incorrectly merged together.

## Solution

Implemented **composite keys** that combine parent context with the entity code to ensure global uniqueness:

### Composite Key Format

| Entity | Composite Key Format | Example | Components |
|--------|---------------------|---------|------------|
| **Agency** | `{dept_id}-{agency_code}` | `01-001` | Department 01, Agency 001 |
| **Fund Subcategory** | `{dept_id}-{agency_code}-{fund_desc}` | `01-001-General Fund` | Under agency 01-001 |
| **Expense** | `{dept_id}-{agency_code}-{expense_code}` | `01-001-1` | Expense code 1 under agency 01-001 |
| **Object** | `{dept_id}-{agency_code}-{object_code}` | `01-001-5010101000` | Object code under agency 01-001 |

### JSON Structure Changes

#### Before (Incorrect - 136 agencies)
```json
{
  "id": "001",
  "description": "Senate",
  "department_id": "01",
  "years": { "2025": { "count": 123, "amount": 5000000 } }
}
```

This incorrectly merged all agencies with code `001` across all departments.

#### After (Correct - 418 agencies)
```json
{
  "id": "01-001",
  "agency_code": "001",
  "description": "Senate",
  "department_id": "01",
  "years": { "2025": { "count": 123, "amount": 5000000 } }
}
```

Now each department-agency combination is unique.

## Data Impact

### Before vs After Counts

| Entity | Before (Wrong) | After (Correct) | Change |
|--------|----------------|-----------------|---------|
| Departments | 39 | 39 | No change (already unique) |
| **Agencies** | **136** | **418** | +207% (was merging duplicates) |
| Fund Subcategories | 1,279 | 1,279 | No change (already scoped) |
| Expense Categories | 1,519 | 1,519 | No change (already scoped) |
| Objects | 28,705 | 28,705 | No change (already scoped) |

The 3x increase in agencies (136 → 418) confirms that many agency codes were being incorrectly merged.

## Frontend Changes

### TypeScript Interfaces Updated

```typescript
// Agency interface now includes both composite ID and original code
interface Agency {
  id: string              // Composite: "01-001"
  agency_code: string     // Original: "001"
  description: string
  department_id: string
  years: Record<string, { count: number; amount: number }>
}

// Fund subcategories reference composite agency ID
interface FundSubCategory {
  id: string              // Composite: "01-001-General Fund"
  description: string
  department_id: string
  agency_id: string       // References composite: "01-001"
  years: Record<string, { count: number; amount: number }>
}

// Expenses also use composite keys
interface Expense {
  id: string              // Composite: "01-001-1"
  expense_code: string    // Original: "1"
  description: string
  department_id: string
  agency_id: string       // References composite: "01-001"
  years: Record<string, { count: number; amount: number }>
}
```

### Component Updates

#### DepartmentPage.tsx
- ✅ Updated interface to include `agency_code`
- ✅ Filtering logic works with composite IDs automatically

#### AgencyPage.tsx
- ✅ Updated interfaces for Agency, FundSubCategory, Expense
- ✅ Simplified filtering to use composite `agency_id` directly:
  ```typescript
  // Before: Had to check both department_id AND agency_id
  const agencyFunds = fundData.data.filter((f: FundSubCategory) =>
    f.department_id === foundAgency.department_id && 
    f.agency_id === foundAgency.id
  )
  
  // After: Just check the composite agency_id
  const agencyFunds = fundData.data.filter((f: FundSubCategory) =>
    f.agency_id === foundAgency.id  // Already includes department context
  )
  ```
- ✅ Display uses `expense_code` instead of composite `id` for cleaner UI

## Migration

### Scripts Updated

1. **`create_aggregates.py`** - Primary aggregation script (pandas-based)
   - ✅ `create_agency_aggregates()` - Uses composite key `{dept}-{agency}`
   - ✅ `create_fund_subcategory_aggregates()` - Uses `{dept}-{agency}-{fund_desc}`
   - ✅ `create_expense_aggregates()` - Uses `{dept}-{agency}-{exp_code}`
   - ✅ `create_object_aggregates()` - Uses `{dept}-{agency}-{obj_code}`

2. **`create_aggregates_sql.py`** - SQL-based aggregation script (DuckDB)
   - ✅ All functions updated with same composite key format
   - ✅ More accurate grouping due to SQL's precise aggregation
   - ✅ Produces identical output structure as pandas version

3. **Frontend Components**
   - ✅ `DepartmentPage.tsx` - Updated interface
   - ✅ `AgencyPage.tsx` - Updated interfaces and filtering logic

### Regeneration Required

After updating the scripts, regenerate aggregates:

```bash
cd /Users/jason/Sites/transparency-dashboard/data/gaa

# Regenerate with composite keys
/usr/bin/python3 create_aggregates.py --parquet-file gaa.parquet --output-dir ../../public/data/gaa/aggregates
```

**Expected output:**
```
✓ Generated 39 departments
✓ Generated 418 agencies         ← Was 136, now correct
✓ Generated 1279 fund sub-categories
✓ Generated 1519 expense categories
✓ Generated 28705 objects
```

## Verification

Check that agencies are properly scoped:

```bash
cd /Users/jason/Sites/transparency-dashboard

# Show first 3 agencies
python3 -c "
import json
a = json.load(open('public/data/gaa/aggregates/agencies.json'))
for ag in a['data'][:3]:
    print(f\"{ag['id']:10s} - {ag['description'][:40]:40s} (Dept: {ag['department_id']})\")
"
```

**Expected output:**
```
01-001     - Senate                                  (Dept: 01)
01-002     - Senate Electoral Tribunal               (Dept: 01)
01-003     - Commission on Appointments              (Dept: 01)
```

Each agency should have a unique composite ID combining department and agency code.

## Benefits

1. **Data Accuracy** - Each agency is correctly scoped to its department
2. **No Merging Errors** - Agencies with the same code but different departments stay separate
3. **Referential Integrity** - Fund subcategories and expenses correctly reference their parent agency
4. **Simpler Frontend Logic** - Single ID check instead of multi-field matching
5. **Scalability** - Pattern works for any hierarchical data structure

## Backward Compatibility

This is a **breaking change** for the aggregate JSON structure. The old format with simple IDs cannot coexist with the new composite key format.

### Migration Checklist

- [x] Update `create_aggregates.py` script
- [x] Update TypeScript interfaces in frontend
- [x] Update component filtering logic
- [x] Regenerate all aggregate JSON files
- [x] Verify agency counts increased to 418
- [x] Test drill-down navigation in browser

## Future Considerations

If other datasets have similar non-unique ID issues, apply the same composite key pattern:

1. Identify the parent context (e.g., department)
2. Create composite key: `{parent_id}-{entity_id}`
3. Store original ID in separate field (e.g., `agency_code`)
4. Update all references to use composite keys
