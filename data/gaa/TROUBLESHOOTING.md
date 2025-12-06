# GAA Budget Browser Troubleshooting

## Issue: Agencies not showing / Expenses and Fund Subcategories missing

### ✅ Fixed Data Integrity Issue

The root cause was that the `amt` column was stored as VARCHAR instead of numeric. This has been **fixed** by:

1. ✅ Updated `gaa_csv_to_parquet.py` to convert `amt` to numeric (float) during import
2. ✅ Regenerated `gaa.parquet` with proper numeric data
3. ✅ Regenerated all aggregate JSON files with correct amounts
4. ✅ Added validation to ensure `amt` is DOUBLE type

### Verification Steps

#### 1. Check if data was regenerated correctly:

```bash
cd /Users/jason/Sites/transparency-dashboard/data/gaa

# Verify amt is numeric in Parquet
/usr/bin/python3 create_aggregates_sql.py --debug-only
```

**Expected output:**
```
→ Data type validation:
    amt column types:
      DOUBLE: 3,776,789 rows
    ✓ amt column is properly numeric!
```

#### 2. Check aggregate files are updated:

```bash
ls -lh ../../public/data/gaa/aggregates/
```

**Expected:** Files should have recent timestamps (today's date)

#### 3. Check browser console for debugging:

Open your browser's Developer Tools (F12) and go to the Console tab when viewing:
- `/budget/departments` - Should see departments loading
- `/budget/departments/<slug>` - Should see: `"Found X agencies for department Y"`
- `/budget/departments/<slug>/agencies/<agency-slug>` - Should see: `"Found X funds and Y expenses for agency Z"`

### Common Issues & Solutions

#### Issue 1: Agencies showing count 0

**Cause:** Old aggregate data or year filter excluding all agencies

**Solution:**
1. Check the console log: `"Found X agencies for department Y"`
2. Try different years using the year tabs
3. If X is 0, regenerate aggregates

#### Issue 2: Empty lists despite showing counts

**Cause:** Year filtering too strict or data mismatch

**Debug in console:**
```javascript
// In browser console on department page:
console.log('Selected year:', selectedYear)
console.log('Agencies:', agencies)
console.log('Filtered:', filteredAgencies)
```

**Solution:** The console logs will show which year has data

#### Issue 3: Fund subcategories or expenses not showing

**Cause:** Agency ID mismatch or missing data

**Debug:** Check console for: `"Found X funds and Y expenses for agency Z"`

**Solution:** 
- If X and Y are 0, the agency might not have data for that entity type
- Try switching between the "Fund Sub-Categories" and "Expense Categories" tabs
- Check if data exists by looking at the summary cards

### Manual Data Check

To verify data structure manually:

```bash
cd /Users/jason/Sites/transparency-dashboard

# Check a specific department's agencies
python3 -c "
import json
d = json.load(open('public/data/gaa/aggregates/departments.json'))
a = json.load(open('public/data/gaa/aggregates/agencies.json'))
dept = d['data'][0]  # First department
print(f'Department: {dept[\"id\"]} - {dept[\"description\"]}')
agencies = [ag for ag in a['data'] if ag['department_id'] == dept['id']]
print(f'Agencies: {len(agencies)}')
for ag in agencies[:5]:
    print(f'  - {ag[\"id\"]}: {ag[\"description\"]}')
"
```

### Re-import Data (if needed)

If agencies/funds/expenses are still not showing:

```bash
cd /Users/jason/Sites/transparency-dashboard/data/gaa

# 1. Regenerate Parquet with numeric conversion
/usr/bin/python3 gaa_csv_to_parquet.py --csv-dir data --output gaa.parquet

# 2. Verify amt is numeric
/usr/bin/python3 create_aggregates_sql.py --debug-only

# 3. Regenerate aggregates
/usr/bin/python3 create_aggregates.py --parquet-file gaa.parquet --output-dir ../../public/data/gaa/aggregates

# 4. (Optional) Re-import to MeiliSearch
/usr/bin/python3 import_gaa.py --parquet-file gaa.parquet --index-name gaa
```

### Expected Data Counts

After regeneration, you should see:

```
✓ Generated 39 departments
✓ Generated 136 agencies
✓ Generated 1279 fund sub-categories
✓ Generated 1519 expense categories
✓ Generated 28705 objects
✓ Generated 6 years
```

### Frontend Debugging

Added console logging to help debug:

1. **DepartmentPage**: Logs agencies found and filtered agencies count
2. **AgencyPage**: Logs funds and expenses found

Check these logs in the browser console to see what's happening with the data flow.

### Data Structure Reference

```json
// agencies.json structure
{
  "id": "001",
  "description": "Senate",
  "department_id": "01",
  "years": {
    "2025": { "count": 123, "amount": 5000000.0 }
  }
}

// fund_subcategories.json structure
{
  "description": "General Fund",
  "department_id": "01",
  "agency_id": "001",
  "years": {
    "2025": { "count": 50, "amount": 2000000.0 }
  }
}

// expenses.json structure
{
  "id": "5010101000",
  "description": "Salaries and Wages",
  "department_id": "01",
  "agency_id": "001",
  "years": {
    "2025": { "count": 30, "amount": 1500000.0 }
  }
}
```

### Still Having Issues?

1. Clear browser cache and reload
2. Check browser console for errors
3. Verify all JSON files in `public/data/gaa/aggregates/` exist and have content
4. Make sure the dev server is running and serving the latest files
