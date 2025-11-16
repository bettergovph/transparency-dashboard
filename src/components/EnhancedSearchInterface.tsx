import React, { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Calendar, Building, MapPin, DollarSign, Award, FileText, Users, TrendingUp, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, HelpCircle, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Autocomplete } from '@/components/ui/autocomplete'
import type { AutocompleteOption } from '@/components/ui/autocomplete'
import { searchDocuments, searchFilterOptions } from '@/lib/meilisearch'
import type { SearchDocument } from '@/types/search'
import SearchGuide from './SearchGuide'

const EnhancedSearchInterface: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'relevance'>('relevance')
  const [resultsPerPage, setResultsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [tableSortField, setTableSortField] = useState<keyof SearchDocument | null>(null)
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [strictMatch, setStrictMatch] = useState(false)
  const [showSearchGuide, setShowSearchGuide] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{ query: string; filter?: string; sort?: string[]; limit?: number } | null>(null)
  
  // Autocomplete filter states - now arrays for multi-select
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedAwardees, setSelectedAwardees] = useState<string[]>([])
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([])
  
  // Autocomplete options states
  const [areaOptions, setAreaOptions] = useState<AutocompleteOption[]>([])
  const [awardeeOptions, setAwardeeOptions] = useState<AutocompleteOption[]>([])
  const [organizationOptions, setOrganizationOptions] = useState<AutocompleteOption[]>([])
  
  // Autocomplete loading states
  const [areaLoading, setAreaLoading] = useState(false)
  const [awardeeLoading, setAwardeeLoading] = useState(false)
  const [organizationLoading, setOrganizationLoading] = useState(false)

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
  }, [query, selectedCategory, sortBy, strictMatch, selectedAreas, selectedAwardees, selectedOrganizations])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, selectedCategory, sortBy, resultsPerPage])

  // Memoized autocomplete search handlers
  const handleAreaSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setAreaOptions([])
      return
    }
    setAreaLoading(true)
    try {
      const options = await searchFilterOptions('area', query)
      setAreaOptions(options)
    } finally {
      setAreaLoading(false)
    }
  }, [])

  const handleAwardeeSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setAwardeeOptions([])
      return
    }
    setAwardeeLoading(true)
    try {
      const options = await searchFilterOptions('awardee', query)
      setAwardeeOptions(options)
    } finally {
      setAwardeeLoading(false)
    }
  }, [])

  const handleOrganizationSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setOrganizationOptions([])
      return
    }
    setOrganizationLoading(true)
    try {
      const options = await searchFilterOptions('organizations', query)
      setOrganizationOptions(options)
    } finally {
      setOrganizationLoading(false)
    }
  }, [])

  const performSearch = async () => {
    setLoading(true)
    
    // Parse the query to extract field-specific searches and build filters
    const { searchQuery, filters } = parseSearchQuery(query, strictMatch, selectedCategory)
    
    const sortParam = sortBy === 'date' ? ['award_date:desc'] : sortBy === 'amount' ? ['contract_amount:desc'] : undefined
    
    // Set debug info BEFORE the search (so it persists even on error)
    setDebugInfo({ 
      query: searchQuery, 
      filter: filters,
      sort: sortParam,
      limit: 1000
    })
    
    try {
      const searchResults = await searchDocuments({
        query: searchQuery,
        filter: filters,
        sort: sortParam,
        limit: 1000 // Fetch more results for client-side pagination
      })
      
      // Deduplicate results before setting state
      const deduplicatedResults = deduplicateResults(searchResults.hits)
      setResults(deduplicatedResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      // Don't clear debugInfo on error - keep it visible for debugging
    } finally {
      setLoading(false)
    }
  }

  // Parse search query and convert to MeiliSearch format
  const parseSearchQuery = (inputQuery: string, isStrict: boolean, category: string) => {
    let searchQuery = inputQuery.trim()
    const filterParts: string[] = []

    // Add category filter if selected
    if (category !== 'all') {
      filterParts.push(`business_category = "${category}"`)
    }
    
    // Add autocomplete filters with OR logic for multiple selections
    if (selectedAreas.length > 0) {
      const areaFilters = selectedAreas.map(area => `area_of_delivery = "${area}"`).join(' OR ')
      filterParts.push(`(${areaFilters})`)
    }
    if (selectedAwardees.length > 0) {
      const awardeeFilters = selectedAwardees.map(awardee => `awardee_name = "${awardee}"`).join(' OR ')
      filterParts.push(`(${awardeeFilters})`)
    }
    if (selectedOrganizations.length > 0) {
      const orgFilters = selectedOrganizations.map(org => `organization_name = "${org}"`).join(' OR ')
      filterParts.push(`(${orgFilters})`)
    }

    // Extract field-specific searches (e.g., awardee:"ABC Corp")
    const fieldPatterns = [
      { pattern: /awardee:(?:"([^"]+)"|([^\s]+))/gi, field: 'awardee_name' },
      { pattern: /organization:(?:"([^"]+)"|([^\s]+))/gi, field: 'organization_name' },
      { pattern: /contract:(?:"([^"]+)"|([^\s]+))/gi, field: 'contract_no' },
      { pattern: /reference:(?:"([^"]+)"|([^\s]+))/gi, field: 'reference_id' },
      { pattern: /title:(?:"([^"]+)"|([^\s]+))/gi, field: 'award_title' },
      { pattern: /category:(?:"([^"]+)"|([^\s]+))/gi, field: 'business_category' },
      { pattern: /status:(?:"([^"]+)"|([^\s]+))/gi, field: 'award_status' },
    ]

    fieldPatterns.forEach(({ pattern, field }) => {
      const matches = [...searchQuery.matchAll(pattern)]
      matches.forEach(match => {
        const value = match[1] || match[2] // quoted or unquoted value
        filterParts.push(`${field} = "${value}"`)
        // Remove the field-specific part from the search query
        searchQuery = searchQuery.replace(match[0], '').trim()
      })
    })

    // Handle AND/OR operators in remaining query
    // MeiliSearch doesn't support AND/OR in query, so we keep them in the search string
    // The search engine will find documents containing those terms
    // For proper AND/OR logic, users should use field-specific filters
    
    // Clean up the search query
    searchQuery = searchQuery.replace(/\s+/g, ' ').trim()

    // Apply strict matching if enabled and no field-specific searches
    if (isStrict && searchQuery && !searchQuery.includes('"')) {
      searchQuery = `"${searchQuery}"`
    }

    // Combine filters with AND logic
    const finalFilter = filterParts.length > 0 ? filterParts.join(' AND ') : undefined

    return { searchQuery, filters: finalFilter }
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
  
  // Apply table sorting if active
  const sortedResults = tableSortField
    ? [...results].sort((a, b) => {
        const aValue = a[tableSortField]
        const bValue = b[tableSortField]
        
        // Special handling for contract_amount to ensure numeric sorting
        if (tableSortField === 'contract_amount') {
          const aNum = parseFloat(String(aValue || 0))
          const bNum = parseFloat(String(bValue || 0))
          return tableSortDirection === 'asc' ? aNum - bNum : bNum - aNum
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return tableSortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        const aString = String(aValue || '').toLowerCase()
        const bString = String(bValue || '').toLowerCase()
        
        if (tableSortDirection === 'asc') {
          return aString.localeCompare(bString)
        } else {
          return bString.localeCompare(aString)
        }
      })
    : results
  
  const paginatedResults = sortedResults.slice(startIndex, endIndex)
  
  const totalContractAmount = results.reduce((sum, doc) => {
    const amount = parseFloat(String(doc.contract_amount || 0))
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTableSort = (field: keyof SearchDocument) => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setTableSortField(field)
      setTableSortDirection('asc')
    }
  }

  const getSortIcon = (field: keyof SearchDocument) => {
    if (tableSortField !== field) return null
    return tableSortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  const handleSearchByValue = (value: string) => {
    setQuery(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const downloadCSV = () => {
    // Prepare CSV headers
    const headers = [
      'Reference ID',
      'Contract No',
      'Award Title',
      'Awardee',
      'Organization',
      'Contract Amount',
      'Award Date',
      'Status',
      'Business Category',
      'Area of Delivery',
      'Notice Title'
    ]

    // Prepare CSV rows
    const rows = results.map(doc => [
      doc.reference_id,
      doc.contract_no,
      `"${doc.award_title.replace(/"/g, '""')}"`, // Escape quotes
      `"${doc.awardee_name.replace(/"/g, '""')}"`,
      `"${doc.organization_name.replace(/"/g, '""')}"`,
      doc.contract_amount,
      doc.award_date,
      doc.award_status,
      doc.business_category,
      doc.area_of_delivery,
      doc.notice_title ? `"${doc.notice_title.replace(/"/g, '""')}"` : ''
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `philgeps-search-results-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    <div className="max-w-screen min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex justify-between mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://bettergov.ph/logos/svg/BetterGov_Icon-Primary.svg" 
              alt="BetterGov.ph Logo" 
              className="h-8 w-8"
            />
            <h1 className="text-xl font-bold text-black font-figtree">
              Philgeps Browser by BetterGov.ph
            </h1>
          </div>
                      <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearchGuide(!showSearchGuide)}
              className="text-blue-600 hover:text-blue-800"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              How to search
            </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex">
        {/* Main Content Column */}
        <div className={`transition-all duration-300 px-4 sm:px-6 lg:px-8 py-8 ${showSearchGuide ? 'w-3/4' : 'flex-1 mx-auto'}`}>
        {/* Search and Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search by reference ID, contract number, company name, or any keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="!pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-black focus:ring-black"
              style={{ paddingLeft: '3rem' }}
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

          {/* Strict Match Checkbox */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="strictMatch"
                  checked={strictMatch}
                  onChange={(e) => setStrictMatch(e.target.checked)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2 cursor-pointer"
                />
                <label htmlFor="strictMatch" className="ml-2 text-sm text-gray-700 cursor-pointer">
                  Strict matching (exact phrase search)
                </label>
              </div>
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

          </div>

          {/* Debug Info */}
          {debugInfo  && (
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono mb-6 text-white">
              <div className="font-semibold text-green-400 mb-3">MeiliSearch Request:</div>
              <div className="bg-gray-800 p-3 rounded overflow-x-auto">
                <pre className="text-gray-300">{JSON.stringify({
                  query: debugInfo.query,
                  filter: debugInfo.filter,
                  sort: debugInfo.sort,
                  limit: debugInfo.limit
                }, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Area of Delivery Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Area of Delivery
                  </label>
                  <Autocomplete
                    options={areaOptions}
                    selectedValues={selectedAreas}
                    onChange={setSelectedAreas}
                    onSearchChange={handleAreaSearch}
                    placeholder="Type to search areas..."
                    loading={areaLoading}
                  />
                </div>

                {/* Awardee Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    <Users className="inline h-4 w-4 mr-1" />
                    Awardee
                  </label>
                  <Autocomplete
                    options={awardeeOptions}
                    selectedValues={selectedAwardees}
                    onChange={setSelectedAwardees}
                    onSearchChange={handleAwardeeSearch}
                    placeholder="Type to search awardees..."
                    loading={awardeeLoading}
                  />
                </div>

                {/* Organization Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    <Building className="inline h-4 w-4 mr-1" />
                    Organization
                  </label>
                  <Autocomplete
                    options={organizationOptions}
                    selectedValues={selectedOrganizations}
                    onChange={setSelectedOrganizations}
                    onSearchChange={handleOrganizationSearch}
                    placeholder="Type to search organizations..."
                    loading={organizationLoading}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Category:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Categories</option>
                    {categories.slice(1).map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Award Date</option>
                    <option value="amount">Contract Amount</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(selectedAreas.length > 0 || selectedAwardees.length > 0 || selectedOrganizations.length > 0 || selectedCategory !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAreas([])
                      setSelectedAwardees([])
                      setSelectedOrganizations([])
                      setSelectedCategory('all')
                    }}
                    className="text-red-600 hover:text-red-800 border-red-600 hover:border-red-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Section */}
        {query && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <FileText className="h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-sm font-medium text-blue-600">Results Found</p>
                  <p className="text-2xl font-bold text-blue-900">{results.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(totalContractAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <p className="text-sm font-medium text-purple-600">Unique Organizations</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {new Set(results.map(r => r.organization_name)).size}
                  </p>
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
                Search Results for "{query}"
              </h2>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCSV}
                  className="text-green-600 hover:text-green-800 border-green-600 hover:border-green-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
                <p className="text-gray-600">
                  {results.length} contracts found • Showing {startIndex + 1}-{Math.min(endIndex, results.length)}
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('reference_id')}
                        >
                          Reference ID{getSortIcon('reference_id')}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('contract_no')}
                        >
                          Contract No{getSortIcon('contract_no')}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('award_title')}
                        >
                          Award Title{getSortIcon('award_title')}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('awardee_name')}
                        >
                          Awardee{getSortIcon('awardee_name')}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('organization_name')}
                        >
                          Organization{getSortIcon('organization_name')}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('contract_amount')}
                        >
                          Amount{getSortIcon('contract_amount')}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('award_date')}
                        >
                          Date{getSortIcon('award_date')}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTableSort('award_status')}
                        >
                          Status{getSortIcon('award_status')}
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
                            <button
                              onClick={() => handleSearchByValue(doc.awardee_name)}
                              className="truncate text-blue-600 hover:text-blue-800 underline text-left transition-colors cursor-pointer w-full"
                              title={doc.awardee_name}
                            >
                              {doc.awardee_name}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <button
                              onClick={() => handleSearchByValue(doc.organization_name)}
                              className="truncate text-blue-600 hover:text-blue-800 underline text-left transition-colors cursor-pointer w-full"
                              title={doc.organization_name}
                            >
                              {doc.organization_name}
                            </button>
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
                  Search through thousands of government procurement records. Find awarded contracts and procurement information by reference ID, company name, 
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

        {/* Search Guide Column */}
        {showSearchGuide && (
          <div className="w-1/4 flex-shrink-0">
            <SearchGuide isOpen={showSearchGuide} onClose={() => setShowSearchGuide(false)} />
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedSearchInterface