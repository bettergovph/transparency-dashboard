import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search, Filter, ChevronLeft, ChevronRight, X, HardHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { dpwhIndex } from '@/lib/meilisearch'
import type { DPWHProject, DPWHAggregateResponse, DPWHRegionAggregate, DPWHProvinceAggregate } from '@/types/dpwh'

interface DPWHBrowserProps {
  filterType?: 'category' | 'region' | 'province'
  filterValue?: string
}

const DPWHBrowser: React.FC<DPWHBrowserProps> = ({ filterType, filterValue }) => {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DPWHProject[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
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
  
  // Aggregates for filters
  const [regions, setRegions] = useState<DPWHRegionAggregate[]>([])
  const [provinces, setProvinces] = useState<DPWHProvinceAggregate[]>([])
  const [availableYears] = useState<number[]>([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026])
  const [availableStatuses] = useState<string[]>(['Completed', 'On-Going', 'For Procurement', 'Not Yet Started', 'Terminated'])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // Load aggregates for filter options
  useEffect(() => {
    loadAggregates()
  }, [])

  // Initialize filters from URL or props
  useEffect(() => {
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
      }
    }
  }, [filterType, filterValue])

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

  // Perform search with filters
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
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
        limit: 1000
      })

      setResults(searchResults.hits as any[])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
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
    <div className="max-w-full min-h-screen from-gray-50 to-white overflow-x-hidden flex flex-col">
      <Helmet>
        <title>{filterValue ? `${decodeURIComponent(filterValue)} - DPWH Projects` : 'DPWH Projects Browser'} - Transparency Dashboard</title>
        <meta name="description" content={filterValue ? `View DPWH infrastructure projects for ${decodeURIComponent(filterValue)}` : 'Search and browse DPWH infrastructure projects. Find roads, bridges, flood control, and building projects across the Philippines.'} />
        <meta name="keywords" content="DPWH, infrastructure, projects, roads, bridges, Philippines" />
      </Helmet>
      
      <Navigation />

      <div className="flex flex-1 overflow-x-hidden">
        <div className="flex-1 mx-auto max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 py-4">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <HardHat className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                {filterValue ? decodeURIComponent(filterValue) : 'DPWH Projects Browser'}
              </h1>
            </div>
            <p className="text-gray-600">
              {filterValue 
                ? `Showing all projects for ${filterType}: ${decodeURIComponent(filterValue)}`
                : 'Search and filter infrastructure projects from the Department of Public Works and Highways'
              }
            </p>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-white rounded-lg shadow p-2 mb-3 overflow-visible">
            {/* Search Bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                  <Search className="h-3 w-3 text-gray-400" />
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

          {/* Results Summary */}
          {!loading && results.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-base font-semibold text-black">
                  Results {query && `for "${query}"`}
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-gray-600 sm:border-l border-gray-300 sm:pl-3">
                  <span><strong>{formatNumber(results.length)}</strong> projects</span>
                  <span><strong>{formatCurrency(totalBudget)}</strong></span>
                  <span><strong>{avgProgress.toFixed(1)}%</strong> avg progress</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Searching projects...</p>
            </div>
          )}

          {/* Results Table */}
          {!loading && results.length > 0 && (
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
                              {project.contractId}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900 max-w-xs">
                              <div className="truncate" title={project.description}>
                                {project.description}
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
                                <span className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                                  {project.contractor}
                                </span>
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
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                project.status === 'Completed' ? 'bg-green-100 text-green-800' :
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
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="text-xs h-7"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(endIndex, results.length)}</span> of{' '}
                        <span className="font-medium">{results.length}</span> results
                      </p>
                    </div>
                    <div>
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
                </div>
              )}
            </div>
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
      
      <Footer />
    </div>
  )
}

export default DPWHBrowser
