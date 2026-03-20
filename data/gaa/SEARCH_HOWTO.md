# GAA Meilisearch Search Guide

This guide explains how to query the GAA (General Appropriations Act) data directly from Meilisearch instead of using pre-aggregated JSON files. This approach is more efficient for large datasets and provides real-time filtering and aggregation.

## Understanding the GAA Data Hierarchy

The GAA budget data is structured in a **7-level hierarchy**, where each level represents a progressively more detailed breakdown of government spending. Understanding this hierarchy is crucial for navigating and querying the data effectively.

### Hierarchy Overview

```
Level 1: Department
  └── Level 2: Agency
        └── Level 3: FPAP (Program Activity Project)
              └── Level 4: Operating Unit
                    └── Level 5: Fund Sub-Category
                          └── Level 6: Expense Category
                                └── Level 7: Object (Line Item)
```

### Level Descriptions

#### Level 1: Department
- **Fields**: `department` (code), `uacs_dpt_dsc` (description)
- **Example**: `"18"` → "Department of Public Works and Highways (DPWH)"
- **Purpose**: Highest level of government organization (Cabinet-level departments)
- **Typical Count**: ~39 departments

#### Level 2: Agency
- **Fields**: `agency` (code), `uacs_agy_dsc` (description)
- **Example**: `"001"` → "National Museum of the Philippines"
- **Purpose**: Specific agencies or bureaus within a department
- **Composite ID**: `{department}-{agency}` (e.g., `"07-004"`)
- **Typical Count**: ~423 agencies across all departments

#### Level 3: FPAP (Program Activity Project)
- **Fields**: `prexc_fpap_id` (code), `dsc` (description)
- **Example**: `"300207100311000"` → "Construction and Maintenance of Roads"
- **Purpose**: Major programs or activities that agencies implement
- **Composite ID**: `{department}-{agency}-{prexc_fpap_id}`
- **Typical Count**: Thousands of programs across all agencies

#### Level 4: Operating Unit
- **Fields**: `operunit` (code), `uacs_oper_dsc` (description)
- **Example**: `"001"` → "Central Office"
- **Purpose**: Specific organizational units executing the programs
- **Composite ID**: `{department}-{agency}-{prexc_fpap_id}-{operunit}`
- **Note**: Some records may have `null` or `"nan"` for operating units

#### Level 5: Fund Sub-Category
- **Fields**: `fundcd` (code), `uacs_fundsubcat_dsc` (description)
- **Example**: `"101"` → "Specific Budgets of National Government Agencies"
- **Purpose**: Classification of funding sources
- **Composite ID**: `{department}-{agency}-{prexc_fpap_id}-{operunit}-{fundcd}`
- **Common Codes**: 
  - `101101` - Specific Budgets
  - `104102` - Retirement and Life Insurance Premiums

#### Level 6: Expense Category
- **Fields**: `uacs_exp_cd` (code), `uacs_exp_dsc` (description)
- **Example**: `"1"` → "Personnel Services"
- **Purpose**: Type of expenditure (Personnel, Operations, Capital)
- **Composite ID**: `{department}-{agency}-{prexc_fpap_id}-{operunit}-{fundcd}-{uacs_exp_cd}`
- **Common Categories**:
  - `1` - Personnel Services
  - `2` - Maintenance and Other Operating Expenses (MOOE)
  - `6` - Capital Outlays

#### Level 7: Object (Line Item)
- **Fields**: `uacs_sobj_cd` (code), `uacs_sobj_dsc` (description)
- **Example**: `"5010101001"` → "Basic Salary - Civilian"
- **Purpose**: Most granular level - specific items being purchased or paid
- **Composite ID**: `{department}-{agency}-{prexc_fpap_id}-{operunit}-{fundcd}-{uacs_exp_cd}-{uacs_sobj_cd}`
- **This is the actual budget line item level**

### Additional Fields

- **`year`**: Budget year (e.g., 2024, 2023)
- **`amt`**: Amount allocated/spent for this line item
- **`uacs_div_dsc`**: Division description (optional organizational detail)
- **`prexc_level`**: Program execution level indicator
- **`sorder`**: Sort order for display

### Data Characteristics

1. **Composite Keys**: Each level builds on the parent's key
   - Department: `"18"`
   - Agency: `"18-001"`
   - FPAP: `"18-001-300207100311000"`
   - And so on...

2. **Nullable Fields**: Some hierarchy levels may contain `null`, `"nan"`, or empty values, especially:
   - Operating units
   - Fund codes
   - Division descriptions

3. **Multiple Years**: Each line item can appear in multiple years with different amounts

4. **Aggregation**: To get totals at any level, sum the `amt` field for all matching records

