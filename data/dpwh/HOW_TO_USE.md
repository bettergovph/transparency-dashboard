## DPWH Meilisearch Data Usage

This document describes **how Meilisearch is used for DPWH infrastructure data**, including:

- **Index configuration and connection**
- **Document schema used in the `dpwh` index**
- **Query patterns (search + filters)**
- **How results are aggregated for charts and maps**

It is intentionally UI‑agnostic so it can be reused in other projects.

---

## Meilisearch Client and Index

### Client configuration

The Meilisearch client is configured once and reused across the app:

```ts
import { MeiliSearch } from 'meilisearch'

const MEILISEARCH_HOST = import.meta.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700'
const MEILISEARCH_API_KEY = import.meta.env.VITE_MEILISEARCH_API_KEY || 'masterKey'

const client = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
})
```

### DPWH index reference

The DPWH search index is accessed as:

```ts
export const dpwhIndex = client.index('dpwh')
```

Any project browser or analytics page that needs DPWH data should call `dpwhIndex.search()` directly with a query and optional filters.

---

## DPWH Document Schema (`dpwh` index)

The UI assumes that each document in the `dpwh` index has (at least) the following shape:

```ts
export interface DPWHProject {
  contractId: string
  description: string
  category: string
  componentCategories?: string[]
  status: string
  location: {
    region: string
    province: string
    municipality?: string
    barangay?: string
  }
  contractor: string
  programName: string
  sourceOfFunds?: string
  budget: number
  amountPaid: number
  progress: number
  isLive: boolean
  livestreamUrl?: string
  infraYear: number
  reportCount: number
  startDate?: string
  completionDate?: string
  latitude?: number
  longitude?: number
  hasSatelliteImage?: boolean
}
```

**Important points for indexing:**

- `location.region` and `location.province` are used for regional/provincial filtering and aggregation.
- `category` and `contractor` are used both for filtering and for aggregation (top categories, top contractors, etc.).
- `infraYear` (numeric) is used for year filters and time-series charts.
- `budget`, `amountPaid`, and `progress` are numeric and are summed/averaged client-side.
- `latitude` and `longitude` are used for mapping; projects without valid coordinates are excluded from map layers.

Make sure these fields are configured as **filterable** in Meilisearch if you want to use them in `filter` expressions.

---

## Querying the DPWH Index

### Basic search

A generic search against the `dpwh` index looks like this:

```ts
const result = await dpwhIndex.search(queryString || '', {
  filter: filtersStringOrUndefined,
  limit: 10_000,
})

const projects = result.hits as DPWHProject[]
```

- `queryString` is usually a user‑entered free‑text query (e.g., contract ID, part of the description, contractor name, location text, etc.).
- `filter` is a **single Meilisearch filter string** that combines multiple filter dimensions (years, regions, provinces, categories, statuses, contractor, etc.).
- `limit` is set to `10000` to cap the number of hits; downstream UI may show a warning when this limit is reached.

### Filter string construction

Filters are built by combining **optional filter groups**. Each group corresponds to a field and is OR‑joined within the group, then groups are AND‑joined together. For example:

```ts
const filterParts: string[] = []

// Years (infraYear)
if (selectedYears.length > 0) {
  const yearFilters = selectedYears.map(year => `infraYear = ${year}`).join(' OR ')
  filterParts.push(`(${yearFilters})`)
}

// Regions (location.region)
if (selectedRegions.length > 0) {
  const regionFilters = selectedRegions
    .map(region => `location.region = "${region}"`)
    .join(' OR ')
  filterParts.push(`(${regionFilters})`)
}

// Provinces (location.province)
if (selectedProvinces.length > 0) {
  const provinceFilters = selectedProvinces
    .map(province => `location.province = "${province}"`)
    .join(' OR ')
  filterParts.push(`(${provinceFilters})`)
}

// Categories (category)
if (selectedCategories.length > 0) {
  const categoryFilters = selectedCategories
    .map(category => `category = "${category}"`)
    .join(' OR ')
  filterParts.push(`(${categoryFilters})`)
}

// Statuses (status)
if (selectedStatuses.length > 0) {
  const statusFilters = selectedStatuses
    .map(status => `status = "${status}"`)
    .join(' OR ')
  filterParts.push(`(${statusFilters})`)
}

// Contractor‑specific view (contractor)
if (contractorName) {
  filterParts.push(`contractor = "${contractorName}"`)
}

const filters = filterParts.length > 0 ? filterParts.join(' AND ') : undefined
```

