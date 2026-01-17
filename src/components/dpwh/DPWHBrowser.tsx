import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search, Filter, ChevronLeft, ChevronRight, X, HardHat, Download, BarChart3, Table, MapPin as MapPinIcon, Users, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { dpwhIndex } from '@/lib/meilisearch'
import type { DPWHProject, DPWHAggregateResponse, DPWHRegionAggregate, DPWHProvinceAggregate } from '@/types/dpwh'
import MapView from './DPWHMapView'
import DPWHVisualizationsTab from './DPWHVisualizationsTab'

interface DPWHBrowserProps {
  filterType?: 'category' | 'region' | 'province' | 'contractor'
  filterValue?: string
  embedded?: boolean // When true, skips Navigation, Footer, Helmet, and header
}

const DPWHBrowser: React.FC<DPWHBrowserProps> = ({ filterType, filterValue, embedded = false }) => {

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DPWHProject[]>([])
  const [loading, setLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  // Filter states
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  // Pagination
  const [resultsPerPage, setResultsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  // Sort
  const [tableSortField, setTableSortField] = useState<keyof DPWHProject | 'province' | 'year' | null>(null)
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')

  // Tabs
  const [activeTab, setActiveTab] = useState<'results' | 'visualizations' | 'map' | 'contractors' | 'regions'>('results')
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  // Aggregates for filters
  const [regions, setRegions] = useState<DPWHRegionAggregate[]>([])
  const [provinces, setProvinces] = useState<DPWHProvinceAggregate[]>([])
  const [availableYears] = useState<number[]>([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].reverse())
  const [availableStatuses] = useState<string[]>(['Completed', 'On-Going', 'For Procurement', 'Not Yet Started', 'Terminated'])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // Load aggregates for filter options
  useEffect(() => {
    loadAggregates()
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize filters from URL query params or props
  useEffect(() => {
    // First check URL params
    const urlQuery = searchParams.get('q')
    const urlYears = searchParams.get('years')
    const urlRegions = searchParams.get('regions')
    const urlProvinces = searchParams.get('provinces')
    const urlCategories = searchParams.get('categories')
    const urlStatuses = searchParams.get('statuses')
    const urlView = searchParams.get('view') as 'results' | 'visualizations' | 'map' | 'contractors' | 'regions' | null

    if (urlQuery) setQuery(urlQuery)
    if (urlYears) setSelectedYears(urlYears.split(','))
    if (urlRegions) setSelectedRegions(urlRegions.split(','))
    if (urlProvinces) setSelectedProvinces(urlProvinces.split(','))
    if (urlCategories) setSelectedCategories(urlCategories.split(','))
    if (urlStatuses) setSelectedStatuses(urlStatuses.split(','))
    if (urlView && ['results', 'visualizations', 'map', 'contractors', 'regions'].includes(urlView)) {
      setActiveTab(urlView)
    }

    // Then apply prop-based filters (for filtered views)
    if (filterType && filterValue) {
      const decodedValue = decodeURIComponent(filterValue)
      switch (filterType) {
        case 'category':
          setSelectedCategories([decodedValue])
          break
        case 'region':
          setSelectedRegions([decodedValue])
          break
        case 'province':
          setSelectedProvinces([decodedValue])
          break
        case 'contractor':
          // Contractor filter will be applied via Meilisearch query
          break
      }
    }
  }, [filterType, filterValue])

  // Update URL when filters or view mode change
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (query) params.set('q', query)
    if (selectedYears.length > 0) params.set('years', selectedYears.join(','))
    if (selectedRegions.length > 0) params.set('regions', selectedRegions.join(','))
    if (selectedProvinces.length > 0) params.set('provinces', selectedProvinces.join(','))
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','))
    if (selectedStatuses.length > 0) params.set('statuses', selectedStatuses.join(','))
    if (activeTab !== 'results') params.set('view', activeTab) // Only add if not default

    setSearchParams(params, { replace: true })
  }, [query, selectedYears, selectedRegions, selectedProvinces, selectedCategories, selectedStatuses, activeTab])

  const loadAggregates = async () => {
    try {
      const [regionsRes, provincesRes, categoriesRes] = await Promise.all([
        fetch('/data/dpwh/aggregates/regions.json'),
        fetch('/data/dpwh/aggregates/provinces.json'),
        fetch('/data/dpwh/aggregates/categories.json')
      ])

      const regionsData: DPWHAggregateResponse<DPWHRegionAggregate> = await regionsRes.json()
      const provincesData: DPWHAggregateResponse<DPWHProvinceAggregate> = await provincesRes.json()
      const categoriesData = await categoriesRes.json()

      setRegions(regionsData.data)
      setProvinces(provincesData.data)
      setAvailableCategories(categoriesData.data.map((c: any) => c.category))
    } catch (error) {
      console.error('Error loading aggregates:', error)
    }
  }

  // Perform search with filters (debounced)
  useEffect(() => {
    // Show searching indicator immediately
    setIsSearching(true)
    
    const delayDebounceFn = setTimeout(() => {
      performSearch()
    }, 500) // 500ms debounce

    return () => {
      clearTimeout(delayDebounceFn)
    }
  }, [query, selectedYears, selectedRegions, selectedProvinces, selectedCategories, selectedStatuses])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, resultsPerPage, selectedYears, selectedRegions, selectedProvinces, selectedCategories, selectedStatuses])

  const performSearch = async () => {
    setLoading(true)

    try {
      const filters = buildFilters()

      const searchResults = await dpwhIndex.search(query || '', {
        filter: filters,
        limit: 10000
      })

      setResults(searchResults.hits as any[])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }

  const buildFilters = () => {
    const filterParts: string[] = []

    if (selectedYears.length > 0) {
      const yearFilters = selectedYears.map(year => `infraYear = ${year}`).join(' OR ')
      filterParts.push(`(${yearFilters})`)
    }

    if (selectedRegions.length > 0) {
      const regionFilters = selectedRegions.map(region => `location.region = "${region}"`).join(' OR ')
      filterParts.push(`(${regionFilters})`)
    }

    if (selectedProvinces.length > 0) {
      const provinceFilters = selectedProvinces.map(province => `location.province = "${province}"`).join(' OR ')
      filterParts.push(`(${provinceFilters})`)
    }

    if (selectedCategories.length > 0) {
      const categoryFilters = selectedCategories.map(category => `category = "${category}"`).join(' OR ')
      filterParts.push(`(${categoryFilters})`)
    }

    if (selectedStatuses.length > 0) {
      const statusFilters = selectedStatuses.map(status => `status = "${status}"`).join(' OR ')
      filterParts.push(`(${statusFilters})`)
    }

    // Handle contractor filter from URL
    if (filterType === 'contractor' && filterValue) {
      const decodedContractor = decodeURIComponent(filterValue)
      filterParts.push(`contractor = "${decodedContractor}"`)
    }

    return filterParts.length > 0 ? filterParts.join(' AND ') : undefined
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  // Download functions
  const downloadJSON = () => {
    const data = sortedResults.map(p => ({
      contractId: p.contractId,
      description: p.description,
      category: p.category,
      contractor: p.contractor,
      region: p.location?.region,
      province: p.location?.province,
      budget: p.budget,
      amountPaid: p.amountPaid,
      year: p.infraYear,
      progress: p.progress,
      status: p.status,
      startDate: p.startDate,
      completionDate: p.completionDate
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dpwh-projects-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadCSV = () => {
    const headers = ['Contract ID', 'Description', 'Category', 'Contractor', 'Region', 'Province', 'Budget', 'Amount Paid', 'Year', 'Progress', 'Status', 'Start Date', 'Completion Date']
    const rows = sortedResults.map(p => [
      p.contractId,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.contractor || '').replace(/"/g, '""')}"`,
      `"${(p.location?.region || '').replace(/"/g, '""')}"`,
      `"${(p.location?.province || '').replace(/"/g, '""')}"`,
      p.budget,
      p.amountPaid,
      p.infraYear,
      p.progress,
      p.status,
      p.startDate || '',
      p.completionDate || ''
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dpwh-projects-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Pagination calculations
  const totalPages = Math.ceil(results.length / resultsPerPage)
  const startIndex = (currentPage - 1) * resultsPerPage
  const endIndex = startIndex + resultsPerPage

  // Apply table sorting if active
  const sortedResults = tableSortField
    ? [...results].sort((a, b) => {
      let aValue: any
      let bValue: any

      // Handle nested location fields and renamed fields
      if (tableSortField === 'province') {
        aValue = a.location?.province
        bValue = b.location?.province
      } else if (tableSortField === 'year') {
        aValue = a.infraYear
        bValue = b.infraYear
      } else {
        aValue = a[tableSortField as keyof DPWHProject]
        bValue = b[tableSortField as keyof DPWHProject]
      }

      if (tableSortField === 'budget' || tableSortField === 'amountPaid' || tableSortField === 'progress' || tableSortField === 'year') {
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

  const totalBudget = results.reduce((sum, doc) => sum + (doc.budget || 0), 0)
  const avgProgress = results.length > 0
    ? results.reduce((sum, doc) => sum + (doc.progress || 0), 0) / results.length
    : 0

  // Compute aggregates from search results for visualizations
  const aggregates = useMemo(() => {
    if (results.length === 0) return null

    // Top Regions
    const regionMap = new Map<string, { count: number; budget: number }>()
    results.forEach(p => {
      const region = p.location?.region || 'Unknown'
      const existing = regionMap.get(region) || { count: 0, budget: 0 }
      regionMap.set(region, {
        count: existing.count + 1,
        budget: existing.budget + (p.budget || 0)
      })
    })
    const topRegions = Array.from(regionMap.entries())
      .map(([region, data]) => ({ region, ...data }))
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 10)

    // Top Contractors (for visualizations - top 10)
    const contractorMap = new Map<string, { count: number; budget: number }>()
    results.forEach(p => {
      const contractor = p.contractor || 'Unknown'
      const existing = contractorMap.get(contractor) || { count: 0, budget: 0 }
      contractorMap.set(contractor, {
        count: existing.count + 1,
        budget: existing.budget + (p.budget || 0)
      })
    })
    const allContractors = Array.from(contractorMap.entries())
      .map(([contractor, data]) => ({ contractor, ...data }))
      .sort((a, b) => b.budget - a.budget)
    const topContractors = allContractors.slice(0, 10)

    // Top Categories
    const categoryMap = new Map<string, { count: number; budget: number }>()
    results.forEach(p => {
      const category = p.category || 'Unknown'
      const existing = categoryMap.get(category) || { count: 0, budget: 0 }
      categoryMap.set(category, {
        count: existing.count + 1,
        budget: existing.budget + (p.budget || 0)
      })
    })
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 10)

    // Status Distribution
    const statusMap = new Map<string, { count: number; budget: number }>()
    results.forEach(p => {
      const status = p.status || 'Unknown'
      const existing = statusMap.get(status) || { count: 0, budget: 0 }
      statusMap.set(status, {
        count: existing.count + 1,
        budget: existing.budget + (p.budget || 0)
      })
    })
    const statusDistribution = Array.from(statusMap.entries())
      .map(([status, data]) => ({ status, ...data }))
      .sort((a, b) => b.count - a.count)

    // Year Distribution
    const yearMap = new Map<string, { count: number; budget: number }>()
    results.forEach(p => {
      const year = String(p.infraYear || 'Unknown')
      const existing = yearMap.get(year) || { count: 0, budget: 0 }
      yearMap.set(year, {
        count: existing.count + 1,
        budget: existing.budget + (p.budget || 0)
      })
    })
    const yearDistribution = Array.from(yearMap.entries())
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => a.year.localeCompare(b.year))

    // Top Provinces
    const provinceMap = new Map<string, { count: number; budget: number }>()
    results.forEach(p => {
      const province = p.location?.province || 'Unknown'
      const existing = provinceMap.get(province) || { count: 0, budget: 0 }
      provinceMap.set(province, {
        count: existing.count + 1,
        budget: existing.budget + (p.budget || 0)
      })
    })
    const topProvinces = Array.from(provinceMap.entries())
      .map(([province, data]) => ({ province, ...data }))
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 10)

    // Hierarchical Regions with Provinces (for Regions tab)
    const regionHierarchy = Array.from(regionMap.entries())
      .map(([region, regionData]) => {
        // Get all provinces for this region
        const provincesInRegion = results
          .filter(p => p.location?.region === region)
          .reduce((acc, p) => {
            const province = p.location?.province || 'Unknown'
            const existing = acc.get(province) || { count: 0, budget: 0 }
            acc.set(province, {
              count: existing.count + 1,
              budget: existing.budget + (p.budget || 0)
            })
            return acc
          }, new Map<string, { count: number; budget: number }>())
        
        const provinces = Array.from(provincesInRegion.entries())
          .map(([province, data]) => ({ province, ...data }))
          .sort((a, b) => b.budget - a.budget)

        return {
          region,
          ...regionData,
          provinces
        }
      })
      .sort((a, b) => b.budget - a.budget)

    return {
      topRegions,
      topContractors,
      allContractors,
      topCategories,
      statusDistribution,
      yearDistribution,
      topProvinces,
      regionHierarchy
    }
  }, [results])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTableSort = (field: keyof DPWHProject | 'province' | 'year') => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setTableSortField(field as any)
      setTableSortDirection('asc')
    }
  }

  const getSortIcon = (field: keyof DPWHProject | 'province' | 'year') => {
    if (tableSortField !== field) return null
    return tableSortDirection === 'asc' ? ' ↑' : ' ↓'
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

  const removeFilter = (type: 'year' | 'region' | 'province' | 'category' | 'status', value: string) => {
    switch (type) {
      case 'year':
        setSelectedYears(selectedYears.filter(y => y !== value))
        break
      case 'region':
        setSelectedRegions(selectedRegions.filter(r => r !== value))
        break
      case 'province':
        setSelectedProvinces(selectedProvinces.filter(p => p !== value))
        break
      case 'category':
        setSelectedCategories(selectedCategories.filter(c => c !== value))
        break
      case 'status':
        setSelectedStatuses(selectedStatuses.filter(s => s !== value))
        break
    }
  }

  // Filter provinces based on selected regions
  const filteredProvinces = selectedRegions.length > 0
    ? provinces.filter(p => selectedRegions.includes(p.region))
    : provinces

  return (
    <div className={embedded ? '' : 'max-w-full min-h-screen from-gray-50 to-white overflow-x-hidden flex flex-col'}>
      {!embedded && (
        <Helmet>
          <title>{filterValue ? `${decodeURIComponent(filterValue)} - DPWH Projects` : 'DPWH Projects Browser'} - Transparency Dashboard</title>
          <meta name="description" content={filterValue ? `View DPWH infrastructure projects for ${decodeURIComponent(filterValue)}` : 'Search and browse DPWH infrastructure projects. Find roads, bridges, flood control, and building projects across the Philippines.'} />
          <meta name="keywords" content="DPWH, infrastructure, projects, roads, bridges, Philippines" />
        </Helmet>
      )}

      {!embedded && <Navigation />}

      <div className={embedded ? '' : 'flex flex-1 overflow-x-hidden'}>
        <div className={embedded ? '' : 'flex-1 mx-auto max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 py-4'}>
          {/* Header - only show when not embedded */}
          {!embedded && (
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <HardHat className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {filterValue ? decodeURIComponent(filterValue) : 'DPWH Projects Browser'}
                </h1>
              </div>
              <p className="text-gray-600 text-md">
                {filterValue
                  ? `Showing all projects for ${filterType}: ${decodeURIComponent(filterValue)}`
                  : 'Search and filter infrastructure projects from the DPWH. Data from DPWH\'s transparency portal.'
                }
              </p>
            </div>
          )}

          {/* Search and Filters Section */}
          <div className="bg-white rounded-lg shadow p-2 mb-3 overflow-visible">
            {/* Search Bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                  {isSearching && !loading ? (
                    <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                  ) : (
                    <Search className="h-3 w-3 text-gray-400" />
                  )}
                </div>
                <Input
                  type="text"
                  placeholder="Search by contract ID, description, contractor, location..."
                  value={query}
                  autoFocus
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8! pr-2 py-1.5 text-xs border border-gray-800 rounded focus:border-black focus:ring-1 focus:ring-black"
                  style={{ paddingLeft: '2rem' }}
                />
                {isSearching && !loading && (
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span className="text-[10px] text-gray-500 italic">searching...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Filter Tags */}
            {(selectedYears.length > 0 || selectedRegions.length > 0 || selectedProvinces.length > 0 || selectedCategories.length > 0 || selectedStatuses.length > 0) && (
              <div className="flex flex-wrap gap-1 mb-2 px-1 overflow-x-auto">
                {selectedYears.map((year) => (
                  <div key={year} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] flex-shrink-0">
                    <span>{year}</span>
                    <button onClick={() => removeFilter('year', year)} className="hover:bg-blue-200 rounded-full p-0.5">
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
                {selectedRegions.map((region) => (
                  <div key={region} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] flex-shrink-0">
                    <span className="truncate max-w-[120px]">{region}</span>
                    <button onClick={() => removeFilter('region', region)} className="hover:bg-green-200 rounded-full p-0.5">
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
                {selectedProvinces.map((province) => (
                  <div key={province} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] flex-shrink-0">
                    <span className="truncate max-w-[120px]">{province}</span>
                    <button onClick={() => removeFilter('province', province)} className="hover:bg-purple-200 rounded-full p-0.5">
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
                {selectedCategories.map((category) => (
                  <div key={category} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] flex-shrink-0">
                    <span className="truncate max-w-[120px]">{category}</span>
                    <button onClick={() => removeFilter('category', category)} className="hover:bg-yellow-200 rounded-full p-0.5">
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
                {selectedStatuses.map((status) => (
                  <div key={status} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] flex-shrink-0">
                    <span>{status}</span>
                    <button onClick={() => removeFilter('status', status)} className="hover:bg-red-200 rounded-full p-0.5">
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 overflow-visible">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="hover:bg-gray-100 rounded text-[10px] h-6 px-2 shrink-0"
              >
                <Filter className="h-2.5 w-2.5 mr-1" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <select
                  value={resultsPerPage}
                  onChange={(e) => setResultsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t">
                {/* Year Filter */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-1">Year</label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {availableYears.map(year => (
                      <label key={year} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={selectedYears.includes(String(year))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedYears([...selectedYears, String(year)])
                            } else {
                              setSelectedYears(selectedYears.filter(y => y !== String(year)))
                            }
                          }}
                          className="mr-2"
                        />
                        {year}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-1">Region</label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {regions.map(region => (
                      <label key={region.region} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={selectedRegions.includes(region.region)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRegions([...selectedRegions, region.region])
                            } else {
                              setSelectedRegions(selectedRegions.filter(r => r !== region.region))
                              // Also remove provinces from this region
                              setSelectedProvinces(selectedProvinces.filter(p => {
                                const province = provinces.find(prov => prov.province === p)
                                return province?.region !== region.region
                              }))
                            }
                          }}
                          className="mr-2"
                        />
                        {region.region}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Province Filter */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-1">Province</label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {filteredProvinces.map(province => (
                      <label key={province.province} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={selectedProvinces.includes(province.province)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProvinces([...selectedProvinces, province.province])
                            } else {
                              setSelectedProvinces(selectedProvinces.filter(p => p !== province.province))
                            }
                          }}
                          className="mr-2"
                        />
                        {province.province}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-1">Category</label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {availableCategories.slice(0, 20).map(category => (
                      <label key={category} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, category])
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== category))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="truncate">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-1">Status</label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {availableStatuses.map(status => (
                      <label key={status} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStatuses([...selectedStatuses, status])
                            } else {
                              setSelectedStatuses(selectedStatuses.filter(s => s !== status))
                            }
                          }}
                          className="mr-2"
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Combined Tabs and Results Header */}
          {!loading && results.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-3">
              <div className="px-2 sm:px-3 py-2">
                {/* Desktop: Single row with tabs and info */}
                <div className="hidden lg:flex items-center justify-between border-b pb-2">
                  {/* Left: Tabs */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActiveTab('results')}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'results'
                          ? 'border-b-2 border-blue-600 text-blue-600 -mb-[11px]'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Table className="h-4 w-4" />
                      <span>Results</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('visualizations')}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'visualizations'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Charts</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('map')}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'map'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <MapPinIcon className="h-4 w-4" />
                      <span>Map</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('contractors')}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'contractors'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Contractors</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('regions')}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'regions'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <MapPinIcon className="h-4 w-4" />
                      <span>Regions</span>
                    </button>
                  </div>

                  {/* Right: Results info and downloads */}
                  <div className="flex items-center gap-3">
                    {/* Results limit notice */}
                    {results.length >= 10000 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800">
                        <span className="font-medium">⚠</span>
                        <span>Results limited to 10,000. Refine filters.</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-[10px] text-gray-600">
                      <span><strong>{formatNumber(results.length)}</strong> projects</span>
                      <span>•</span>
                      <span><strong>{formatCurrency(totalBudget)}</strong></span>
                      <span>•</span>
                      <span><strong>{avgProgress.toFixed(1)}%</strong> avg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadJSON}
                        className="text-[10px] h-6 px-2 gap-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>JSON</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadCSV}
                        className="text-[10px] h-6 px-2 gap-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile/Tablet: Two rows */}
                <div className="lg:hidden">
                  {/* Tabs Row */}
                  <div className="flex items-center justify-between border-b overflow-x-auto pb-2 -mx-2 px-2">
                    <div className="flex gap-1 min-w-max">
                      <button
                        onClick={() => setActiveTab('results')}
                        className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'results'
                            ? 'border-b-2 border-blue-600 text-blue-600 -mb-[11px]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Table className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Results</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('visualizations')}
                        className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'visualizations'
                            ? 'border-b-2 border-blue-600 text-blue-600 -mb-[11px]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Charts</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'map'
                            ? 'border-b-2 border-blue-600 text-blue-600 -mb-[11px]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <MapPinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Map</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('contractors')}
                        className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'contractors'
                            ? 'border-b-2 border-blue-600 text-blue-600 -mb-[11px]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Contractors</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('regions')}
                        className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'regions'
                            ? 'border-b-2 border-blue-600 text-blue-600 -mb-[11px]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <MapPinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Regions</span>
                      </button>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                    {/* Results limit notice */}
                    {results.length >= 10000 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800">
                        <span className="font-medium">⚠</span>
                        <span>Results limited to 10,000 items only. <span className="hidden md:inline">Refine filters for complete data.</span></span>
                      </div>
                    )}

                    {/* Results info and download buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-gray-600">
                        <span><strong>{formatNumber(results.length)}</strong> <span className="hidden sm:inline">projects</span></span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden md:inline"><strong>{formatCurrency(totalBudget)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadJSON}
                          className="text-[10px] h-6 px-1.5 sm:px-2 gap-0.5 sm:gap-1"
                        >
                          <Download className="h-3 w-3" />
                          <span className="hidden sm:inline">JSON</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadCSV}
                          className="text-[10px] h-6 px-1.5 sm:px-2 gap-0.5 sm:gap-1"
                        >
                          <Download className="h-3 w-3" />
                          <span className="hidden sm:inline">CSV</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {!loading && results.length > 0 && activeTab === 'results' && (
            <div className="space-y-3">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('contractId')}
                          >
                            Contract ID{getSortIcon('contractId')}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('description')}
                          >
                            Description{getSortIcon('description')}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('category')}
                          >
                            Category{getSortIcon('category')}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('contractor')}
                          >
                            Contractor{getSortIcon('contractor')}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('province')}
                          >
                            Province{getSortIcon('province')}
                          </th>
                          <th
                            className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('budget')}
                          >
                            Budget{getSortIcon('budget')}
                          </th>
                          <th
                            className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('amountPaid')}
                          >
                            Amount Paid{getSortIcon('amountPaid')}
                          </th>
                          <th
                            className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('year')}
                          >
                            Year{getSortIcon('year')}
                          </th>
                          <th
                            className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('progress')}
                          >
                            Progress{getSortIcon('progress')}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort('status')}
                          >
                            Status{getSortIcon('status')}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Start Date
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Completion Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedResults.map((project) => (
                          <tr key={project.contractId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-blue-600">
                              <Link
                                to={`/dpwh/projects/${project.contractId}`}
                                className="hover:underline"
                              >
                                {project.contractId}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900 max-w-xs">
                              <div className="truncate group relative" title={project.description}>
                                {project.description}
                                <div className="hidden group-hover:block absolute z-50 left-0 top-full mt-1 w-96 max-w-screen-sm bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-none">
                                  <div className="whitespace-normal break-words">
                                    {project.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                              <Link
                                to={`/dpwh/categories/${encodeURIComponent(project.category)}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {project.category}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900 max-w-xs">
                              <div className="truncate" title={project.contractor}>
                                <Link
                                  to={`/dpwh/contractors/${encodeURIComponent(project.contractor)}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {project.contractor}
                                </Link>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                              <Link
                                to={`/dpwh/provinces/${encodeURIComponent(project.location?.province || '')}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {project.location?.province}
                              </Link>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-semibold text-gray-900">
                              {formatCurrency(project.budget)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-xs text-gray-600">
                              {formatCurrency(project.amountPaid)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center text-xs text-gray-700">
                              {project.infraYear}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-xs text-gray-600">
                              {project.progress.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                project.status === 'On-Going' ? 'bg-blue-100 text-blue-800' :
                                  project.status === 'For Procurement' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {project.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                              {formatDate(project.startDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                              {formatDate(project.completionDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-3 py-2 rounded-lg">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="text-xs h-7"
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-gray-700 self-center">Page {currentPage} of {totalPages}</span>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="text-xs h-7"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
                    <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-r-none text-xs h-7 px-2"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-700 border border-gray-300 bg-white"
                          >
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(page as number)}
                            className="rounded-none text-xs h-7 px-3 min-w-8"
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
                        className="rounded-l-none text-xs h-7 px-2"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </nav>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visualizations Tab */}
          {!loading && results.length > 0 && activeTab === 'visualizations' && aggregates && (
            <DPWHVisualizationsTab 
              results={results}
              aggregates={aggregates}
              totalBudget={totalBudget}
              avgProgress={avgProgress}
            />
          )}

          {/* No Results */}
          {!loading && query && results.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search terms or filters.
                </p>
              </div>
            </div>
          )}

          {/* Map Tab */}
          {!loading && results.length > 0 && activeTab === 'map' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <MapView projects={results} />
            </div>
          )}

          {/* Contractors Tab */}
          {!loading && results.length > 0 && activeTab === 'contractors' && aggregates && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">All Contractors</h2>
                  <p className="text-sm text-gray-600">
                    {aggregates.allContractors.length} unique contractors
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contractor Name
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Projects
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Budget
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Budget/Project
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Market Share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {aggregates.allContractors.map((contractor, index) => {
                        const avgBudget = contractor.budget / contractor.count
                        const marketShare = (contractor.budget / totalBudget) * 100
                        
                        return (
                          <tr key={contractor.contractor} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <Link
                                to={`/dpwh/contractors/${encodeURIComponent(contractor.contractor)}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                {contractor.contractor}
                              </Link>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                              {formatNumber(contractor.count)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                              {formatCurrency(contractor.budget)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                              {formatCurrency(avgBudget)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${Math.min(marketShare, 100)}%` }}
                                  />
                                </div>
                                <span className="text-gray-700 font-medium">{marketShare.toFixed(2)}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Regions Tab */}
          {!loading && results.length > 0 && activeTab === 'regions' && aggregates && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Regions & Provinces</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedRegions(new Set(aggregates.regionHierarchy.map(r => r.region)))}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={() => setExpandedRegions(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Collapse All
                    </button>
                    <p className="text-sm text-gray-600">
                      {aggregates.regionHierarchy.length} regions
                    </p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Region / Province
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Projects
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Budget
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {aggregates.regionHierarchy.map((region, regionIndex) => {
                        const isExpanded = expandedRegions.has(region.region)
                        const regionShare = (region.budget / totalBudget) * 100
                        
                        return (
                          <React.Fragment key={region.region}>
                            {/* Region Row */}
                            <tr className="border-b border-gray-200 bg-blue-50 hover:bg-blue-100 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                                {regionIndex + 1}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedRegions)
                                    if (isExpanded) {
                                      newExpanded.delete(region.region)
                                    } else {
                                      newExpanded.add(region.region)
                                    }
                                    setExpandedRegions(newExpanded)
                                  }}
                                  className="flex items-center gap-2 w-full text-left font-bold text-gray-900 hover:text-blue-600 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                  )}
                                  <span>{region.region}</span>
                                  <span className="text-xs text-gray-500 font-normal">({region.provinces.length} provinces)</span>
                                </button>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900 font-semibold">
                                {formatNumber(region.count)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                {formatCurrency(region.budget)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${Math.min(regionShare, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-gray-700 font-medium">{regionShare.toFixed(2)}%</span>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Province Rows (only if expanded) */}
                            {isExpanded && region.provinces.map((province, provinceIndex) => {
                              const provinceShare = (province.budget / totalBudget) * 100
                              
                              return (
                                <tr key={`${region.region}-${province.province}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-400">
                                    {regionIndex + 1}.{provinceIndex + 1}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    <div className="flex items-center gap-2 pl-8">
                                      <Link
                                        to={`/dpwh/provinces/${encodeURIComponent(province.province)}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        {province.province}
                                      </Link>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-700">
                                    {formatNumber(province.count)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                                    {formatCurrency(province.budget)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-center text-sm">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="w-20 bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-green-500 h-2 rounded-full" 
                                          style={{ width: `${Math.min(provinceShare, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-gray-600">{provinceShare.toFixed(2)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Welcome State */}
          {!query && !loading && results.length === 0 && (selectedYears.length === 0 && selectedRegions.length === 0 && selectedProvinces.length === 0 && selectedCategories.length === 0 && selectedStatuses.length === 0) && (
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <div className="max-w-2xl mx-auto">
                <HardHat className="h-16 w-16 text-blue-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  DPWH Infrastructure Projects
                </h3>
                <p className="text-gray-600 mb-6">
                  Search through thousands of DPWH infrastructure projects including roads, bridges, flood control systems, and public buildings.
                  Use the filters to narrow down by year, region, province, category, or status.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">248,220 Projects</p>
                    <p className="text-gray-600">Total infrastructure projects</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">₱6.38 Trillion</p>
                    <p className="text-gray-600">Total budget allocation</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">All Regions</p>
                    <p className="text-gray-600">Nationwide coverage</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!embedded && <Footer />}
    </div>
  )
}

export default DPWHBrowser
