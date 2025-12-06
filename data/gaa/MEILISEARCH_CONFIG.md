# MeiliSearch GAA Index Configuration

This document describes the MeiliSearch configuration for the `gaa` index.

## Configuration Script

Use the `configure_meilisearch.sh` script to configure the GAA index:

```bash
cd data/gaa
./configure_meilisearch.sh
```

The script will automatically load environment variables from `.env` and configure:
- Filterable attributes
- Sortable attributes  
- Searchable attributes
- Displayed attributes

## Configured Attributes

### Filterable Attributes (13 fields)

These fields can be used in filter queries:

- `year` - Budget year (2020-2025)
- `department` - Department code
- `uacs_dpt_dsc` - Department description
- `agency` - Agency code
- `uacs_agy_dsc` - Agency description
- `uacs_oper_dsc` - Operating unit description
- `uacs_fundsubcat_dsc` - Fund subcategory description
- `uacs_exp_cd` - Expense code
- `uacs_exp_dsc` - Expense description
- `uacs_sobj_cd` - **Object code** (enables object filtering)
- `uacs_sobj_dsc` - Object description
- `uacs_div_dsc` - Division description
- `amt` - Amount

### Sortable Attributes (2 fields)

These fields can be used for sorting results:

- `year` - Sort by year
- `amt` - Sort by amount

### Searchable Attributes (8 fields)

These fields are included in full-text search:

- `dsc` - Item description
- `uacs_dpt_dsc` - Department description
- `uacs_agy_dsc` - Agency description
- `uacs_oper_dsc` - Operating unit
- `uacs_fundsubcat_dsc` - Fund subcategory
- `uacs_exp_dsc` - Expense description
- `uacs_sobj_dsc` - Object description
- `uacs_div_dsc` - Division description

## Example Filter Queries

### Filter by Object Code
```typescript
filter: 'uacs_sobj_cd = "5010101001"'
```

### Filter by Department and Agency
```typescript
filter: 'uacs_dpt_dsc = "Congress of the Philippines (CONGRESS)" AND uacs_agy_dsc = "Senate"'
```

### Filter by Year and Amount Range
```typescript
filter: 'year = 2025 AND amt > 1000000'
```

### Combined Filters
```typescript
filter: 'uacs_sobj_cd = "5010101001" AND uacs_dpt_dsc = "Congress..." AND uacs_agy_dsc = "Senate" AND year = 2025'
```

## Sorting Examples

### Sort by Year (Descending)
```typescript
sort: ['year:desc']
```

### Sort by Amount (Descending) then Year
```typescript
sort: ['amt:desc', 'year:desc']
```

## Verification

Check the current configuration:

```bash
curl -X GET "https://search2.bettergov.ph/indexes/gaa/settings/filterable-attributes" \
  -H "Authorization: Bearer $VITE_MEILISEARCH_API_KEY"
```

## Processing Time

**Note:** MeiliSearch processes configuration changes asynchronously:
- Small indices: ~10-30 seconds
- Large indices (3.7M+ documents): ~90-120 seconds per setting

You can check task status:

```bash
curl -X GET "https://search2.bettergov.ph/tasks?indexUids=gaa&limit=5" \
  -H "Authorization: Bearer $VITE_MEILISEARCH_API_KEY"
```

## Troubleshooting

### Error: "Attribute X is not filterable"

If you see this error, it means the filterable attributes haven't been configured or are still processing:

1. Run `./configure_meilisearch.sh`
2. Wait for tasks to complete (~2 minutes for large indices)
3. Verify with the verification command above

### Task Status

- `enqueued` - Waiting to start
- `processing` - Currently being processed
- `succeeded` - Completed successfully
- `failed` - Error occurred (check error field)

## Related Files

- **Configuration Script:** `data/gaa/configure_meilisearch.sh`
- **Meilisearch Client:** `src/lib/meilisearch.ts`
- **Budget Types:** `src/types/budget.ts`
- **Object Detail Page:** `src/components/budget/ObjectDetailPage.tsx`
