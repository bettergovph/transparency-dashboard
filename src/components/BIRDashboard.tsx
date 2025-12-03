import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import {
  TrendingUp,
  MapPin,
  Building2,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  Filter,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import Navigation from './Navigation'
import Footer from './Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Type definitions
interface RegionData {
  region: string
  total: number
  count: number
  average: number
}

interface AreaData {
  region: string
  area: string
  total: number
  count: number
  average: number
}

interface MonthlyData {
  year: number
  month: string
  month_num: number
  total: number
  count: number
}

interface YearlyData {
  year: number
  total: number
  count: number
  average: number
}

interface RegionByYearData {
  region: string
  values: { year: number; total: number; count: number }[]
}

interface RegionByMonthData {
  region: string
  months: { month: string; month_num: number; total: number; count: number; average: number }[]
}

interface TopArea {
  rank: number
  region: string
  area: string
  total: number
  count: number
  average: number
}

// Colors for charts
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#f43f5e',
  '#0ea5e9', '#64748b', '#d946ef'
]

const BIRDashboard = () => {
  const [totalByRegion, setTotalByRegion] = useState<RegionData[]>([])
  const [totalByArea, setTotalByArea] = useState<AreaData[]>([])
  const [monthlyTimeSeries, setMonthlyTimeSeries] = useState<MonthlyData[]>([])
  const [totalByYear, setTotalByYear] = useState<YearlyData[]>([])
  const [regionByYear, setRegionByYear] = useState<RegionByYearData[]>([])
  const [regionByMonth, setRegionByMonth] = useState<RegionByMonthData[]>([])
  const [topAreas, setTopAreas] = useState<TopArea[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions')
  const [selectedYear, setSelectedYear] = useState<number>(2024)
  const [topN, setTopN] = useState<number>(10)

  // Available years
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Expanded regions for drill-down
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const [
        regionRes,
        areaRes,
        monthlyRes,
        yearRes,
        regionYearRes,
        regionMonthRes,
        topAreasRes
      ] = await Promise.all([
        fetch('/data/bir/aggregates/total_by_region.json'),
        fetch('/data/bir/aggregates/total_by_area.json'),
        fetch('/data/bir/aggregates/monthly_time_series.json'),
        fetch('/data/bir/aggregates/total_by_year.json'),
        fetch('/data/bir/aggregates/region_by_year.json'),
        fetch('/data/bir/aggregates/region_by_month.json'),
        fetch('/data/bir/aggregates/top_100_areas.json')
      ])

      const regionData = await regionRes.json()
      const areaData = await areaRes.json()
      const monthlyData = await monthlyRes.json()
      const yearData = await yearRes.json()
      const regionYearData = await regionYearRes.json()
      const regionMonthData = await regionMonthRes.json()
      const topAreasData = await topAreasRes.json()

      setTotalByRegion(regionData.data)
      setTotalByArea(areaData.data)
      setMonthlyTimeSeries(monthlyData.data)
      setTotalByYear(yearData.data)
      setRegionByYear(regionYearData.data)
      setRegionByMonth(regionMonthData.data)
      setTopAreas(topAreasData.data)

      const years = yearData.data.map((y: YearlyData) => y.year).sort((a: number, b: number) => b - a)
      setAvailableYears(years)
      if (years.length > 0) {
        setSelectedYear(years[0])
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading BIR data:', error)
      setIsLoading(false)
    }
  }

  // Calculate summary statistics (year-aware)
  const yearData = totalByYear.find(y => y.year === selectedYear)
  const grandTotal = yearData?.total || 0
  const totalRecords = yearData?.count || 0

  const yearRegionData = regionByYear
    .map(r => {
      const yearValue = r.values.find(v => v.year === selectedYear)
      return yearValue ? {
        region: r.region,
        total: yearValue.total,
        count: yearValue.count,
        average: yearValue.total / yearValue.count
      } : null
    })
    .filter((r): r is RegionData => r !== null)
    .sort((a, b) => b.total - a.total)

  const totalRegions = yearRegionData.length
  const totalAreas = totalByArea.length

  const filteredRegionData = selectedRegion === 'All Regions'
    ? yearRegionData
    : yearRegionData.filter(r => r.region === selectedRegion)

  const filteredAreaData = selectedRegion === 'All Regions'
    ? totalByArea.slice(0, topN)
    : totalByArea.filter(a => a.region === selectedRegion).slice(0, topN)

  const yearMonthlyData = monthlyTimeSeries.filter(m => m.year === selectedYear)

  const filteredMonthlyData = selectedRegion === 'All Regions'
    ? yearMonthlyData
    : regionByMonth
      .find(r => r.region === selectedRegion)
      ?.months.map(m => ({
        year: selectedYear,
        month: m.month,
        month_num: m.month_num,
        total: m.total / availableYears.length,
        count: m.count / availableYears.length
      })) || []

  // Format currency (values are in millions, multiply by 1,000,000 to get actual pesos)
  const formatCurrency = (value: number) => {
    const pesos = value * 1_000_000

    if (pesos >= 1_000_000_000_000) {
      const trillions = pesos / 1_000_000_000_000
      return `₱${trillions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}T`
    } else {
      const billions = pesos / 1_000_000_000
      return `₱${billions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
    }
  }

  const formatFullCurrency = (value: number) => {
    const pesos = value * 1_000_000

    if (pesos >= 1_000_000_000_000) {
      const trillions = pesos / 1_000_000_000_000
      return `₱${trillions.toLocaleString('en-PH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}T`
    } else {
      const billions = pesos / 1_000_000_000
      return `₱${billions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
    }
  }

  const formatCurrencyInMillions = (value: number) => {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`
  }

  // Toggle region expansion
  const toggleRegion = (regionName: string) => {
    const newExpanded = new Set(expandedRegions)
    if (newExpanded.has(regionName)) {
      newExpanded.delete(regionName)
    } else {
      newExpanded.add(regionName)
    }
    setExpandedRegions(newExpanded)
  }

  // Get areas for a specific region and year
  const getAreasForRegion = (regionName: string) => {
    return totalByArea
      .filter(a => a.region === regionName)
      .sort((a, b) => b.total - a.total)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading BIR Tax Collection Data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>BIR Tax Collection Dashboard - Transparency Dashboard</title>
        <meta name="description" content="Explore Philippine tax collection data by region, area, and time period. Interactive visualizations for transparency and accountability." />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header with Year Tabs */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    BIR Tax Collection Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Transparency in Philippine Tax Revenue Collection (2020-2024)
                  </p>
                </div>
              </div>

              {/* Year Tabs - Top Right */}
              <div className="hidden lg:flex flex-col items-end shrink-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Select Year</h3>
                <div className="flex gap-2">
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${selectedYear === year
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Year Tabs */}
            <div className="lg:hidden mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Select Year</h3>
              <div className="flex flex-wrap gap-2">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${selectedYear === year
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Data Limitation Notice */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">Data Scope Notice</h3>
                  <p className="text-sm text-amber-800">
                    This data currently <strong>does not include NON-BIR operations collection and tax refunds</strong>.
                    The figures represent BIR tax collections only and may not reflect the complete tax revenue picture.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Cards - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card className="border-l-4 border-l-blue-600">
                <CardHeader className="pb-3">
                  <CardDescription>Total Collection ({selectedYear})</CardDescription>
                  <CardTitle className="text-2xl text-blue-600">
                    {formatFullCurrency(grandTotal)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">
                    {formatCurrencyInMillions(grandTotal)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-600">
                <CardHeader className="pb-3">
                  <CardDescription>Regions Covered</CardDescription>
                  <CardTitle className="text-2xl text-purple-600">
                    {totalRegions}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">
                    Philippine regions
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-600">
                <CardHeader className="pb-3">
                  <CardDescription>Areas/Districts</CardDescription>
                  <CardTitle className="text-2xl text-orange-600">
                    {totalAreas}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">
                    Collection areas
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters - Compact */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Region
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>All Regions</option>
                    {yearRegionData.map(r => (
                      <option key={r.region} value={r.region}>{r.region}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <BarChart3 className="h-3 w-3 inline mr-1" />
                    Top N Areas
                  </label>
                  <select
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={15}>Top 15</option>
                    <option value={20}>Top 20</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Year-over-Year Trend - FIRST */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  Year-over-Year Collection Trend (2020-2024)
                </CardTitle>
                <CardDescription>
                  {selectedRegion === 'All Regions'
                    ? 'National tax collection trend across all regions'
                    : `Tax collection trend for ${selectedRegion}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={selectedRegion === 'All Regions'
                      ? totalByYear
                      : regionByYear
                        .find(r => r.region === selectedRegion)
                        ?.values.sort((a, b) => a.year - b.year) || []
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      strokeWidth={3}
                      name="Total Collection"
                      dot={{ fill: '#6366f1', r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 2. Regional Distribution Pie Chart - LARGER, SECOND */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-purple-600" />
                  Regional Distribution ({selectedYear})
                </CardTitle>
                <CardDescription>
                  Percentage share of total collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={filteredRegionData as any}
                      dataKey="total"
                      nameKey="region"
                      cx="50%"
                      cy="50%"
                      outerRadius={180}
                      label={(entry: any) => `${(entry.total / grandTotal * 100).toFixed(1)}%`}
                      labelLine={{ stroke: '#666', strokeWidth: 1 }}
                    >
                      {filteredRegionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 3. Regional Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Tax Collection by Region ({selectedYear})
                </CardTitle>
                <CardDescription>
                  Total tax revenue collected across Philippine regions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={filteredRegionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="region"
                      angle={-45}
                      textAnchor="end"
                      height={150}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="total"
                      fill="#3b82f6"
                      name="Total Collection"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 4. Monthly Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Monthly Collection Trend ({selectedYear})
                </CardTitle>
                <CardDescription>
                  {selectedRegion === 'All Regions'
                    ? 'Month-by-month tax collection'
                    : `Monthly collection for ${selectedRegion}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={filteredMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Total Collection"
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 5. Top Areas */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  Top {topN} Areas by Collection ({selectedYear})
                </CardTitle>
                <CardDescription>
                  {selectedRegion === 'All Regions'
                    ? `Highest collecting areas nationwide`
                    : `Top areas in ${selectedRegion}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={filteredAreaData}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="area"
                      width={150}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      fill="#f59e0b"
                      name="Total Collection"
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>

          {/* Data Table */}
          <Card className="mt-6">
            <CardHeader>
              <div>
                <CardTitle>Regional Summary Table ({selectedYear})</CardTitle>
                <CardDescription>Detailed breakdown of collections by region - Click to expand areas</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region / Area</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Collection</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Records</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Average</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRegionData.map((region, index) => {
                      const isExpanded = expandedRegions.has(region.region)
                      const areas = getAreasForRegion(region.region)

                      return (
                        <>
                          {/* Region Row */}
                          <tr
                            key={region.region}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => toggleRegion(region.region)}
                          >
                            <td className="px-4 py-3 text-sm">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-500">#{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{region.region}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-green-600 font-semibold">
                              {formatCurrencyInMillions(region.total)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">
                              {region.count.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">
                              {formatCurrency(region.average)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">
                              {((region.total / grandTotal) * 100).toFixed(2)}%
                            </td>
                          </tr>

                          {/* Area Rows (Expanded) */}
                          {isExpanded && areas.map((area, areaIndex) => (
                            <tr
                              key={`${region.region}-${area.area}`}
                              className="bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2 text-xs font-mono text-gray-400">
                                {index + 1}.{areaIndex + 1}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-700 pl-8">
                                <span className="text-gray-400 mr-2">└</span>
                                {area.area}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-mono text-green-600">
                                {formatCurrencyInMillions(area.total)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">
                                {area.count.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">
                                {formatCurrency(area.average)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">
                                {((area.total / grandTotal) * 100).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 font-semibold">
                    <tr>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-600">
                        {formatCurrencyInMillions(grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {totalRecords.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">
                        {formatCurrency(grandTotal / totalRecords)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">100.00%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <Footer />
    </>
  )
}

export default BIRDashboard
