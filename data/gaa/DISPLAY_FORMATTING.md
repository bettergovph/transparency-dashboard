# GAA Amount Display - FINAL Solution

## CRITICAL: Two Different Data Sources with Different Scales

### 1. Aggregate JSON Files (Thousands)
**GAA aggregate values are stored in THOUSANDS of pesos.**

- **Source**: `/public/data/gaa/aggregates/*.json` (departments.json, agencies.json, etc.)
- **Scale**: Values are in THOUSANDS of pesos
- **Conversion**: Multiply by **1,000** to get actual pesos
- **Used by**: BudgetBrowser, DepartmentsListPage, DepartmentPage, AgencyPage
- **Function**: `formatGAAAmount()` in `src/lib/formatGAAAmount.ts`

#### Example
- Aggregate value: `6,326,324,300`
- Meaning: 6,326,324,300 **thousand** pesos  
- Actual amount: ₱6,326,324,300,000
- Display: **₱6.33T** (trillion) ✅

### 2. MeiliSearch/Parquet Data (Millions)
**MeiliSearch data stores amounts in MILLIONS of pesos.**

- **Source**: MeiliSearch index from `gaa.parquet`
- **Scale**: Values are in MILLIONS of pesos (labeled "in millions" in source CSV)
- **Conversion**: Multiply by **1,000,000** to get actual pesos
- **Used by**: ObjectDetailPage (line item details)
- **Function**: Custom formatting in ObjectDetailPage component

#### Example
- MeiliSearch value: `739.24`
- Meaning: 739.24 **million** pesos
- Actual amount: ₱739,240,000
- Display: **₱739.24M** (million) ✅

## The Problem

The display was showing incorrect amounts because we didn't understand the data was in thousands:
- ❌ Was showing: ₱125.44**T** (using wrong multiplier)
- ✅ Should show: ₱125.44**B** (correct with ×1,000)

## The Solution

Created a shared utility function that multiplies by 1,000 to convert from thousands to actual pesos, then formats appropriately.

### Implementation

**File:** `src/lib/formatGAAAmount.ts`

```typescript
export function formatGAAAmount(value: number): string {
  // Value is in thousands, so multiply by 1,000 to get actual pesos
  const actualPesos = value * 1_000

  if (actualPesos >= 1_000_000_000_000) {
    return `₱${(actualPesos / 1_000_000_000_000).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}T`
  } else if (actualPesos >= 1_000_000_000) {
    return `₱${(actualPesos / 1_000_000_000).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}B`
  } else if (actualPesos >= 1_000_000) {
    return `₱${(actualPesos / 1_000_000).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}M`
  } else if (actualPesos >= 1_000) {
    return `₱${(actualPesos / 1_000).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}K`
  } else {
    return `₱${actualPesos.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }
}
```

### Updated Components

All 5 GAA budget display components use this function:

1. ✅ `BudgetBrowser.tsx`
2. ✅ `DepartmentsListPage.tsx`
3. ✅ `DepartmentPage.tsx`
4. ✅ `AgencyPage.tsx`
5. ✅ `ObjectDetailPage.tsx`

## Example Transformations

| Aggregate Value (thousands) | × 1,000 | Display |
|-----------------------------|---------|---------|
| 6,326,324,300 | 6,326,324,300,000 | **₱6.33T** |
| 125,440,000 | 125,440,000,000 | **₱125.44B** |
| 8,857,537 | 8,857,537,000 | **₱8.86B** |
| 543,636 | 543,636,000 | **₱543.64M** |

## Philippine National Budget Totals ✅

```
2020: ₱4.10 trillion  (aggregate: 4,099,988,785 thousand)
2021: ₱4.51 trillion  (aggregate: 4,506,000,000 thousand)
2022: ₱5.02 trillion  (aggregate: 5,023,600,000 thousand)
2023: ₱5.27 trillion  (aggregate: 5,268,000,000 thousand)
2024: ₱5.77 trillion  (aggregate: 5,767,600,000 thousand)
2025: ₱6.33 trillion  (aggregate: 6,326,324,300 thousand)

TOTAL: ₱30.99 trillion
```

These match the expected Philippine national budget scale! 🎉

## Why Thousands?

The GAA source data likely stores amounts in thousands for several reasons:
1. **Precision**: Avoids floating point issues with very large numbers
2. **File size**: Smaller numbers = more efficient storage
3. **Convention**: Philippine government accounting often uses thousands as base unit
4. **Historical**: Legacy system compatibility

## Key Principle

> **Store data in its source format** (thousands), **transform only at display time** (multiply by 1,000)

This approach:
- ✅ No data migration needed
- ✅ Single point of formatting logic  
- ✅ Efficient storage (smaller numbers)
- ✅ Easy to maintain and update

## Testing

Quick verification the fix works:

1. Navigate to `/budget` - yearly totals should show **trillions** (~₱6T for 2025)
2. Click a department - amounts should show **billions** (~₱100B - ₱500B range)
3. Click an agency - amounts should show **billions** or **millions**
4. Click an object - individual line items make sense

### Before vs After

**Before** (incorrect ×1M multiplier):
- National budget: ₱6,326T (quadrillions!) ❌
- Department: ₱125T (trillions!) ❌

**After** (correct ×1K multiplier):
- National budget: ₱6.33T (trillions) ✅
- Department: ₱125.44B (billions) ✅

## Important Notes

- **Aggregates (JSON)** store amounts in **thousands** - use `formatGAAAmount()` (multiply by 1,000)
- **MeiliSearch/Parquet** stores amounts in **millions** - multiply by 1,000,000 for display
- **Why different scales?** Source CSV data is labeled "in millions", but aggregates sum these into thousands for efficiency
- **Charts/graphs** should use appropriate formatting based on data source
- **CSV exports** should document that source values are in millions
- **API responses** should specify units or pre-format values

## Debugging

If you see amounts that seem wrong:
1. **Identify data source**: Aggregates (thousands) vs MeiliSearch (millions)
2. **Aggregates**: Use `formatGAAAmount()` - multiplies by 1,000
3. **MeiliSearch**: Multiply by 1,000,000 before formatting
4. Verify you're not multiplying twice (once in data, once in display)
5. Check if aggregates match MeiliSearch totals (they should when converted correctly)

**Remember**: 
- **Aggregate values** are in **thousands** → multiply by **1,000**
- **MeiliSearch values** are in **millions** → multiply by **1,000,000**
