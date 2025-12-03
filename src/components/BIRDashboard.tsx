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
  ChevronRight,
  Menu,
  X,
  Download
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

interface AreaByYearData {
  region: string
  area: string
  year: number
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

interface GAARegionData {
  region: string
  gaa: number
}

interface GAAYearData {
  year: number
  regions: GAARegionData[]
  total: number
}

interface GAAData {
  metadata: {
    title: string
    description: string
    generated_at: string
    years_covered: string
    total_years: number
    source: string
    note: string
  }
  data: GAAYearData[]
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
  const [areaByYear, setAreaByYear] = useState<AreaByYearData[]>([])
  const [monthlyTimeSeries, setMonthlyTimeSeries] = useState<MonthlyData[]>([])
  const [totalByYear, setTotalByYear] = useState<YearlyData[]>([])
  const [regionByYear, setRegionByYear] = useState<RegionByYearData[]>([])
  const [regionByMonth, setRegionByMonth] = useState<RegionByMonthData[]>([])
  const [topAreas, setTopAreas] = useState<TopArea[]>([])
  const [gaaData, setGaaData] = useState<GAAData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions')
  const [selectedYear, setSelectedYear] = useState<number>(2024)
  const [topN, setTopN] = useState<number>(10)

  // Available years
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Expanded regions for drill-down
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Auto-expand selected region in table when viewing a specific region
  useEffect(() => {
    if (selectedRegion !== 'All Regions') {
      setExpandedRegions(new Set([selectedRegion]))
    } else {
      setExpandedRegions(new Set())
    }
  }, [selectedRegion])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const [
        regionRes,
        areaRes,
        areaYearRes,
        monthlyRes,
        yearRes,
        regionYearRes,
        regionMonthRes,
        topAreasRes,
        gaaRes
      ] = await Promise.all([
        fetch('/data/bir/aggregates/total_by_region.json'),
        fetch('/data/bir/aggregates/total_by_area.json'),
        fetch('/data/bir/aggregates/area_by_year.json'),
        fetch('/data/bir/aggregates/monthly_time_series.json'),
        fetch('/data/bir/aggregates/total_by_year.json'),
        fetch('/data/bir/aggregates/region_by_year.json'),
        fetch('/data/bir/aggregates/region_by_month.json'),
        fetch('/data/bir/aggregates/top_100_areas.json'),
        fetch('/data/bir/aggregates/gaa_by_region.json')
      ])

      const regionData = await regionRes.json()
      const areaData = await areaRes.json()
      const areaYearData = await areaYearRes.json()
      const monthlyData = await monthlyRes.json()
      const yearData = await yearRes.json()
      const regionYearData = await regionYearRes.json()
      const regionMonthData = await regionMonthRes.json()
      const topAreasData = await topAreasRes.json()
      const gaaDataRes = await gaaRes.json()

      setTotalByRegion(regionData.data)
      setTotalByArea(areaData.data)
      setAreaByYear(areaYearData.data)
      setMonthlyTimeSeries(monthlyData.data)
      setTotalByYear(yearData.data)
      setRegionByYear(regionYearData.data)
      setRegionByMonth(regionMonthData.data)
      setTopAreas(topAreasData.data)
      setGaaData(gaaDataRes)

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

  // Region-specific data when a region is selected
  const selectedRegionData = regionByYear.find(r => r.region === selectedRegion)
  const regionYearValue = selectedRegionData?.values.find(v => v.year === selectedYear)
  const regionTotal = regionYearValue?.total || 0
  const regionRecords = regionYearValue?.count || 0

  // Get GAA (National Budget) for selected region and year
  const getGAAForRegion = (region: string, year: number): number => {
    if (!gaaData) return 0
    const yearData = gaaData.data.find(d => d.year === year)
    if (!yearData) return 0
    const regionData = yearData.regions.find(r => r.region === region)
    return regionData?.gaa || 0
  }

  // Get total national GAA for selected year
  const getNationalGAA = (year: number): number => {
    if (!gaaData) return 0
    const yearData = gaaData.data.find(d => d.year === year)
    return yearData?.total || 0
  }

  const regionGAA = getGAAForRegion(selectedRegion, selectedYear)
  const nationalGAA = getNationalGAA(selectedYear)
  const collectionEfficiency = regionGAA > 0 ? (regionTotal / (regionGAA / 1_000_000)) * 100 : 0

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

  const formatRawCurrency = (value: number) => {
    const pesos = value

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

  // Format currency in billions for table display
  const formatCurrencyInBillions = (value: number) => {
    const billions = (value * 1_000_000) / 1_000_000_000
    return `₱${billions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
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
    return areaByYear
      .filter(a => a.region === regionName && a.year === selectedYear)
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

  // Download CSV function
  const downloadCSV = () => {
    // Get data for selected year
    const yearData = selectedRegion === 'All Regions'
      ? regionByYear.map(r => {
        const yearValue = r.values.find(v => v.year === selectedYear)
        return {
          region: r.region,
          year: selectedYear,
          total: yearValue?.total || 0,
          count: yearValue?.count || 0
        }
      }).filter(d => d.total > 0)
      : areaByYear.filter(a => a.region === selectedRegion && a.year === selectedYear)

    // Create CSV content
    let csvContent = ''

    if (selectedRegion === 'All Regions') {
      // National view - regions data
      csvContent = 'Region,Year,Total Collection (Millions),Number of Records\n'
      yearData.forEach((row: any) => {
        csvContent += `"${row.region}",${row.year},${row.total.toFixed(2)},${row.count}\n`
      })
    } else {
      // Regional view - areas data
      csvContent = 'Region,Area,Year,Total Collection (Millions),Number of Records,Average\n'
      yearData.forEach((row: any) => {
        csvContent += `"${row.region}","${row.area}",${row.year},${row.total.toFixed(2)},${row.count},${row.average.toFixed(2)}\n`
      })
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    const filename = selectedRegion === 'All Regions'
      ? `BIR_Tax_Collection_All_Regions_${selectedYear}.csv`
      : `BIR_Tax_Collection_${selectedRegion.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedYear}.csv`
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        <div className="flex">
          {/* Mobile Sidebar Backdrop */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Sidebar - Region Navigation */}
          <aside
            className={`
              fixed lg:sticky top-0 z-30 lg:z-0
              w-64 bg-white border-r border-gray-200 h-screen
              overflow-y-auto
              transition-transform duration-300 ease-in-out
              lg:translate-x-0
              ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }
            `}
          >
            {/* Mobile Close Button */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Filter by Region</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 hidden lg:block">Filter by Region</h3>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedRegion('All Regions')
                    setIsMobileSidebarOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedRegion === 'All Regions'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Regions</span>
                    <span className="text-xs opacity-75">{yearRegionData.length}</span>
                  </div>
                </button>

                <div className="border-t border-gray-200 my-2"></div>

                {yearRegionData.map((region, index) => {
                  const isSelected = selectedRegion === region.region
                  return (
                    <button
                      key={region.region}
                      onClick={() => {
                        setSelectedRegion(region.region)
                        setIsMobileSidebarOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono opacity-75">#{index + 1}</span>
                        <span className="flex-1 truncate">{region.region}</span>
                      </div>
                      <div className="text-xs mt-1 opacity-75">
                        {formatCurrency(region.total)}
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Sticky Header with Title and Year Tabs */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between gap-4 max-w-[1800px] mx-auto">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Mobile Menu Button */}
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                      aria-label="Open region menu"
                    >
                      <Menu className="h-5 w-5 text-gray-600" />
                    </button>

                    <div className="p-3 bg-blue-600 rounded-lg shrink-0">
                      <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                        {selectedRegion === 'All Regions'
                          ? 'BIR Tax Collection Dashboard'
                          : `${selectedRegion} - ${selectedYear}`
                        }
                      </h1>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                        {selectedRegion === 'All Regions'
                          ? 'Philippine Tax Revenue Collection (2020-2024)'
                          : `Regional breakdown for ${selectedYear}`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Year Tabs */}
                  <div className="hidden lg:flex flex-col items-end shrink-0">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Select Year</h3>
                    <div className="flex gap-2 items-center">
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
                      <button
                        onClick={downloadCSV}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg flex items-center gap-2"
                        title={`Download ${selectedYear} data as CSV`}
                      >
                        <Download className="h-4 w-4" />
                        CSV
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Year Tabs */}
                <div className="lg:hidden mt-4 max-w-[1800px] mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Select Year</h3>
                    <button
                      onClick={downloadCSV}
                      className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-green-600 text-white hover:bg-green-700 transition-all shadow flex items-center gap-1.5"
                      title={`Download ${selectedYear} data as CSV`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  </div>
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
              </div>
            </div>

            {/* Content Area with Padding */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">

              {/* Data Limitation Notice */}
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg max-w-[1800px] mx-auto">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900 mb-1">Data Scope Notice</h3>
                    <p className="text-sm text-amber-800 mb-2">
                      This data currently <strong>does not include NON-BIR operations collection and tax refunds</strong>.
                      The figures represent BIR tax collections only and may not reflect the complete tax revenue picture.
                    </p>
                    <p className="text-sm text-amber-800">
                      <strong>Large Taxpayers Service (LTS):</strong> The LTS has been categorized as a separate region in this dashboard.
                      While LTS operations are primarily headquartered in the National Capital Region, they serve major corporations
                      and high-value taxpayers nationwide. Due to the current limitations in available data granularity,
                      geographic distribution details for LTS collections are not readily accessible and are therefore presented as a distinct entity.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Cards - Different for National vs Regional View */}
              {selectedRegion === 'All Regions' ? (
                // National Overview Cards
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 max-w-[1800px] mx-auto">
                  <Card className="border-l-4 border-l-blue-600">
                    <CardHeader className="pb-3">
                      <CardDescription>Total National Collection ({selectedYear})</CardDescription>
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
                      <CardDescription>Total Collection Areas</CardDescription>
                      <CardTitle className="text-2xl text-orange-600">
                        {totalAreas}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">
                        Collection districts
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Regional Specific Cards
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-4 max-w-[1800px] mx-auto">
                  <Card className="border-l-4 border-l-blue-600">
                    <CardHeader className="pb-3">
                      <CardDescription>{selectedRegion}</CardDescription>
                      <CardTitle className="text-2xl text-blue-600">
                        {formatFullCurrency(regionTotal)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">
                        {formatCurrencyInMillions(regionTotal)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-amber-600">
                    <CardHeader className="pb-3">
                      <CardDescription>Regional Budget (GAA)</CardDescription>
                      <CardTitle className="text-2xl text-amber-600">
                        {formatRawCurrency(regionGAA)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">
                        {formatCurrencyInMillions(regionGAA)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`border-l-4 ${collectionEfficiency === 0 ? 'border-l-gray-400' : collectionEfficiency < 50 ? 'border-l-red-600' : 'border-l-green-600'}`}>
                    <CardHeader className="pb-3">
                      <CardDescription>Collection Efficiency</CardDescription>
                      <CardTitle className={`text-2xl ${collectionEfficiency === 0 ? 'text-gray-400' : collectionEfficiency < 50 ? 'text-red-600' : 'text-green-600'}`}>
                        {collectionEfficiency === 0 ? 'To follow' : `${collectionEfficiency.toFixed(2)}%`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">
                        Tax vs Budget ratio
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-600">
                    <CardHeader className="pb-3">
                      <CardDescription>Share of National</CardDescription>
                      <CardTitle className="text-2xl text-purple-600">
                        {((regionTotal / grandTotal) * 100).toFixed(2)}%
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">
                        Regional contribution
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-600">
                    <CardHeader className="pb-3">
                      <CardDescription>Collection Areas</CardDescription>
                      <CardTitle className="text-2xl text-orange-600">
                        {areaByYear.filter(a => a.region === selectedRegion && a.year === selectedYear).length}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">
                        Districts in region
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}


              {/* Charts Grid - Different for National vs Regional View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto">

                {/* 1. Year-over-Year Trend - FIRST */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      {selectedRegion === 'All Regions'
                        ? 'National Year-over-Year Collection Trend vs GAA Budget (2020-2024)'
                        : `${selectedRegion} - Year-over-Year Trend vs GAA Budget (2020-2024)`
                      }
                    </CardTitle>
                    <CardDescription>
                      {selectedRegion === 'All Regions'
                        ? 'Tax collection vs national budget allocation trend'
                        : `Tax collection vs regional budget allocation for ${selectedRegion}`
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart
                        data={selectedRegion === 'All Regions'
                          ? totalByYear.map(d => ({
                            year: d.year,
                            total: d.total,
                            gaa: gaaData ? (gaaData.data.find(g => g.year === d.year)?.total || 0) / 1_000_000 : 0,
                            count: d.count
                          }))
                          : [...(regionByYear
                            .find(r => r.region === selectedRegion)
                            ?.values || [])].sort((a, b) => a.year - b.year).map(d => ({
                              year: d.year,
                              total: d.total,
                              gaa: getGAAForRegion(selectedRegion, d.year) / 1_000_000,
                              count: d.count
                            }))
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
                          name="Tax Collection"
                          dot={{ fill: '#6366f1', r: 6 }}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="gaa"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          name="GAA Budget"
                          dot={{ fill: '#f59e0b', r: 6 }}
                          activeDot={{ r: 8 }}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Regional Distribution Pie Chart - Only for National View */}
                {selectedRegion === 'All Regions' && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-purple-600" />
                        Regional Distribution ({selectedYear})
                      </CardTitle>
                      <CardDescription>
                        Percentage share of total national collection
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
                )}

                {/* Monthly Breakdown - Only for Regional View */}
                {selectedRegion !== 'All Regions' && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        Monthly Collection Pattern ({selectedYear})
                      </CardTitle>
                      <CardDescription>
                        Monthly tax collection for {selectedRegion}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          data={[...(regionByMonth
                            .find(r => r.region === selectedRegion)
                            ?.months || [])].sort((a, b) => a.month_num - b.month_num)}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="month"
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
                            fill="#10b981"
                            name="Monthly Collection"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* 3. Regional Bar Chart - Only for National View */}
                {selectedRegion === 'All Regions' && (
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
                )}

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
              <Card className="mt-6 max-w-[1800px] mx-auto">
                <CardHeader>
                  <div>
                    <CardTitle>Regional Summary Table ({selectedYear})</CardTitle>
                    <CardDescription>
                      Detailed breakdown of collections by region - Click to expand areas
                      <span className="ml-2 text-xs font-semibold text-amber-600">(Numbers in Billions)</span>
                    </CardDescription>
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
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax Collection</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GAA Budget</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRegionData.map((region, index) => {
                          const isExpanded = expandedRegions.has(region.region)
                          const areas = getAreasForRegion(region.region)
                          const regionGAAValue = getGAAForRegion(region.region, selectedYear)
                          const regionEfficiency = regionGAAValue > 0 ? (region.total / (regionGAAValue / 1_000_000)) * 100 : 0

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
                                  {formatCurrencyInBillions(region.total)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-mono text-amber-600">
                                  {formatRawCurrency(regionGAAValue)}
                                </td>
                                <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${regionEfficiency === 0 ? 'text-gray-400' :
                                    regionEfficiency < 50 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                  {regionEfficiency === 0 ? 'To follow' : `${regionEfficiency.toFixed(2)}%`}
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
                                    {formatCurrencyInBillions(area.total)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right font-mono text-gray-400">
                                    —
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right font-mono text-gray-400">
                                    —
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
                            {formatCurrencyInBillions(grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-gray-400">
                            —
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-gray-400">
                            —
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">100.00%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

            </div>
          </main>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default BIRDashboard
