import React, { useState, useEffect } from 'react'
import { Search, Filter, Calendar, Building, MapPin, DollarSign, Award, FileText, Users, TrendingUp, LayoutGrid, LayoutList, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { searchDocuments } from '@/lib/meilisearch'
import type { SearchDocument } from '@/types/search'

const EnhancedSearchInterface: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'relevance'>('relevance')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [resultsPerPage, setResultsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  const categories = [
    { value: 'all', label: 'All Categories', icon: FileText },
    { value: 'Construction', label: 'Construction', icon: Building },
    { value: 'Information Technology', label: 'IT & Technology', icon: TrendingUp },
    { value: 'Medical Equipment', label: 'Medical Equipment', icon: Award },
    { value: 'Office Supplies', label: 'Office Supplies', icon: FileText },
    { value: 'Automotive', label: 'Automotive', icon: MapPin },
  ]

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        performSearch()
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query, selectedCategory, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, selectedCategory, sortBy, resultsPerPage])

  const performSearch = async () => {
    setLoading(true)
    
    try {
      const searchResults = await searchDocuments({
        query: query,
        filter: selectedCategory !== 'all' ? `business_category = "${selectedCategory}"` : undefined,
        sort: sortBy === 'date' ? ['award_date:desc'] : sortBy === 'amount' ? ['contract_amount:desc'] : undefined,
        limit: 1000 // Fetch more results for client-side pagination
      })
      
      // Deduplicate results before setting state
      const deduplicatedResults = deduplicateResults(searchResults.hits)
      setResults(deduplicatedResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Deduplicate results based on contract_amount, awardee_name, award_title, and contract_no
  const deduplicateResults = (results: SearchDocument[]): SearchDocument[] => {
    const seen = new Map<string, SearchDocument>()
    
    results.forEach(doc => {
      // Create a unique key based on the duplicate conditions
      const key = `${doc.contract_amount}_${doc.awardee_name}_${doc.award_title}_${doc.contract_no}`.toLowerCase()
      
      // Keep the first occurrence of each unique combination
      if (!seen.has(key)) {
        seen.set(key, doc)
      }
    })
    
    return Array.from(seen.values())
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'awarded':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(results.length / resultsPerPage)
  const startIndex = (currentPage - 1) * resultsPerPage
  const endIndex = startIndex + resultsPerPage
  const paginatedResults = results.slice(startIndex, endIndex)
  
  const totalContractAmount = results.reduce((sum, doc) => sum + doc.contract_amount, 0)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-black mb-4 font-figtree">
              {import.meta.env.VITE_APP_NAME || 'PHILGEPS Search'}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-figtree">
              {import.meta.env.VITE_APP_DESCRIPTION || 'Discover government procurement opportunities and awarded contracts'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search by reference ID, contract number, company name, or any keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-black focus:ring-black"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="hover:bg-gray-100 rounded-lg"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Results per page:</label>
                <select
                  value={resultsPerPage}
                  onChange={(e) => setResultsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Card View
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="h-4 w-4 mr-2" />
                Table View
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => {
                      const Icon = category.icon
                      return (
                        <Button
                          key={category.value}
                          variant={selectedCategory === category.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(category.value)}
                          className="justify-start"
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {category.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'relevance', label: 'Relevance' },
                      { value: 'date', label: 'Award Date' },
                      { value: 'amount', label: 'Contract Amount' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={sortBy === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortBy(option.value as any)}
                        className="w-full justify-start"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Section */}
        {query && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-blue-600">Results Found</p>
                    <p className="text-2xl font-bold text-blue-900">{results.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Value</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(totalContractAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-purple-600">Unique Organizations</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {new Set(results.map(r => r.organization_name)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
            <p className="text-gray-600 text-lg">Searching through procurement records...</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">
                Search Results
              </h2>
              <p className="text-gray-600">
                {results.length} contracts found • Showing {startIndex + 1}-{Math.min(endIndex, results.length)}
              </p>
            </div>
            
            {viewMode === 'card' ? (
              <div className="grid gap-6">
                {paginatedResults.map((doc) => (
                <Card key={doc.id} className="hover:shadow-xl transition-all duration-300 border-gray-200">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2 text-black font-figtree">
                          {doc.award_title}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600">
                          <div className="flex flex-wrap gap-4 mt-2">
                            <span className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {doc.reference_id}
                            </span>
                            <span className="flex items-center">
                              <Building className="h-4 w-4 mr-1" />
                              {doc.contract_no}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(doc.award_date)}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="text-right ml-6">
                        <div className="text-3xl font-bold text-black font-figtree">
                          {formatCurrency(doc.contract_amount)}
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(doc.award_status)}`}>
                          {doc.award_status}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                            <Users className="h-4 w-4 mr-2" />
                            Awardee
                          </h4>
                          <p className="text-black font-medium">{doc.awardee_name}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                            <Building className="h-4 w-4 mr-2" />
                            Procuring Entity
                          </h4>
                          <p className="text-black">{doc.organization_name}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                            <MapPin className="h-4 w-4 mr-2" />
                            Delivery Location
                          </h4>
                          <p className="text-black">{doc.area_of_delivery}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                            <FileText className="h-4 w-4 mr-2" />
                            Business Category
                          </h4>
                          <p className="text-black">{doc.business_category}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {doc.notice_title && doc.notice_title !== doc.award_title && (
                          <div>
                            <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                              <FileText className="h-4 w-4 mr-2" />
                              Notice Title
                            </h4>
                            <p className="text-black text-sm italic">{doc.notice_title}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contract No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Award Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Awardee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organization
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedResults.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {doc.reference_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doc.contract_no}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                            <div className="truncate" title={doc.award_title}>
                              {doc.award_title}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate" title={doc.awardee_name}>
                              {doc.awardee_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate" title={doc.organization_name}>
                              {doc.organization_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(doc.contract_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(doc.award_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.award_status)}`}>
                              {doc.award_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, results.length)}</span> of{' '}
                      <span className="font-medium">{results.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-r-none"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                          >
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(page as number)}
                            className="rounded-none"
                          >
                            {page}
                          </Button>
                        )
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="rounded-l-none"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!loading && query && results.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setQuery('')
                  setSelectedCategory('all')
                }}
              >
                Clear Search
              </Button>
            </div>
          </div>
        )}

        {/* Welcome State */}
        {!query && (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
                <FileText className="h-16 w-16 text-blue-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to PHILGEPS Search
                </h3>
                <p className="text-gray-600 mb-6">
                  Search through thousands of government procurement records. Find awarded contracts, 
                  bidding opportunities, and procurement information by reference ID, company name, 
                  or any keyword.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-4">
                    <Search className="h-6 w-6 text-blue-600 mb-2 mx-auto" />
                    <p className="font-medium">Smart Search</p>
                    <p className="text-gray-600">Find records across all fields</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <Filter className="h-6 w-6 text-green-600 mb-2 mx-auto" />
                    <p className="font-medium">Advanced Filters</p>
                    <p className="text-gray-600">Filter by category and date</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <TrendingUp className="h-6 w-6 text-purple-600 mb-2 mx-auto" />
                    <p className="font-medium">Real-time Results</p>
                    <p className="text-gray-600">Instant search with analytics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedSearchInterface