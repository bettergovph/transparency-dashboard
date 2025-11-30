import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search } from 'lucide-react'
import Navigation from './Navigation'
import Footer from './Footer'
import { filterIndices } from '@/lib/meilisearch'
import { toSlug } from '@/lib/utils'

const CategoriesListPage = () => {
  const [categories, setCategories] = useState<Array<{ name: string; count: number; total: number }>>([])
  const [selectedLetter, setSelectedLetter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const alphabet = ['0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

  useEffect(() => {
    loadCategories(selectedLetter, searchQuery)
  }, [selectedLetter, searchQuery])

  const loadCategories = async (letter: string, search: string) => {
    setIsLoading(true)
    try {
      const index = filterIndices.business_categories

      // Use search query if provided, otherwise get all
      const searchQuery = search || (letter || '')

      const result = await index.search(searchQuery, {
        limit: 10000,
        attributesToRetrieve: ['business_category', 'count', 'total'],
      })

      // Get total count from first load
      if (!totalCount) {
        setTotalCount(result.estimatedTotalHits)
      }

      // Map results directly from precomputed values
      let categoryList = result.hits
        .map((hit: any) => ({
          name: hit.business_category,
          count: hit.count || 0,
          total: hit.total || 0
        }))
        .filter(category => category.name) // Filter out items without names

      // Apply letter filter if needed
      if (letter && !search) {
        categoryList = categoryList.filter(category => {
          if (letter === '0-9') {
            return !/^[A-Za-z]/.test(category.name)
          }
          return category.name.toUpperCase().startsWith(letter)
        })
      }

      // If no letter filter and no search, show top 100 by total amount
      if (!letter && !search) {
        categoryList = categoryList.sort((a, b) => b.total - a.total).slice(0, 100)
      } else {
        // Otherwise sort by count, then by name
        categoryList = categoryList.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      }

      setCategories(categoryList)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Business Categories Directory - PhilGEPS Contract Browser</title>
        <meta name="description" content={`Browse ${totalCount.toLocaleString()} business categories in government procurement. Search by category type and view related contracts.`} />
        <meta name="keywords" content="PhilGEPS categories, business categories, procurement types, Philippines government contracts, category directory" />
        <meta property="og:title" content="Business Categories Directory - PhilGEPS" />
        <meta property="og:description" content="Browse government procurement business categories" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://philgeps.bettergov.ph/categories" />
      </Helmet>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Categories Directory</h1>
          <p className="text-gray-600">
            Browse {totalCount.toLocaleString()} categories
            {!selectedLetter && !searchQuery && ' - Showing Top 100 by Contract Count'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
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

          <div className="px-3 sm:px-6 py-4 border-b border-gray-200">
            <p className="text-sm sm:text-base text-gray-600">
              {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
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
                </div>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {categories.map((category, index) => (
                  <div key={category.name} className="px-3 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-500 shrink-0 w-8">#{index + 1}</span>
                      <Link
                        to={`/categories/${toSlug(category.name)}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors flex-1 text-left"
                      >
                        {category.name}
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Contracts:</span>
                        <span className="ml-1 font-mono text-gray-900">{category.count.toLocaleString()}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-mono text-green-600 font-semibold">₱{category.total.toLocaleString()}</span>
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
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category Name</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-32">Contracts</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-48">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map((category, index) => (
                      <tr key={category.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-base font-mono text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/categories/${toSlug(category.name)}`}
                            className="text-base text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {category.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right text-base font-mono text-gray-900">
                          {category.count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-left text-base font-mono text-green-600 font-semibold">
                          ₱{category.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories found{searchQuery ? ` for "${searchQuery}"` : selectedLetter ? ` for letter "${selectedLetter}"` : ''}</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default CategoriesListPage