### Navigation Pattern

To navigate the hierarchy:
1. Start at Department level (filter by `department`)
2. Drill down to Agency (add `agency` filter)
3. Continue adding filters for each subsequent level
4. At each level, aggregate the `amt` values to get totals

### Example Hierarchy Path

```
Department of Education (DepEd)
  └── National Museum of the Philippines
        └── General Administration and Support
              └── Central Office
                    └── Specific Budgets
                          └── Personnel Services
                                └── Basic Salary - Civilian: ₱5,000,000.00
```

This hierarchical structure allows you to:
- View spending at any level of detail
- Compare across departments, agencies, or programs
- Track year-over-year changes
- Search for specific budget items within a context

## Index Configuration

First, ensure your Meilisearch index has the correct filterable attributes configured:

```bash
cd /home/jason/Sites/philgeps/data/gaa
./configure_meilisearch.sh
```

### Required Filterable Attributes

The `gaa` index must have these fields as filterable:

- `year` - Filter by budget year
- `department` - Department code
- `uacs_dpt_dsc` - Department description
- `agency` - Agency code
- `uacs_agy_dsc` - Agency description
- `prexc_fpap_id` - FPAP code (Financial Plan and Activity Program)
- `operunit` - Operating unit code
- `uacs_oper_dsc` - Operating unit description
- `fundcd` - Fund sub-category code
- `uacs_fundsubcat_dsc` - Fund sub-category description
- `uacs_exp_cd` - Expense category code
- `uacs_exp_dsc` - Expense category description
- `uacs_sobj_cd` - Object code
- `uacs_sobj_dsc` - Object description
- `amt` - Amount (for range filters)

## Meilisearch Client Setup

```typescript
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: import.meta.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: import.meta.env.VITE_MEILISEARCH_API_KEY || 'masterKey',
})

export const gaaIndex = client.index('gaa')
```

## 7-Level Hierarchy Queries

### Level 1: Departments

**Get all departments with their totals:**

```typescript
// Search with facet aggregation
const result = await gaaIndex.search('', {
  facets: ['department', 'uacs_dpt_dsc'],
  limit: 0, // We only want facets, not documents
})

// Process facets to get department list with counts
const departments = Object.entries(result.facetDistribution.department).map(([code, count]) => ({
  id: code,
  description: findDescription(code, result.facetDistribution.uacs_dpt_dsc),
  count: count,
}))
```

**Alternative: Get documents grouped by department:**

```typescript
const result = await gaaIndex.search('', {
  filter: 'year = 2024',
  limit: 10000, // Meilisearch max
})

// Client-side aggregation
const deptMap = new Map()
result.hits.forEach(doc => {
  const key = doc.department
  if (!deptMap.has(key)) {
    deptMap.set(key, {
      id: doc.department,
      description: doc.uacs_dpt_dsc,
      count: 0,
      amount: 0,
    })
  }
  const dept = deptMap.get(key)
  dept.count++
  dept.amount += doc.amt || 0
})

const departments = Array.from(deptMap.values())
```

### Level 2: Agencies (within a Department)

**Get all agencies for a specific department:**

```typescript
const deptId = "18" // e.g., DPWH

const result = await gaaIndex.search('', {
  filter: `department = "${deptId}"`,
  limit: 10000,
})

// Aggregate agencies
const agencyMap = new Map()
result.hits.forEach(doc => {
  const key = `${doc.department}-${doc.agency}`
  if (!agencyMap.has(key)) {
    agencyMap.set(key, {
      id: key,
      agency_code: doc.agency,
      description: doc.uacs_agy_dsc,
      department_id: doc.department,
      count: 0,
      amount: 0,
    })
  }
  const agency = agencyMap.get(key)
  agency.count++
  agency.amount += doc.amt || 0
})

const agencies = Array.from(agencyMap.values())
```

### Level 3: FPAPs (Financial Plans)

**Get all FPAPs for a specific agency:**

```typescript
const deptId = "18"
const agencyCode = "001"

const result = await gaaIndex.search('', {
  filter: `department = "${deptId}" AND agency = "${agencyCode}"`,
  limit: 10000,
})

// Aggregate FPAPs
const fpapMap = new Map()
result.hits.forEach(doc => {
  if (!doc.prexc_fpap_id || doc.prexc_fpap_id === 'nan') return
  
  const key = `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}`
  if (!fpapMap.has(key)) {
    fpapMap.set(key, {
      id: key,
      fpap_code: doc.prexc_fpap_id,
      description: doc.dsc,
      agency_id: `${doc.department}-${doc.agency}`,
      department_id: doc.department,
      count: 0,
      amount: 0,
    })
  }
  const fpap = fpapMap.get(key)
  fpap.count++
  fpap.amount += doc.amt || 0
})

const fpaps = Array.from(fpapMap.values())
```

