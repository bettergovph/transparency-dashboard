import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import BudgetHeader from './BudgetHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatGAAAmount } from '@/lib/formatGAAAmount'
import { searchBudgetDocuments } from '@/lib/meilisearch'
import { toSlug } from '@/lib/utils'
import type { BudgetDocument } from '@/types/budget'

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<BudgetDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears] = useState<number[]>([2025, 2024, 2023, 2022, 2021, 2020])
  const [showFilters, setShowFilters] = useState(false)
  const [totalHits, setTotalHits] = useState(0)
  const [searchTime, setSearchTime] = useState(0)

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    if (searchQuery) {
      performSearch()
    } else {
      setResults([])
      setTotalHits(0)
    }
  }, [searchQuery, selectedYear, departmentFilter, agencyFilter, minAmount, maxAmount, currentPage])

  const performSearch = async () => {
    setLoading(true)

    try {
      // Build filter string
      const filters: string[] = [`year = ${selectedYear}`]

      if (departmentFilter) {
        filters.push(`uacs_dpt_dsc = "${departmentFilter}"`)
      }

      if (agencyFilter) {
        filters.push(`uacs_agy_dsc = "${agencyFilter}"`)
      }

      if (minAmount) {
        filters.push(`amt >= ${parseFloat(minAmount)}`)
      }

      if (maxAmount) {
        filters.push(`amt <= ${parseFloat(maxAmount)}`)
      }

      const filterString = filters.join(' AND ')

      const searchResults = await searchBudgetDocuments({
        query: searchQuery,
        filter: filterString,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort: ['amt:desc']
      })

      setResults(searchResults.hits)
      setTotalHits(searchResults.estimatedTotalHits)
      setSearchTime(searchResults.processingTimeMs)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setTotalHits(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    performSearch()
  }

  const clearFilters = () => {
    setDepartmentFilter('')
    setAgencyFilter('')
    setMinAmount('')
    setMaxAmount('')
    setCurrentPage(1)
  }

  const downloadCSV = () => {
    const csvContent = [
      'Year,ID,Department,Agency,Description,Amount,Operating Unit,Fund Sub-Category,Expense,Object',
      ...results.map(doc =>
        `${doc.year},"${doc.id}","${doc.uacs_dpt_dsc}","${doc.uacs_agy_dsc}","${doc.dsc}",${doc.amt},"${doc.uacs_oper_dsc}","${doc.uacs_fundsubcat_dsc}","${doc.uacs_exp_dsc}","${doc.uacs_sobj_dsc}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `GAA_Search_Results_${selectedYear}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.ceil(totalHits / itemsPerPage)
  const hasActiveFilters = departmentFilter || agencyFilter || minAmount || maxAmount

  return (
    <>
      <Helmet>
        <title>Search - GAA Budget Browser</title>
        <meta name="description" content="Search Philippine government budget allocations from the General Appropriations Act (GAA)." />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Sticky Header */}
        <BudgetHeader
          title="Search"
          subtitle="Search budget allocations"
          icon={<Search className="h-5 w-5 md:h-6 md:w-6 text-white" />}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          showSearch={false}
        />

        {/* Content Area */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-[1800px] mx-auto">
            {/* Search Box */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Search GAA Budget Allocations
                </CardTitle>
                <CardDescription>
                  Search across {selectedYear} budget line items by description, department, agency, or amount
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  {/* Main Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by description, department, agency, object, expense..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* Filter Toggle */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <Filter className="h-4 w-4" />
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                      {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {hasActiveFilters && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                          Active
                        </span>
                      )}
                    </button>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <Input
                          type="text"
                          placeholder="Filter by department..."
                          value={departmentFilter}
                          onChange={(e) => setDepartmentFilter(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Agency
                        </label>
                        <Input
                          type="text"
                          placeholder="Filter by agency..."
                          value={agencyFilter}
                          onChange={(e) => setAgencyFilter(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Amount (in thousands)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 1000"
                          value={minAmount}
                          onChange={(e) => setMinAmount(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Amount (in thousands)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 1000000"
                          value={maxAmount}
                          onChange={(e) => setMaxAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Results Summary */}
            {searchQuery && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {loading ? (
                    'Searching...'
                  ) : (
                    <>
                      Found <span className="font-semibold text-gray-900">{totalHits.toLocaleString()}</span> results
                      {searchTime > 0 && ` in ${searchTime}ms`}
                      {currentPage > 1 && ` (page ${currentPage} of ${totalPages})`}
                    </>
                  )}
                </div>

                {results.length > 0 && (
                  <button
                    onClick={downloadCSV}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </button>
                )}
              </div>
            )}

            {/* Results */}
            {loading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Searching budget allocations...</p>
                </CardContent>
              </Card>
            ) : results.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Department
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Agency
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-xs font-mono text-gray-500">{doc.id}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="max-w-md">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                    {doc.dsc}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {doc.uacs_sobj_dsc && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                        {doc.uacs_sobj_dsc}
                                      </span>
                                    )}
                                    {doc.uacs_exp_dsc && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                        {doc.uacs_exp_dsc}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {doc.uacs_dpt_dsc && (
                                  <Link
                                    to={`/budget/departments/${toSlug(doc.uacs_dpt_dsc)}`}
                                    state={{ departmentId: doc.uacs_dpt_dsc, departmentName: doc.uacs_dpt_dsc }}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline line-clamp-2 max-w-xs block"
                                  >
                                    {doc.uacs_dpt_dsc}
                                  </Link>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {doc.uacs_agy_dsc && (
                                  <Link
                                    to={`/budget/departments/${toSlug(doc.uacs_dpt_dsc || '')}/agencies/${toSlug(doc.uacs_agy_dsc)}`}
                                    state={{
                                      agencyId: doc.uacs_agy_dsc,
                                      agencyName: doc.uacs_agy_dsc,
                                      departmentId: doc.uacs_dpt_dsc,
                                      departmentName: doc.uacs_dpt_dsc
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline line-clamp-2 max-w-xs block"
                                  >
                                    {doc.uacs_agy_dsc}
                                  </Link>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-blue-600">
                                  {doc.amt != null && !isNaN(doc.amt) ? formatGAAAmount(doc.amt) : 'N/A'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {results.map((doc) => (
                    <Card key={doc.id} className="border-l-4 border-l-blue-600">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2">
                              {doc.dsc}
                            </h3>
                            <p className="text-xs font-mono text-gray-500">ID: {doc.id}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-blue-600">
                              {doc.amt != null && !isNaN(doc.amt) ? formatGAAAmount(doc.amt) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Department</p>
                            {doc.uacs_dpt_dsc ? (
                              <Link
                                to={`/budget/departments/${toSlug(doc.uacs_dpt_dsc)}`}
                                state={{ departmentId: doc.uacs_dpt_dsc, departmentName: doc.uacs_dpt_dsc }}
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {doc.uacs_dpt_dsc}
                              </Link>
                            ) : (
                              <p className="text-sm text-gray-400">N/A</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Agency</p>
                            {doc.uacs_agy_dsc ? (
                              <Link
                                to={`/budget/departments/${toSlug(doc.uacs_dpt_dsc || '')}/agencies/${toSlug(doc.uacs_agy_dsc)}`}
                                state={{
                                  agencyId: doc.uacs_agy_dsc,
                                  agencyName: doc.uacs_agy_dsc,
                                  departmentId: doc.uacs_dpt_dsc,
                                  departmentName: doc.uacs_dpt_dsc
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {doc.uacs_agy_dsc}
                              </Link>
                            ) : (
                              <p className="text-sm text-gray-400">N/A</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {doc.uacs_sobj_dsc && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {doc.uacs_sobj_dsc}
                              </span>
                            )}
                            {doc.uacs_exp_dsc && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                {doc.uacs_exp_dsc}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm ${currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : searchQuery ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4 mt-8" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Start searching</h3>
                  <p className="text-gray-600">
                    Enter a search term above to find budget allocations
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default SearchPage
