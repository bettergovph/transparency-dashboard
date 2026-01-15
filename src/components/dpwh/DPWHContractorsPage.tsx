import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { Button } from '@/components/ui/button'
import type { DPWHAggregateResponse, DPWHContractorAggregate } from '@/types/dpwh'

const DPWHContractorsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [contractors, setContractors] = useState<DPWHContractorAggregate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'budget' | 'count'>('budget')
  const [isLoading, setIsLoading] = useState(true)
  const [metadata, setMetadata] = useState<any>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [resultsPerPage, setResultsPerPage] = useState(20)

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q')
    const urlSort = searchParams.get('sort')
    const urlPage = searchParams.get('page')
    const urlLimit = searchParams.get('limit')

    if (urlQuery) setSearchQuery(urlQuery)
    if (urlSort === 'budget' || urlSort === 'count') setSortBy(urlSort)
    if (urlPage) setCurrentPage(parseInt(urlPage, 10))
    if (urlLimit) setResultsPerPage(parseInt(urlLimit, 10))
  }, [])

  // Update URL when params change
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (searchQuery) params.set('q', searchQuery)
    if (sortBy !== 'budget') params.set('sort', sortBy)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (resultsPerPage !== 20) params.set('limit', resultsPerPage.toString())

    setSearchParams(params, { replace: true })
  }, [searchQuery, sortBy, currentPage, resultsPerPage])

  useEffect(() => {
    loadContractors()
  }, [])

  const loadContractors = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/data/dpwh/aggregates/contractors.json')
      const data: DPWHAggregateResponse<DPWHContractorAggregate> = await response.json()
      setContractors(data.data)
      setMetadata(data.metadata)
    } catch (error) {
      console.error('Error loading contractors:', error)
    } finally {
      setIsLoading(false)
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-PH').format(num)
  }

  // Filter and sort contractors
  const filteredContractors = contractors
    .filter(con =>
      searchQuery === '' ||
      con.contractor.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'budget') {
        return b.total_budget - a.total_budget
      }
      return b.project_count - a.project_count
    })

  // Pagination calculations
  const totalPages = Math.ceil(filteredContractors.length / resultsPerPage)
  const startIndex = (currentPage - 1) * resultsPerPage
  const endIndex = startIndex + resultsPerPage
  const paginatedContractors = filteredContractors.slice(startIndex, endIndex)

  // Reset to page 1 when search/sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, resultsPerPage])

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>DPWH Contractors - Transparency Dashboard</title>
        <meta name="description" content="Browse DPWH infrastructure contractors. View project counts, budgets, and contractor statistics." />
        <meta name="keywords" content="DPWH, infrastructure, contractors, Philippines" />
      </Helmet>
      <Navigation />

      <div className="max-w-7xl w-auto md:min-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">DPWH Contractors</h1>
          </div>
          <p className="text-gray-600">
            {metadata ? `${formatNumber(metadata.total_items)} contractors · ${formatNumber(metadata.total_projects)} total projects · ${formatCurrency(metadata.total_budget)} total budget` : 'Loading...'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contractors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        {/* Sort Options */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortBy('budget')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${sortBy === 'budget'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                By Total Budget
              </button>
              <button
                onClick={() => setSortBy('count')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${sortBy === 'count'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                By Project Count
              </button>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={resultsPerPage}
                onChange={(e) => setResultsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredContractors.length)} of {formatNumber(filteredContractors.length)}
              </p>
            </div>
          </div>

          {/* Contractors Table */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Loading contractors...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedContractors.map((contractor) => (
                  <tr key={contractor.contractor} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/dpwh/contractors/${encodeURIComponent(contractor.contractor)}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {contractor.contractor}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatNumber(contractor.project_count)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(contractor.total_budget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {formatCurrency(contractor.avg_budget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {contractor.avg_progress.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex sm:hidden items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
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
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default DPWHContractorsPage