### Level 4: Operating Units

**Get all operating units for a specific FPAP:**

```typescript
const deptId = "18"
const agencyCode = "001"
const fpapCode = "300207100311000"

const result = await gaaIndex.search('', {
  filter: `department = "${deptId}" AND agency = "${agencyCode}" AND prexc_fpap_id = "${fpapCode}"`,
  limit: 10000,
})

// Aggregate operating units
const operunitMap = new Map()
result.hits.forEach(doc => {
  if (!doc.operunit || doc.operunit === 'nan') return
  
  const key = `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}`
  if (!operunitMap.has(key)) {
    operunitMap.set(key, {
      id: key,
      operunit_code: doc.operunit,
      description: doc.uacs_oper_dsc,
      fpap_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}`,
      agency_id: `${doc.department}-${doc.agency}`,
      department_id: doc.department,
      count: 0,
      amount: 0,
    })
  }
  const operunit = operunitMap.get(key)
  operunit.count++
  operunit.amount += doc.amt || 0
})

const operunits = Array.from(operunitMap.values())
```

### Level 5: Fund Sub-Categories

**Get all fund sub-categories for a specific operating unit:**

```typescript
const deptId = "18"
const agencyCode = "001"
const fpapCode = "300207100311000"
const operunitCode = "001"

const result = await gaaIndex.search('', {
  filter: `department = "${deptId}" AND agency = "${agencyCode}" AND prexc_fpap_id = "${fpapCode}" AND operunit = "${operunitCode}"`,
  limit: 10000,
})

// Aggregate fund sub-categories
const fundMap = new Map()
result.hits.forEach(doc => {
  if (!doc.fundcd || doc.fundcd === 'nan') return
  
  const key = `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}-${doc.fundcd}`
  if (!fundMap.has(key)) {
    fundMap.set(key, {
      id: key,
      fund_code: doc.fundcd,
      description: doc.uacs_fundsubcat_dsc,
      operating_unit_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}`,
      fpap_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}`,
      agency_id: `${doc.department}-${doc.agency}`,
      department_id: doc.department,
      count: 0,
      amount: 0,
    })
  }
  const fund = fundMap.get(key)
  fund.count++
  fund.amount += doc.amt || 0
})

const funds = Array.from(fundMap.values())
```

### Level 6: Expense Categories

**Get all expense categories for a specific fund:**

```typescript
const deptId = "18"
const agencyCode = "001"
const fpapCode = "300207100311000"
const operunitCode = "001"
const fundCode = "101"

const result = await gaaIndex.search('', {
  filter: `department = "${deptId}" AND agency = "${agencyCode}" AND prexc_fpap_id = "${fpapCode}" AND operunit = "${operunitCode}" AND fundcd = "${fundCode}"`,
  limit: 10000,
})

// Aggregate expense categories
const expenseMap = new Map()
result.hits.forEach(doc => {
  if (!doc.uacs_exp_cd || doc.uacs_exp_cd === 'nan') return
  
  const key = `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}-${doc.fundcd}-${doc.uacs_exp_cd}`
  if (!expenseMap.has(key)) {
    expenseMap.set(key, {
      id: key,
      expense_code: doc.uacs_exp_cd,
      description: doc.uacs_exp_dsc,
      fund_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}-${doc.fundcd}`,
      operating_unit_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}`,
      fpap_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}`,
      agency_id: `${doc.department}-${doc.agency}`,
      department_id: doc.department,
      count: 0,
      amount: 0,
    })
  }
  const expense = expenseMap.get(key)
  expense.count++
  expense.amount += doc.amt || 0
})

const expenses = Array.from(expenseMap.values())
```

### Level 7: Objects (Line Items)

**Get all objects for a specific expense category:**

```typescript
const deptId = "18"
const agencyCode = "001"
const fpapCode = "300207100311000"
const operunitCode = "001"
const fundCode = "101"
const expenseCode = "5021306"

const result = await gaaIndex.search('', {
  filter: `department = "${deptId}" AND agency = "${agencyCode}" AND prexc_fpap_id = "${fpapCode}" AND operunit = "${operunitCode}" AND fundcd = "${fundCode}" AND uacs_exp_cd = "${expenseCode}"`,
  limit: 10000,
})

// Aggregate objects
const objectMap = new Map()
result.hits.forEach(doc => {
  if (!doc.uacs_sobj_cd || doc.uacs_sobj_cd === 'nan') return
  
  const key = `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}-${doc.fundcd}-${doc.uacs_exp_cd}-${doc.uacs_sobj_cd}`
  if (!objectMap.has(key)) {
    objectMap.set(key, {
      id: key,
      object_code: doc.uacs_sobj_cd,
      description: doc.uacs_sobj_dsc,
      expense_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}-${doc.fundcd}-${doc.uacs_exp_cd}`,
      fund_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}-${doc.fundcd}`,
      operating_unit_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}-${doc.operunit}`,
      fpap_id: `${doc.department}-${doc.agency}-${doc.prexc_fpap_id}`,
      agency_id: `${doc.department}-${doc.agency}`,
      department_id: doc.department,
      count: 0,
      amount: 0,
    })
  }
  const object = objectMap.get(key)
  object.count++
  object.amount += doc.amt || 0
})

