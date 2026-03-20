import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Loader2, FileText, Building2, HardHat, Users, MapPin } from 'lucide-react'
import Navigation from './Navigation'
import Footer from './Footer'
import { searchIndex, budgetIndex, dpwhIndex, awardeesIndex, areasIndex, organizationsIndex } from '@/lib/meilisearch'

interface SearchResult {
  type: 'procurement' | 'budget' | 'dpwh' | 'awardee' | 'area' | 'organization'
  title: string
  subtitle?: string
  link: string
}

const DataHighlights = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [previewResults, setPreviewResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Convert name to URL slug
  const toSlug = (text: string): string => {
    return text
      .toLowerCase()
    //   .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    //   .replace(/\s+/g, '-')         // Replace spaces with hyphens
    //   .replace(/-+/g, '-')          // Replace multiple hyphens with single
    //   .trim()
    //   .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch preview results as user types
  useEffect(() => {
    const fetchPreviewResults = async () => {
      if (!searchQuery.trim()) {
        setPreviewResults([])
        setShowDropdown(false)
        return
      }

      setIsSearching(true)

      try {
        const [procurementResults, budgetResults, dpwhResults, awardeeResults, areaResults, organizationResults] = await Promise.all([
          searchIndex.search(searchQuery.trim(), { limit: 2 }),
          budgetIndex.search(searchQuery.trim(), { limit: 2 }),
          dpwhIndex.search(searchQuery.trim(), { limit: 2 }),
          awardeesIndex.search(searchQuery.trim(), { limit: 2 }),
          areasIndex.search(searchQuery.trim(), { limit: 2 }),
          organizationsIndex.search(searchQuery.trim(), { limit: 2 })
        ])

        const results: SearchResult[] = []

        // Add procurement results
        procurementResults.hits.slice(0, 2).forEach((hit: any) => {
          results.push({
            type: 'procurement',
            title: hit.award_title || hit.awardee_name || 'Untitled',
            subtitle: hit.organization_name || hit.awardee_name,
            link: `/procurement?q=${encodeURIComponent(searchQuery.trim())}`
          })
        })

        // Add awardee/contractor results
        awardeeResults.hits.slice(0, 2).forEach((hit: any) => {
          const awardee_name = hit.awardee_name || 'Contractor'
          results.push({
            type: 'awardee',
            title: awardee_name,
            subtitle: `${hit.count || 0} contracts • ₱${(hit.total || 0).toLocaleString()}`,
            link: `/awardees/${toSlug(awardee_name)}`
          })
        })

        // Add area/location results
        areaResults.hits.slice(0, 2).forEach((hit: any) => {
          const area = hit.area_of_delivery || 'Location'
          results.push({
            type: 'area',
            title: area,
            subtitle: `${hit.count || 0} contracts • ₱${(hit.total || 0).toLocaleString()}`,
            link: `/locations/${toSlug(area)}`
          })
        })

        // Add organization results
        organizationResults.hits.slice(0, 2).forEach((hit: any) => {
          const org_name = hit.organization_name || 'Organization'
          results.push({
            type: 'organization',
            title: org_name,
            subtitle: `${hit.count || 0} contracts • ₱${(hit.total || 0).toLocaleString()}`,
            link: `/organizations/${toSlug(org_name)}`
          })
        })

        // Add budget results
        budgetResults.hits.slice(0, 2).forEach((hit: any) => {
          results.push({
            type: 'budget',
            title: hit.dsc || hit.uacs_agy_dsc || 'Budget Item',
            subtitle: hit.uacs_dpt_dsc || 'Department',
            link: `/budget/search?q=${encodeURIComponent(searchQuery.trim())}`
          })
        })

        // Add DPWH results
        dpwhResults.hits.slice(0, 2).forEach((hit: any) => {
          results.push({
            type: 'dpwh',
            title: hit.description || 'Infrastructure Project',
            subtitle: hit.location?.province || hit.location?.region || 'Location',
            link: `/dpwh?q=${encodeURIComponent(searchQuery.trim())}`
          })
        })

        setPreviewResults(results)
        setShowDropdown(results.length > 0)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Preview search error:', error)
        setPreviewResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(fetchPreviewResults, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || previewResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % previewResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + previewResults.length) % previewResults.length)
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      navigate(previewResults[selectedIndex].link)
      setShowDropdown(false)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const getIcon = (type: 'procurement' | 'budget' | 'dpwh' | 'awardee' | 'area' | 'organization') => {
    switch (type) {
      case 'procurement':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'awardee':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'area':
        return <MapPin className="h-4 w-4 text-blue-400" />
      case 'organization':
        return <Building2 className="h-4 w-4 text-blue-700" />
      case 'budget':
        return <Building2 className="h-4 w-4 text-purple-500" />
      case 'dpwh':
        return <HardHat className="h-4 w-4 text-orange-500" />
    }
  }

  const getTypeLabel = (type: 'procurement' | 'budget' | 'dpwh' | 'awardee' | 'area' | 'organization') => {
    switch (type) {
      case 'procurement':
        return 'Procurement'
      case 'awardee':
        return 'Contractor'
      case 'area':
        return 'Location'
      case 'organization':
        return 'Organization'
      case 'budget':
        return 'Budget'
      case 'dpwh':
        return 'Infrastructure'
    }
  }

  const datasets = [
    {
      title: 'Procurement Records',
      count: '2.5 Million',
      description: 'Government contracts and awards from PhilGEPS',
      link: '/procurement',
      linkText: 'Search Records'
    },
    {
      title: 'Budget Line Items',
      count: '3.8 Million',
      description: 'GAA budget allocations (2020-2026)',
      link: '/budget',
      linkText: 'Browse Budget'
    },
    {
      title: 'Infrastructure Projects',
      count: '248,220',
      description: 'DPWH projects with live monitoring',
      link: '/dpwh/overview',
      linkText: 'View Projects'
    },
    {
      title: 'Tax Collection Data',
      count: '6,000+',
      description: 'BIR monthly collections by region',
      link: '/bir',
      linkText: 'View Dashboard'
    }
  ]

  const totalValue = {
    procurement: '₱16T+',
    budget: '₱31.4T',
    infrastructure: '₱6.4T',
    tax: '₱11.4T'
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    
    try {
      // Search across all indices simultaneously
      const [procurementResults, budgetResults, dpwhResults] = await Promise.all([
        searchIndex.search(searchQuery.trim(), { limit: 5 }),
        budgetIndex.search(searchQuery.trim(), { limit: 5 }),
        dpwhIndex.search(searchQuery.trim(), { limit: 5 })
      ])

      // Determine which index has the most results
      const resultCounts = {
        procurement: procurementResults.estimatedTotalHits || 0,
        budget: budgetResults.estimatedTotalHits || 0,
        dpwh: dpwhResults.estimatedTotalHits || 0
      }

      // Navigate to the index with most results
      if (resultCounts.procurement >= resultCounts.budget && resultCounts.procurement >= resultCounts.dpwh) {
        navigate(`/procurement?q=${encodeURIComponent(searchQuery.trim())}`)
      } else if (resultCounts.budget >= resultCounts.dpwh) {
        navigate(`/budget/search?q=${encodeURIComponent(searchQuery.trim())}`)
      } else {
        navigate(`/dpwh?q=${encodeURIComponent(searchQuery.trim())}`)
      }
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to procurement search
      navigate(`/procurement?q=${encodeURIComponent(searchQuery.trim())}`)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <div className="flex-1 bg-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Transparency Through Data
            </h1>
            <p className="text-base text-gray-600 max-w-2xl mx-auto mb-8">
              Search and analyze millions of government records. From procurement contracts to infrastructure projects, 
              we make Philippine government data accessible and actionable.
            </p>
            
            {/* Search Box */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div ref={searchRef} className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {isSearching ? (
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => previewResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search across all datasets - procurement, budget, infrastructure..."
                  autoComplete="off"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />

                {/* Dropdown Results */}
                {showDropdown && previewResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto text-left">
                    <div className="p-2">
                      {previewResults.map((result, index) => (
                        <Link
                          key={index}
                          to={result.link}
                          onClick={() => setShowDropdown(false)}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                            index === selectedIndex
                              ? 'bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500">
                                {getTypeLabel(result.type)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 p-3 bg-gray-50">
                      <p className="text-xs text-gray-600 text-center">
                        Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded">Enter</kbd> to see all results
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to search across procurement, budget, and infrastructure records
              </p>
            </form>
          </div>

        {/* Data Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {datasets.map((dataset, index) => (
            <Link
              key={index}
              to={dataset.link}
              className="group bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <h3 className="text-xs font-semibold text-gray-500 mb-1">{dataset.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mb-2">{dataset.count}</p>
              <p className="text-sm text-gray-600 mb-3">{dataset.description}</p>
              <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                {dataset.linkText}
                <span className="ml-1 group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Value Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-10">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Total Value Tracked</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{totalValue.procurement}</div>
              <div className="text-xs text-gray-600">Procurement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{totalValue.budget}</div>
              <div className="text-xs text-gray-600">Budget</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">{totalValue.infrastructure}</div>
              <div className="text-xs text-gray-600">Infrastructure</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{totalValue.tax}</div>
              <div className="text-xs text-gray-600">Tax Collections</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            All data is sourced from official government agencies and updated regularly.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
            <span>PhilGEPS</span>
            <span>•</span>
            <span>DBM (GAA)</span>
            <span>•</span>
            <span>DPWH</span>
            <span>•</span>
            <span>BIR</span>
            <span>•</span>
            <span>Bureau of Treasury</span>
          </div>
        </div>

        {/* Data Disclaimer */}
        <div className="mt-12">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <p className="font-semibold text-yellow-800 mb-2">⚠️ Data Disclaimer:</p>
            <ul className="text-gray-700 space-y-1">
              <li>• Data is subject to change and may contain inaccuracies</li>
              <li>• Some contracts may have duplicates; we've done our best to clean the data</li>
              <li>• This is an unofficial community resource for transparency and research purposes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <Footer />
  </div>
  )
}

export default DataHighlights