This pattern can be reused in any environment:

- Each UI filter control updates one of the `selected*` arrays.
- The filter builder converts those arrays into a Meilisearch `filter` string.
- The same string is used for the main search and for derived visualizations (charts, maps).

### Debounced search (optional pattern)

To avoid firing a request on every keystroke, the search is wrapped in a debounce:

```ts
useEffect(() => {
  const handle = setTimeout(() => {
    performSearch()
  }, 500)

  return () => clearTimeout(handle)
}, [queryString, selectedYears, selectedRegions, selectedProvinces, selectedCategories, selectedStatuses])
```

This is not required for correctness but helps with UX; any framework can implement a similar debounce around `dpwhIndex.search`.

---

## Using Results for Tables and Detail Pages

Once you have `projects: DPWHProject[]` from Meilisearch, most of the UI data comes directly from those fields:

- **Tabular listings**:
  - Render `contractId`, `description`, `category`, `contractor`, `location.province`, `budget`, `amountPaid`, `infraYear`, `progress`, `status`, `startDate`, `completionDate`.
  - Client-side sorting can be implemented on these properties as needed.

- **Detail pages**:
  - Can either:
    - Use the Meilisearch document directly (if the index holds all needed fields), or
    - Use `contractId` to fetch more detailed information from another API (e.g., a DPWH REST API), while still using Meilisearch for discovery.

- **Download endpoints (JSON/CSV)**:
  - Export the current `projects` array as JSON or CSV.
  - Typically, the export uses the same subset of fields as the table.

---

## Aggregations and Visualizations (Client-Side)

All high-level charts and summaries are computed **from the Meilisearch hits in memory**, not from Meilisearch aggregations.

### Example: totals and averages

```ts
const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)

const avgProgress = projects.length > 0
  ? projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length
  : 0
```

These are displayed as summary stats (total budget, average progress) for the current filter set.

### Example: top regions by budget

```ts
const regionMap = new Map<string, { count: number; budget: number }>()

projects.forEach(p => {
  const region = p.location?.region || 'Unknown'
  const existing = regionMap.get(region) || { count: 0, budget: 0 }
  regionMap.set(region, {
    count: existing.count + 1,
    budget: existing.budget + (p.budget || 0),
  })
})

const topRegions = Array.from(regionMap.entries())
  .map(([region, data]) => ({ region, ...data }))
  .sort((a, b) => b.budget - a.budget)
  .slice(0, 10)
```

This pattern is repeated for **contractors**, **categories**, **statuses**, **years**, and **provinces**:

- Use a `Map` keyed by the dimension (e.g., contractor name).
- Increment `count` and add `budget` for each project.
- Convert to an array, sort, and slice for top N lists.

### Example: year distribution

```ts
const yearMap = new Map<string, { count: number; budget: number }>()

projects.forEach(p => {
  const year = String(p.infraYear || 'Unknown')
  const existing = yearMap.get(year) || { count: 0, budget: 0 }
  yearMap.set(year, {
    count: existing.count + 1,
    budget: existing.budget + (p.budget || 0),
  })
})

const yearDistribution = Array.from(yearMap.entries())
  .map(([year, data]) => ({ year, ...data }))
  .sort((a, b) => a.year.localeCompare(b.year))
```

### Example: hierarchical regions → provinces

