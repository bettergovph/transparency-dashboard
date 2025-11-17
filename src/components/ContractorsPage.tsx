import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search, BarChart3 } from 'lucide-react'
import Navigation from './Navigation'
import { filterIndices } from '@/lib/meilisearch'
import { toSlug } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const ContractorsPage = () => {
  const [contractors, setContractors] = useState<Array<{ name: string; count: number; total: number }>>([])
  const [loading, setLoading] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({})
  const [showChart, setShowChart] = useState(true)

  const alphabet = ['0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

  useEffect(() => {
    loadLetterCounts()
  }, [])

  useEffect(() => {
    // Reset letter selection when user starts typing
    if (searchQuery && selectedLetter !== '') {
      setSelectedLetter('')
    }
  }, [searchQuery])

  useEffect(() => {
    loadContractors(selectedLetter, searchQuery)
  }, [selectedLetter, searchQuery])

  const loadLetterCounts = async () => {
    try {
      const index = filterIndices.awardee
      const stats = await index.getStats()
      setTotalCount(stats.numberOfDocuments)

      // Load all unique names to count by letter
      const result = await index.search('', {
        limit: 10000,
        attributesToRetrieve: ['awardee_name'],
      })

      const uniqueNames = new Set<string>()
      result.hits.forEach((hit: any) => {
        if (hit.awardee_name) uniqueNames.add(hit.awardee_name)
      })

      const counts: Record<string, number> = {}
      alphabet.forEach(letter => {
        if (letter === '0-9') {
          counts[letter] = Array.from(uniqueNames).filter(name => !/^[A-Za-z]/.test(name)).length
        } else {
          counts[letter] = Array.from(uniqueNames).filter(name => name.toUpperCase().startsWith(letter)).length
        }
      })
      setLetterCounts(counts)
    } catch (error) {
      console.error('Error loading letter counts:', error)
    }
  }

  const loadContractors = async (letter: string, search: string) => {
    setLoading(true)
    try {
      const index = filterIndices.awardee

      // Use search query if provided, otherwise get all
      const searchQuery = search || (letter || '')

      const result = await index.search(searchQuery, {
        limit: 10000,
        attributesToRetrieve: ['awardee_name', 'count', 'total'],
      })

      // Map results directly from precomputed values
      let contractorList = result.hits
        .map((hit: any) => ({
          name: hit.awardee_name,
          count: hit.count || 0,
          total: hit.total || 0
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

      // If no letter filter and no search, show top 100 by total amount
      if (!letter && !search) {
        contractorList = contractorList.sort((a, b) => b.total - a.total).slice(0, 100)
      } else {
        // Otherwise sort by count, then by name
        contractorList = contractorList.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      }

      setContractors(contractorList)
    } catch (error) {
      console.error('Error loading contractors:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Chart Toggle & A-Z Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Filter by Letter</h3>
            <button
              onClick={() => setShowChart(!showChart)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              {showChart ? 'Hide' : 'Show'} Chart
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {alphabet.map((letter) => {
              const count = letterCounts[letter] || 0
              return (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  disabled={count === 0}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${selectedLetter === letter
                    ? 'bg-blue-600 text-white'
                    : count === 0
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {letter}
                </button>
              )
            })}
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

        {/* Chart */}
        {showChart && !loading && contractors.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top {Math.min(20, contractors.length)} Contractors by Contract Count
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={contractors.slice(0, 20)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={200}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'count') return [value, 'Contracts']
                    if (name === 'total') return [`₱${Number(value).toLocaleString()}`, 'Total Amount']
                    return [value, name]
                  }}
                />
                <Bar dataKey="count" name="Contracts">
                  {contractors.slice(0, 20).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${280 + index * 4}, 65%, ${48 + index}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600">Loading contractors...</p>
          </div>
        )}

        {/* Directory Grid */}
        {!loading && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Showing {contractors.length} contractor{contractors.length !== 1 ? 's' : ''}
                {!selectedLetter && !searchQuery && ' (Top 100)'}
              </p>
            </div>
            <div className="space-y-1">
              {contractors.map((contractor, index) => (
                <Link
                  key={contractor.name}
                  to={`/awardees/${toSlug(contractor.name)}`}
                  className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-500 w-8 text-right flex-shrink-0">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {contractor.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {contractor.count.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">contracts</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        ₱{contractor.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">total</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {contractors.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No contractors found{searchQuery ? ` for "${searchQuery}"` : selectedLetter ? ` for letter "${selectedLetter}"` : ''}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ContractorsPage
