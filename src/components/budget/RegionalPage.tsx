import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { MapPin, TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts'
import Navigation from '../Navigation'
import Footer from '../Footer'
import BudgetHeader from './BudgetHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RegionData {
  region: string
  gaa: number
}

interface YearData {
  year: number
  regions: RegionData[]
  total: number
}

interface RegionalData {
  metadata: {
    title: string
    description: string
    generated_at: string
    years_covered: string
    total_years: number
    source: string
    note: string
  }
  data: YearData[]
}

const RegionalPage = () => {
  const [regionalData, setRegionalData] = useState<RegionalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<number[]>([])

  useEffect(() => {
    loadRegionalData()
  }, [])

  const loadRegionalData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/data/bir/aggregates/gaa_by_region.json')
      const data: RegionalData = await response.json()
      setRegionalData(data)

      // Extract available years
      const years = data.data.map(d => d.year).sort((a, b) => b - a)
      setAvailableYears(years)
      if (years.length > 0) {
        setSelectedYear(years[0])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading regional data:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    // Regional allocation data is already in actual pesos, not thousands
    // So we format it differently than GAA amounts
    if (value >= 1_000_000_000_000) {
      return `₱${(value / 1_000_000_000_000).toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}T`
    } else if (value >= 1_000_000_000) {
      return `₱${(value / 1_000_000_000).toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}B`
    } else if (value >= 1_000_000) {
      return `₱${(value / 1_000_000).toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}M`
    } else if (value >= 1_000) {
      return `₱${(value / 1_000).toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}K`
    } else {
      return `₱${value.toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`
    }
  }

  if (loading || !regionalData) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Regional Allocations...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Get current year data
  const currentYearData = regionalData.data.find(d => d.year === selectedYear)
  if (!currentYearData) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">No data available for {selectedYear}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Filter regions based on search
  const filteredRegions = currentYearData.regions
    .filter(region => {
      if (!searchQuery) return true
      return region.region.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => b.gaa - a.gaa)

  const totalAllocation = filteredRegions.reduce((sum, region) => sum + region.gaa, 0)

  // Prepare data for year-over-year comparison chart
  const yearOverYearData = regionalData.data
    .map(yearData => ({
      year: yearData.year,
      total: yearData.total
    }))
    .sort((a, b) => a.year - b.year)

  // Calculate YoY change
  const currentTotal = currentYearData.total
  const previousYearData = regionalData.data.find(d => d.year === selectedYear - 1)
  const previousTotal = previousYearData?.total || 0
  const yoyChange = previousTotal > 0 
    ? ((currentTotal - previousTotal) / previousTotal) * 100 
    : 0

  // Prepare regional comparison chart data (top 10 regions)
  const topRegionsChartData = filteredRegions
    .slice(0, 10)
    .map(region => ({
      region: region.region.replace(/\s*\([^)]*\)/g, '').substring(0, 15), // Shorten for chart
      gaa: region.gaa / 1_000_000_000 // Convert to billions for chart
    }))

  return (
    <>
      <Helmet>
        <title>Regional - GAA Budget Browser</title>
        <meta name="description" content="Explore Philippine national budget allocations by region from the General Appropriations Act (GAA)." />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Sticky Header */}
        <BudgetHeader
          title="Regional"
          subtitle="National budget allocation per region"
          icon={<MapPin className="h-5 w-5 md:h-6 md:w-6 text-white" />}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search regions..."
          showSearch={true}
        />

        {/* Content Area with Padding */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-[1800px] mx-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Regions ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {filteredRegions.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Active regions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Allocation ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(currentYearData.total)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">National budget</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Year-over-Year Change</CardDescription>
                <CardTitle className={`text-2xl flex items-center gap-2 ${
                  yoyChange > 0 ? 'text-green-600' : yoyChange < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <TrendingUp className={`h-6 w-6 ${
                    yoyChange < 0 ? 'rotate-180' : ''
                  }`} />
                  {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(2)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">vs {selectedYear - 1}</p>
              </CardContent>
            </Card>
          </div>

          {/* Year-over-Year Trend Chart */}
          <div className="mb-6 max-w-[1800px] mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>National Budget Trend (2020-2025)</CardTitle>
                <CardDescription>Total budget allocation across all regions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={yearOverYearData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `₱${(value / 1_000_000_000_000).toFixed(1)}T`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white px-3 py-2 border border-gray-200 rounded shadow-lg">
                              <p className="text-sm font-semibold text-gray-900">{payload[0].payload.year}</p>
                              <p className="text-sm text-blue-600">
                                {formatCurrency(payload[0].value as number)}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Regional Comparison Chart */}
          <div className="mb-6 max-w-[1800px] mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Regions by Allocation ({selectedYear})</CardTitle>
                <CardDescription>Budget allocation in billions (₱B)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topRegionsChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `₱${value.toFixed(0)}B`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="region"
                      stroke="#6b7280"
                      style={{ fontSize: '11px' }}
                      width={150}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white px-3 py-2 border border-gray-200 rounded shadow-lg">
                              <p className="text-sm font-semibold text-gray-900">{payload[0].payload.region}</p>
                              <p className="text-sm text-blue-600">
                                {formatCurrency(payload[0].value as number * 1_000_000_000)}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="gaa" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Regional Cards Grid */}
          <div className="max-w-[1800px] mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Regions ({selectedYear})</h2>
            
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Region
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Allocation
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Share of Total
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          YoY Change
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRegions.map((region, index) => {
                        const percentage = totalAllocation > 0 ? (region.gaa / totalAllocation) * 100 : 0
                        
                        // Calculate YoY change for this region
                        const previousYearRegion = previousYearData?.regions.find(r => r.region === region.region)
                        const regionYoyChange = previousYearRegion && previousYearRegion.gaa > 0
                          ? ((region.gaa - previousYearRegion.gaa) / previousYearRegion.gaa) * 100
                          : 0

                        return (
                          <tr key={region.region} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">{region.region}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-blue-600">
                                {formatCurrency(region.gaa)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {percentage.toFixed(2)}%
                                </span>
                                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {regionYoyChange !== 0 ? (
                                <span className={`text-sm font-semibold flex items-center justify-end gap-1 ${
                                  regionYoyChange > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  <TrendingUp className={`h-4 w-4 ${
                                    regionYoyChange < 0 ? 'rotate-180' : ''
                                  }`} />
                                  {regionYoyChange > 0 ? '+' : ''}{regionYoyChange.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">N/A</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredRegions.map((region, index) => {
                const percentage = totalAllocation > 0 ? (region.gaa / totalAllocation) * 100 : 0
                
                const previousYearRegion = previousYearData?.regions.find(r => r.region === region.region)
                const regionYoyChange = previousYearRegion && previousYearRegion.gaa > 0
                  ? ((region.gaa - previousYearRegion.gaa) / previousYearRegion.gaa) * 100
                  : 0

                return (
                  <Card key={region.region} className="border-l-4 border-l-blue-600">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                            #{index + 1}
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{region.region}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selectedYear}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Allocation</p>
                          <p className="text-xl font-bold text-blue-600">{formatCurrency(region.gaa)}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Share of Total</p>
                            <p className="text-sm font-bold text-gray-900">{percentage.toFixed(2)}%</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">YoY Change</p>
                            {regionYoyChange !== 0 ? (
                              <p className={`text-sm font-bold flex items-center gap-1 ${
                                regionYoyChange > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                <TrendingUp className={`h-3 w-3 ${
                                  regionYoyChange < 0 ? 'rotate-180' : ''
                                }`} />
                                {regionYoyChange > 0 ? '+' : ''}{regionYoyChange.toFixed(1)}%
                              </p>
                            ) : (
                              <p className="text-sm font-bold text-gray-400">N/A</p>
                            )}
                          </div>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredRegions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No regions found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search terms' : `No regional data for ${selectedYear}`}
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

export default RegionalPage
