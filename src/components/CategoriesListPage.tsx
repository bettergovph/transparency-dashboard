import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import Navigation from './Navigation'
import { filterIndices } from '@/lib/meilisearch'
import { toSlug } from '@/lib/utils'

const CategoriesListPage = () => {
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const alphabet = ['0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const index = filterIndices.business_categories
      const result = await index.search('', {
        limit: 10000,
        attributesToRetrieve: ['business_category'],
      })

      // Count occurrences
      const counts: Record<string, number> = {}
      result.hits.forEach((hit: any) => {
        const name = hit.business_category
        if (name) {
          counts[name] = (counts[name] || 0) + 1
        }
      })

      // Convert to array and sort
      const categoryList = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setCategories(categoryList)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter((category) => {
    // Filter by search query
    if (searchQuery && !category.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    // Filter by letter
    if (selectedLetter === 'ALL') return true
    if (selectedLetter === '0-9') {
      // Match entries starting with numbers or special characters (non-letters)
      return !/^[A-Za-z]/.test(category.name)
    }
    return category.name.toUpperCase().startsWith(selectedLetter)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Categories Directory</h1>
          <p className="text-gray-600">Browse {categories.length} business categories alphabetically</p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* A-Z Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedLetter('ALL')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${selectedLetter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              ALL
            </button>
            {alphabet.map((letter) => {
              const count = letter === '0-9'
                ? categories.filter((c) => !/^[A-Za-z]/.test(c.name)).length
                : categories.filter((c) => c.name.toUpperCase().startsWith(letter)).length
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
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        )}

        {/* Directory Grid */}
        {!loading && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Showing {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
              {filteredCategories.map((category) => (
                <Link
                  key={category.name}
                  to={`/categories/${toSlug(category.name)}`}
                  className="flex items-baseline justify-between py-2 border-b border-gray-100 hover:bg-gray-50 px-2 -mx-2 transition-colors group"
                >
                  <span className="text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-2">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>

            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No categories found for letter "{selectedLetter}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CategoriesListPage
