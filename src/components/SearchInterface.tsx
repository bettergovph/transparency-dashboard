import React, { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { searchDocuments } from '@/lib/meilisearch'
import type { SearchDocument } from '@/types/search'

const SearchInterface: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)



  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        performSearch()
      } else {
        setResults([])
        setSearchResult(null)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const performSearch = async () => {
    setLoading(true)
    try {
      const result = await searchDocuments({
        query: query,
        limit: 20,
      })
      setResults(result.hits)
      setSearchResult(result)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
      setSearchResult(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 font-figtree">
            PHILGEPS Search
          </h1>
          <p className="text-gray-600 font-figtree">
            Search through government procurement records
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by reference ID, contract number, award title, organization, or any field..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {searchResult && (
          <div className="mb-4 text-sm text-gray-600">
            Found {searchResult.estimatedTotalHits.toLocaleString()} results 
            ({searchResult.processingTimeMs}ms)
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <p className="mt-2 text-gray-600">Searching...</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid gap-4">
            {results.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 font-figtree">
                        {doc.award_title || doc.notice_title}
                      </CardTitle>
                      <CardDescription>
                        Reference ID: {doc.reference_id} | Contract No: {doc.contract_no}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-black font-figtree">
                        {formatCurrency(doc.contract_amount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(doc.award_date)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-gray-700">Awardee:</div>
                      <div className="text-black">{doc.awardee_name}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Organization:</div>
                      <div className="text-black">{doc.organization_name}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Area of Delivery:</div>
                      <div className="text-black">{doc.area_of_delivery}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Business Category:</div>
                      <div className="text-black">{doc.business_category}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      doc.award_status === 'Awarded' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {doc.award_status}
                    </div>
                    {doc.notice_title && doc.notice_title !== doc.award_title && (
                      <div className="text-sm text-gray-600 italic">
                        Notice: {doc.notice_title}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No results found</div>
            <div className="text-gray-400">Try adjusting your search terms</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchInterface