import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Search, Building2 } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import type { DPWHAggregateResponse, DPWHProvinceAggregate } from '@/types/dpwh'

const DPWHProvincesPage = () => {
  const [provinces, setProvinces] = useState<DPWHProvinceAggregate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'budget' | 'count'>('budget')
  const [isLoading, setIsLoading] = useState(true)
  const [metadata, setMetadata] = useState<any>(null)

  useEffect(() => {
    loadProvinces()
  }, [])

  const loadProvinces = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/data/dpwh/aggregates/provinces.json')
      const data: DPWHAggregateResponse<DPWHProvinceAggregate> = await response.json()
      setProvinces(data.data)
      setMetadata(data.metadata)
    } catch (error) {
      console.error('Error loading provinces:', error)
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

  // Get unique regions
  const uniqueRegions = Array.from(new Set(provinces.map(p => p.region))).sort()

  // Filter and sort provinces
  const filteredProvinces = provinces
    .filter(prov => {
      const matchesSearch = searchQuery === '' || 
        prov.province.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRegion = selectedRegion === 'all' || prov.region === selectedRegion
      return matchesSearch && matchesRegion
    })
    .sort((a, b) => {
      if (sortBy === 'budget') {
        return b.total_budget - a.total_budget
      }
      return b.project_count - a.project_count
    })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>DPWH Provinces - Transparency Dashboard</title>
        <meta name="description" content="Browse DPWH infrastructure projects by province. View project counts, budgets, and provincial statistics." />
        <meta name="keywords" content="DPWH, infrastructure, projects, provinces, Philippines" />
      </Helmet>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">DPWH Provinces</h1>
          </div>
          <p className="text-gray-600">
            {metadata ? `${formatNumber(metadata.total_items)} provinces · ${formatNumber(metadata.total_projects)} total projects · ${formatCurrency(metadata.total_budget)} total budget` : 'Loading...'}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search provinces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
          
          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="all">All Regions</option>
              {uniqueRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortBy('budget')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  sortBy === 'budget'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                By Total Budget
              </button>
              <button
                onClick={() => setSortBy('count')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  sortBy === 'count'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                By Project Count
              </button>
            </div>
            <p className="text-gray-600">
              {filteredProvinces.length} province{filteredProvinces.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Provinces Table */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Loading provinces...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Province
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projects
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Budget
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProvinces.map((province) => (
                    <tr key={province.province} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/dpwh/provinces/${encodeURIComponent(province.province)}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {province.province}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {province.region}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatNumber(province.project_count)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(province.total_budget)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {province.avg_progress.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default DPWHProvincesPage