```ts
const regionMap = new Map<string, { count: number; budget: number }>()

projects.forEach(p => {
  const region = p.location?.region || 'Unknown'
  const existing = regionMap.get(region) || { count: 0, budget: 0 }
  regionMap.set(region, {
    count: existing.count + 1,
    budget: existing.budget + (p.budget || 0),
  })
})

const regionHierarchy = Array.from(regionMap.entries())
  .map(([region, regionData]) => {
    const provincesInRegion = projects
      .filter(p => p.location?.region === region)
      .reduce((acc, p) => {
        const province = p.location?.province || 'Unknown'
        const existing = acc.get(province) || { count: 0, budget: 0 }
        acc.set(province, {
          count: existing.count + 1,
          budget: existing.budget + (p.budget || 0),
        })
        return acc
      }, new Map<string, { count: number; budget: number }>())

    const provinces = Array.from(provincesInRegion.entries())
      .map(([province, data]) => ({ province, ...data }))
      .sort((a, b) => b.budget - a.budget)

    return {
      region,
      ...regionData,
      provinces,
    }
  })
  .sort((a, b) => b.budget - a.budget)
```

This structure can be fed into any UI that needs a drill‑down from region to province.

---

## Map Usage (Location Data from Meilisearch)

The map view uses only the `DPWHProject` documents fetched from Meilisearch, filtered to those with valid coordinates.

### Filtering projects with coordinates

```ts
const projectsWithCoords = projects.filter(p =>
  p.latitude &&
  p.longitude &&
  p.latitude >= -90 && p.latitude <= 90 &&
  p.longitude >= -180 && p.longitude <= 180
)
```

### Prioritizing projects when there are many

If there are more projects with coordinates than can reasonably be displayed, a subset is chosen based on status, budget, and year:

```ts
const displayedProjects = projectsWithCoords
  .sort((a, b) => {
    // 1) On-Going projects first
    if (a.status === 'On-Going' && b.status !== 'On-Going') return -1
    if (a.status !== 'On-Going' && b.status === 'On-Going') return 1

    // 2) Higher budget first
    if (a.budget !== b.budget) return b.budget - a.budget

    // 3) More recent year first
    return b.infraYear - a.infraYear
  })
  .slice(0, displayLimit) // e.g., 1000 projects
```

The actual map implementation (Leaflet, clustering, custom markers) is independent from Meilisearch; all it needs is the `displayedProjects` array with `latitude`, `longitude`, `status`, `budget`, and identification fields.

---

## Contractor-Specific Views

For contractor‑focused views, the pattern is:

1. **Filter Meilisearch by contractor** using the same `dpwhIndex.search` API:

   ```ts
   const result = await dpwhIndex.search('', {
     filter: `contractor = "${contractorName}"`,
     limit: 10_000,
   })

   const contractorProjects = result.hits as DPWHProject[]
   ```

2. **Compute contractor‑level aggregates** from `contractorProjects`:

   - Total projects, total budget, total amount paid, average progress.
   - Projects per year (for time series charts).
   - Projects per region (for geographic distribution).

3. **Optionally** reuse the same generic browser patterns (search input + filters → filter string → `dpwhIndex.search`) but always include the contractor filter in the filter builder.

---

## Implementation Notes and Tips

- All higher‑level features (filters, charts, map, drilldowns) are built on top of **a single Meilisearch search call** per view.
- Meilisearch is used only for **search + filtering**; all aggregations are calculated client‑side from the hits.
- The index schema is deliberately simple and flat, with one nested `location` object; this makes it easy to map to UI and to other analytics pipelines.
- To reuse this setup in another project:
  - Recreate the `DPWHProject` schema (or adapt the types to your index).
  - Expose `dpwhIndex` from a small Meilisearch module.
  - Implement:
    - A filter builder that produces Meilisearch `filter` strings.
    - A debounced search function that calls `dpwhIndex.search`.
    - Aggregation functions similar to the examples above for whatever charts or summaries you need.
