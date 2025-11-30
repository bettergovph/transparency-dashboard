import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search } from 'lucide-react'
import Navigation from './Navigation'
import Footer from './Footer'
import { filterIndices } from '@/lib/meilisearch'
import { toSlug } from '@/lib/utils'

const ContractorsPage = () => {
  const [contractors, setContractors] = useState<Array<{ name: string; count: number; total: number; startDate?: string; endDate?: string }>>([])
  const [selectedLetter, setSelectedLetter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [sortBy, setSortBy] = useState<'total' | 'count'>('total')
  const [isLoading, setIsLoading] = useState(true)

  const alphabet = ['0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

  useEffect(() => {
    loadContractors(selectedLetter, searchQuery)
  }, [selectedLetter, searchQuery, sortBy])

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 'N/A'

    try {
      const start = new Date(startDate)
      const end = new Date(endDate)

      // If year is below 2000, use 2000
      const startYear = start.getFullYear() < 2000 ? 2000 : start.getFullYear()
      const endYear = end.getFullYear() < 2000 ? 2000 : end.getFullYear()

      const startMonth = start.getMonth() + 1 // 0-indexed
      const endMonth = end.getMonth() + 1

      return `${startMonth}/${startYear}-${endMonth}/${endYear}`
    } catch {
      return 'N/A'
    }
  }

  const loadContractors = async (letter: string, search: string) => {
    setIsLoading(true)
    try {
      const index = filterIndices.awardee

      // Use search query if provided, otherwise get all
      const searchQuery = search || (letter || '')

      const result = await index.search(searchQuery, {
        limit: 10000,
        attributesToRetrieve: ['awardee_name', 'count', 'total', 'start_date', 'end_date'],
        sort: [sortBy === 'total' ? 'total:desc' : 'count:desc'],
      })

      // Get total count from first load
      if (!totalCount) {
        setTotalCount(result.estimatedTotalHits)
      }

      // Map results directly from precomputed values
      let contractorList = result.hits
        .map((hit: any) => ({
          name: hit.awardee_name,
          count: hit.count || 0,
          total: hit.total || 0,
          startDate: hit.start_date,
          endDate: hit.end_date
        }))
        .filter(contractor => contractor.name) // Filter out items without names

      // Apply letter filter if needed
      if (letter && !search) {
        contractorList = contractorList.filter(contractor => {
          if (letter === '0-9') {
            return !/^[A-Za-z]/.test(contractor.name)
          }
          return contractor.name.toUpperCase().startsWith(letter)
        })
      }

      // Note: Results are already sorted by MeiliSearch using the sort parameter
      // If no letter filter and no search, show top 100
      if (!letter && !search) {
        contractorList = contractorList.slice(0, 100)
      }

      setContractors(contractorList)
    } catch (error) {
      console.error('Error loading contractors:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Contractors Directory - PhilGEPS Contract Browser</title>
        <meta name="description" content={`Browse ${totalCount.toLocaleString()} government contractors and awardees. View contract counts and search by name or letter.`} />
        <meta name="keywords" content="PhilGEPS contractors, government suppliers, awardees, Philippines procurement, contractor directory" />
        <meta property="og:title" content="Contractors Directory - PhilGEPS" />
        <meta property="og:description" content="Browse government contractors and awardees" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://philgeps.bettergov.ph/contractors" />
      </Helmet>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contractors Directory</h1>
          <p className="text-gray-600">
            Browse {totalCount.toLocaleString()} contractors
            {!selectedLetter && !searchQuery && ' - Showing Top 100 by Contract Count'}
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

        {/* A-Z Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Filter by Letter</h3>
          <div className="flex flex-wrap gap-2">
            {alphabet.map((letter) => (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${selectedLetter === letter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {letter}
              </button>
            ))}
          </div>
          {selectedLetter && (
            <button
              onClick={() => setSelectedLetter('')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filter - Show Top 100
            </button>
          )}
        </div>

        {/* Directory Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Data Disclaimer */}
          <div className="bg-yellow-50 border-b border-yellow-200 px-3 sm:px-6 py-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Data totals include possible duplicates. See each detail page for more information.
            </p>
          </div>

          <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Tab-like Sort Options */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setSortBy('total')}
                className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${sortBy === 'total'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
              >
                By Total Amount
              </button>
              <button
                onClick={() => setSortBy('count')}
                className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${sortBy === 'count'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
              >
                By Contract Count
              </button>
            </div>

            <p className="text-sm sm:text-base text-gray-600">
              {contractors.length} contractor{contractors.length !== 1 ? 's' : ''}
              {!selectedLetter && !searchQuery && ' (Top 100)'}
            </p>
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-200">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-4 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                  <div className="w-28 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : contractors.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {contractors.map((contractor, index) => (
                  <div key={contractor.name} className="px-3 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-500 shrink-0 w-8">#{index + 1}</span>
                      <Link
                        to={`/awardees/${toSlug(contractor.name)}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors flex-1 text-left"
                      >
                        {contractor.name}
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Contracts:</span>
                        <span className="ml-1 font-mono text-gray-900">{contractor.count.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">Period:</span>
                        <span className="ml-1 text-gray-600">{formatDateRange(contractor.startDate, contractor.endDate)}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-mono text-green-600 font-semibold">₱{contractor.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-20">#</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contractor Name</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-32">Contracts</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-48">Total Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-40">Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contractors.map((contractor, index) => (
                      <tr key={contractor.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-base font-mono text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/awardees/${toSlug(contractor.name)}`}
                            className="text-base text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {contractor.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right text-base font-mono text-gray-900">
                          {contractor.count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-left text-base font-mono text-green-600 font-semibold">
                          ₱{contractor.total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-left text-sm text-gray-600">
                          {formatDateRange(contractor.startDate, contractor.endDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No contractors found{searchQuery ? ` for "${searchQuery}"` : selectedLetter ? ` for letter "${selectedLetter}"` : ''}</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default ContractorsPage