const objects = Array.from(objectMap.values())
```

## Year-over-Year Queries

**Get data for a specific hierarchy level across multiple years:**

```typescript
// Example: Get agency totals for 2023 and 2024
const deptId = "18"

const results2023 = await gaaIndex.search('', {
  filter: `department = "${deptId}" AND year = 2023`,
  limit: 10000,
})

const results2024 = await gaaIndex.search('', {
  filter: `department = "${deptId}" AND year = 2024`,
  limit: 10000,
})

// Aggregate both years
const agencyYearMap = new Map()

function processYear(hits, year) {
  hits.forEach(doc => {
    const key = `${doc.department}-${doc.agency}`
    if (!agencyYearMap.has(key)) {
      agencyYearMap.set(key, {
        id: key,
        agency_code: doc.agency,
        description: doc.uacs_agy_dsc,
        department_id: doc.department,
        years: {},
      })
    }
    const agency = agencyYearMap.get(key)
    if (!agency.years[year]) {
      agency.years[year] = { count: 0, amount: 0 }
    }
    agency.years[year].count++
    agency.years[year].amount += doc.amt || 0
  })
}

processYear(results2023.hits, 2023)
processYear(results2024.hits, 2024)

const agenciesWithYears = Array.from(agencyYearMap.values())
```

## Search with Text Query

**Search within a specific hierarchy level:**

```typescript
// Search for "road construction" within a specific agency
const deptId = "18"
const agencyCode = "001"

const result = await gaaIndex.search('road construction', {
  filter: `department = "${deptId}" AND agency = "${agencyCode}"`,
  limit: 100,
  attributesToSearchOn: ['dsc', 'uacs_sobj_dsc', 'uacs_exp_dsc'],
})

// Results contain matching line items with full context
result.hits.forEach(doc => {
  console.log({
    description: doc.dsc,
    object: doc.uacs_sobj_dsc,
    amount: doc.amt,
    year: doc.year,
  })
})
```

## Performance Tips

1. **Limit Results**: Always use `limit` parameter (max 10,000 in Meilisearch)
2. **Filter First**: Apply filters before client-side aggregation
3. **Batch Requests**: If you need multiple hierarchy levels, fetch them in parallel
4. **Cache Results**: Cache frequently accessed aggregations in memory or Redis
5. **Pagination**: For large result sets, use pagination with `offset` and `limit`

## Example: Complete Hierarchy Drill-Down

```typescript
async function getDrillDownData(filters: {
  department?: string
  agency?: string
  fpap?: string
  operunit?: string
  fundcd?: string
  expense?: string
  year?: number
}) {
  // Build filter string
  const filterParts: string[] = []
  
  if (filters.department) filterParts.push(`department = "${filters.department}"`)
  if (filters.agency) filterParts.push(`agency = "${filters.agency}"`)
  if (filters.fpap) filterParts.push(`prexc_fpap_id = "${filters.fpap}"`)
  if (filters.operunit) filterParts.push(`operunit = "${filters.operunit}"`)
  if (filters.fundcd) filterParts.push(`fundcd = "${filters.fundcd}"`)
  if (filters.expense) filterParts.push(`uacs_exp_cd = "${filters.expense}"`)
  if (filters.year) filterParts.push(`year = ${filters.year}`)
  
  const filterString = filterParts.join(' AND ')
  
  const result = await gaaIndex.search('', {
    filter: filterString,
    limit: 10000,
  })
  
  return result.hits
}

// Usage:
const data = await getDrillDownData({
  department: '18',
  agency: '001',
  year: 2024,
})
```

## Updating Index Configuration

After modifying `configure_meilisearch.sh`, run it to apply changes:

```bash
cd /home/jason/Sites/philgeps/data/gaa
chmod +x configure_meilisearch.sh
./configure_meilisearch.sh
```

The index will reindex automatically (may take a few minutes for large datasets).
