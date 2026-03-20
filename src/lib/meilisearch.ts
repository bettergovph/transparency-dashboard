import { MeiliSearch } from 'meilisearch'
import type { SearchDocument } from '@/types/search'
import type { BudgetDocument } from '@/types/budget'

const MEILISEARCH_HOST = import.meta.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700'
const MEILISEARCH_API_KEY = import.meta.env.VITE_MEILISEARCH_API_KEY || 'masterKey'
const MEILISEARCH_INDEX_NAME = import.meta.env.VITE_MEILISEARCH_INDEX_NAME || 'philgeps'

const client = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
})

export const searchIndex = client.index(MEILISEARCH_INDEX_NAME)
export const budgetIndex = client.index('gaa')
export const dpwhIndex = client.index('dpwh')
export const awardeesIndex = client.index('philgeps_awardees')
export const areasIndex = client.index('philgeps_area_of_deliveries')
export const organizationsIndex = client.index('philgeps_organizations')

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
}

export interface SearchResult {
  hits: SearchDocument[];
  estimatedTotalHits: number;
  processingTimeMs: number;
  query: string;
}

export async function searchDocuments(options: SearchOptions): Promise<SearchResult> {
  try {
    const result = await searchIndex.search(options.query, {
      limit: options.limit || 10,
      offset: options.offset || 0,
      filter: options.filter,
      sort: options.sort,
      attributesToHighlight: ['*'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    })

    return {
      hits: result.hits as unknown as SearchDocument[],
      estimatedTotalHits: result.estimatedTotalHits,
      processingTimeMs: result.processingTimeMs,
      query: result.query,
    }
  } catch (error) {
    console.error('Search error:', error)
    throw new Error('Failed to search documents')
  }
}

export async function getDocumentById(id: string): Promise<SearchDocument | null> {
  try {
    const document = await searchIndex.getDocument(id)
    return document as unknown as SearchDocument
  } catch (error) {
    console.error('Get document error:', error)
    return null
  }
}

// Filter autocomplete indices
export const filterIndices = {
  area: client.index('philgeps_area_of_deliveries'),
  awardee: client.index('philgeps_awardees'),
  business_categories: client.index('philgeps_business_categories'),
  organizations: client.index('philgeps_organizations'),
}

export interface FilterOption {
  value: string;
  label: string;
}

export async function searchFilterOptions(
  filterType: keyof typeof filterIndices,
  query: string,
  limit: number = 20
): Promise<FilterOption[]> {
  try {
    const fieldMap = {
      area: 'area_of_delivery',
      awardee: 'awardee_name',
      business_categories: 'business_category',
      organizations: 'organization_name',
    }

    const index = filterIndices[filterType]
    const field = fieldMap[filterType]

    // Use empty string for query to get initial results
    const result = await index.search(query || '', {
      limit,
      attributesToRetrieve: [field],
    })

    return result.hits.map((hit: any) => ({
      value: hit[field],
      label: hit[field],
    }))
  } catch (error) {
    console.error(`Error searching ${filterType}:`, error)
    return []
  }
}

// Budget-specific search interfaces
export interface BudgetSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
}

export interface BudgetSearchResult {
  hits: BudgetDocument[];
  estimatedTotalHits: number;
  processingTimeMs: number;
  query: string;
}

export async function searchBudgetDocuments(options: BudgetSearchOptions): Promise<BudgetSearchResult> {
  try {
    const result = await budgetIndex.search(options.query, {
      limit: options.limit || 10,
      offset: options.offset || 0,
      filter: options.filter,
      sort: options.sort,
      attributesToHighlight: ['*'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    })

    return {
      hits: result.hits as unknown as BudgetDocument[],
      estimatedTotalHits: result.estimatedTotalHits,
      processingTimeMs: result.processingTimeMs,
      query: result.query,
    }
  } catch (error) {
    console.error('Budget search error:', error)
    throw new Error('Failed to search budget documents')
  }
}

export async function searchBudgetFilterOptions(
  field: string,
  query: string,
  limit: number = 20
): Promise<FilterOption[]> {
  try {
    const result = await budgetIndex.search(query || '', {
      limit,
      attributesToRetrieve: [field],
      facets: [field],
    })

    // Deduplicate results based on field value
    const uniqueValues = new Set<string>()
    const options: FilterOption[] = []

    result.hits.forEach((hit: any) => {
      const value = hit[field]
      if (value && !uniqueValues.has(value)) {
        uniqueValues.add(value)
        options.push({
          value,
          label: value,
        })
      }
    })

    return options
  } catch (error) {
    console.error(`Error searching budget ${field}:`, error)
    return []
  }
}