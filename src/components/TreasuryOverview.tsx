import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  X,
  Menu
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import Navigation from './Navigation'
import Footer from './Footer'
import { Card, CardContent } from '@/components/ui/card'

interface TreasuryRecord {
  year: number
  month: string
  category: string
  subcategory: string
  line_item: string
  value: number
}

interface LineItemTrend {
  name: string
  data: { year: number; total: number }[]
}

interface ChartDataPoint {
  year: number
  [key: string]: string | number
}

interface RevenueSubcategory {
  name: string
  lineItems: LineItemTrend[]
  chartData: ChartDataPoint[]
  latestTotals: { name: string; total: number }[]
  total: number
}

interface LineItemRow {
  category: string
  subcategory: string
  line_item: string
  total: number
}

interface SpecificItemConfig {
  label: string
  category: string
  subcategory: string
  line_item: string
  color: string
}

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

const TreasuryOverview = () => {
  const [data, setData] = useState<TreasuryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [latestYear, setLatestYear] = useState<number>(2024)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['rev-0']))
  const [selectedLineItem, setSelectedLineItem] = useState<LineItemRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<SpecificItemConfig | null>(null)
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSections(newExpanded)
  }

  const handleLineItemClick = (category: string, subcategory: string, lineItem: string, total: number) => {
    setSelectedLineItem({ category, subcategory, line_item: lineItem, total })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedLineItem(null)
  }

  const handleMetricClick = (config: SpecificItemConfig) => {
    setSelectedMetric(config)
    setIsMetricModalOpen(true)
  }

  const closeMetricModal = () => {
    setIsMetricModalOpen(false)
    setSelectedMetric(null)
  }

  const getHistoricalData = (row: LineItemRow) => {
    const availableYears = [...new Set(data.map(r => r.year))].sort((a, b) => a - b)
    const historicalData: { year: number; total: number }[] = []

    availableYears.forEach(year => {
      const yearData = data.filter(r =>
        r.year === year &&
        r.category === row.category &&
        r.subcategory === row.subcategory &&
        r.line_item === row.line_item
      )

      const total = yearData.reduce((sum, r) => sum + r.value, 0)
      if (total !== 0) {
        historicalData.push({ year, total })
      }
    })

    return historicalData
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/data/treasury/cor_data.csv')
      const csvText = await response.text()

      const lines = csvText.split('\n')
      const records: TreasuryRecord[] = []
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        const values = lines[i].split(',')
        if (values.length >= 6) {
          records.push({
            year: parseInt(values[0]),
            month: values[1],
            category: values[2],
            subcategory: values[3] || '',
            line_item: values[4] || '',
            value: parseFloat(values[5]) || 0
          })
        }
      }

      setData(records)
      const years = [...new Set(records.map(r => r.year))].sort((a, b) => b - a)
      setAvailableYears(years)
      if (years.length > 0) setLatestYear(years[0])
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading treasury data:', error)
      setIsLoading(false)
    }
  }

  const convertToChartData = (trends: LineItemTrend[]): ChartDataPoint[] => {
    const allYears = new Set<number>()
    trends.forEach(trend => trend.data.forEach(d => allYears.add(d.year)))
    const sortedYears = Array.from(allYears).sort((a, b) => a - b)

    return sortedYears.map(year => {
      const point: ChartDataPoint = { year }
      trends.forEach(trend => {
        const yearData = trend.data.find(d => d.year === year)
        point[trend.name] = yearData?.total || 0
      })
      return point
    })
  }

  const getLineItemTrends = (category: string, subcategory?: string): LineItemTrend[] => {
    const filteredData = data.filter(r => {
      if (subcategory === '') return r.category === category && r.subcategory === '' && r.line_item !== ''
      if (subcategory) return r.category === category && r.subcategory === subcategory && r.line_item !== ''
      return r.category === category && r.subcategory !== '' && r.line_item === ''
    })

    const items = [...new Set(filteredData.map(r => subcategory ? r.line_item : r.subcategory))]
    const years = [...new Set(data.map(r => r.year))].sort((a, b) => a - b)

    return items.map(item => {
      const itemData = years.map(year => {
        const yearData = data.filter(r => {
          if (subcategory === '') return r.year === year && r.category === category && r.subcategory === '' && r.line_item === item
          if (subcategory) return r.year === year && r.category === category && r.subcategory === subcategory && r.line_item === item
          return r.year === year && r.category === category && r.subcategory === item && r.line_item === ''
        })
        const total = yearData.reduce((sum, r) => sum + r.value, 0)
        return { year, total }
      }).filter(d => d.total > 0)

      return { name: item, data: itemData }
    }).filter(item => item.data.length > 0)
  }

  const getLatestYearTotals = (category: string, subcategory?: string) => {
    const filteredData = data.filter(r => {
      if (subcategory === '') return r.year === latestYear && r.category === category && r.subcategory === '' && r.line_item !== ''
      if (subcategory) return r.year === latestYear && r.category === category && r.subcategory === subcategory && r.line_item !== ''
      return r.year === latestYear && r.category === category && r.subcategory !== '' && r.line_item === ''
    })

    const items = [...new Set(filteredData.map(r => subcategory ? r.line_item : r.subcategory))]
    return items.map(item => {
      const total = filteredData
        .filter(r => subcategory ? r.line_item === item : r.subcategory === item)
        .reduce((sum, r) => sum + r.value, 0)
      return { name: item, total }
    }).sort((a, b) => b.total - a.total)
  }

  const formatCurrency = (value: number) => {
    const millions = value / 1000
    if (millions >= 1000) return `₱${(millions / 1000).toFixed(1)}T`
    return `₱${millions.toFixed(1)}B`
  }

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Get all revenue subcategories
  const revenueSubcategories = [...new Set(data.filter(r => r.category === 'Revenues' && r.subcategory !== '').map(r => r.subcategory))]
  const revenueData: RevenueSubcategory[] = revenueSubcategories.map(subcat => {
    const lineItems = getLineItemTrends('Revenues', subcat)
    const chartData = convertToChartData(lineItems)
    const latestTotals = getLatestYearTotals('Revenues', subcat)
    const total = latestTotals.reduce((sum, item) => sum + item.total, 0)
    return { name: subcat, lineItems, chartData, latestTotals, total }
  })

  // Specific line items to expose as individual charts
  const specificItems: SpecificItemConfig[] = [
    { label: 'BIR', category: 'Revenues', subcategory: 'Tax Revenues', line_item: 'BIR', color: '#3b82f6' },
    { label: 'BOC', category: 'Revenues', subcategory: 'Tax Revenues', line_item: 'BOC', color: '#10b981' },
    { label: 'Allotment to LGUs', category: 'Expenditures', subcategory: '', line_item: 'Allotment to LGUs', color: '#f59e0b' },
    { label: 'Interest Payments', category: 'Expenditures', subcategory: '', line_item: 'Interest Payments', color: '#ef4444' },
    { label: 'Tax Expenditures', category: 'Expenditures', subcategory: '', line_item: 'Tax Expenditures', color: '#8b5cf6' },
    { label: 'Subsidy', category: 'Expenditures', subcategory: '', line_item: 'Subsidy', color: '#ec4899' },
    { label: 'External Financing', category: 'Financing', subcategory: 'External (Net)', line_item: '', color: '#06b6d4' },
    { label: 'Domestic Financing', category: 'Financing', subcategory: 'Domestic (Net)', line_item: '', color: '#84cc16' },
    { label: 'Surplus/(-)Deficit', category: 'Surplus/(-)Deficit', subcategory: '', line_item: '', color: '#6366f1' },
  ]

  // Helper to match category with variations (e.g., Surplus/(-)Deficit vs Surplus/(Deficit))
  const matchCategory = (recordCategory: string, configCategory: string) => {
    if (recordCategory === configCategory) return true
    // Handle Surplus/Deficit variations
    if (configCategory === 'Surplus/(-)Deficit') {
      return recordCategory === 'Surplus/(-)Deficit' || recordCategory === 'Surplus/(Deficit)'
    }
    return false
  }

  const getSpecificItemTrend = (config: SpecificItemConfig) => {
    const years = [...new Set(data.map(r => r.year))].sort((a, b) => a - b)
    return years.map(year => {
      const yearData = data.filter(r => {
        if (config.line_item) {
          return r.year === year && matchCategory(r.category, config.category) && r.subcategory === config.subcategory && r.line_item === config.line_item
        } else if (config.subcategory) {
          return r.year === year && matchCategory(r.category, config.category) && r.subcategory === config.subcategory && r.line_item === ''
        } else {
          return r.year === year && matchCategory(r.category, config.category) && r.subcategory === '' && r.line_item === ''
        }
      })
      const total = yearData.reduce((sum, r) => sum + r.value, 0)
      return { year, total }
    }).filter(d => d.total !== 0 || config.category === 'Surplus/(-)Deficit')
  }

  const getSpecificItemLatestTotal = (config: SpecificItemConfig) => {
    const latestData = data.filter(r => {
      if (config.line_item) {
        return r.year === latestYear && matchCategory(r.category, config.category) && r.subcategory === config.subcategory && r.line_item === config.line_item
      } else if (config.subcategory) {
        return r.year === latestYear && matchCategory(r.category, config.category) && r.subcategory === config.subcategory && r.line_item === ''
      } else {
        return r.year === latestYear && matchCategory(r.category, config.category) && r.subcategory === '' && r.line_item === ''
      }
    })
    return latestData.reduce((sum, r) => sum + r.value, 0)
  }

  const expenditureLineItems = getLineItemTrends('Expenditures', '')
  const expenditureChartData = convertToChartData(expenditureLineItems)
  const expenditureLatestTotals = getLatestYearTotals('Expenditures', '')
  const totalExpenditures = expenditureLatestTotals.reduce((sum, item) => sum + item.total, 0)

  return (
    <>
      <Helmet>
        <title>Treasury Dashboard - Philippine Government Cash Operations</title>
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* Mobile Sidebar Backdrop */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Sidebar - Year Navigation */}
          <aside
            className={`
              fixed lg:sticky top-0 z-30 lg:z-0
              w-64 bg-white border-r border-gray-200 h-screen
              overflow-y-auto
              transition-transform duration-300 ease-in-out
              lg:translate-x-0
              ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            {/* Mobile Close Button */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Browse by Year</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Overview</p>
                <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
                  All Years (1986–{latestYear})
                </div>
              </div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Browse by Year</h3>
              <nav className="space-y-1">
                {availableYears.map((year) => (
                  <Link
                    key={year}
                    to={`/treasury/year/${year}`}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    {year}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                  >
                    <Menu className="h-5 w-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Treasury Cash Operations</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Historical Data from 1986 to {latestYear}</p>
                  </div>
                </div>
              </div>
            </div>

        {/* Key Metrics Charts */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Key Fiscal Metrics</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Click any chart to view detailed historical data</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">1986–{latestYear}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {specificItems.map((config) => {
              const trendData = getSpecificItemTrend(config)
              const latestTotal = getSpecificItemLatestTotal(config)
              const isNegativeAllowed = config.category === 'Surplus/(-)Deficit' || config.category === 'Financing'
              return (
                <Card
                  key={config.label}
                  className="bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleMetricClick(config)}
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{config.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${latestTotal < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {latestTotal < 0 ? '-' : ''}{formatCurrency(Math.abs(latestTotal))}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {config.category}{config.subcategory ? ` › ${config.subcategory}` : ''}
                    </p>
                  </div>
                  <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <XAxis
                          dataKey="year"
                          type="number"
                          scale="linear"
                          domain={['dataMin', 'dataMax']}
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          tickFormatter={(v) => `'${v.toString().slice(-2)}`}
                          interval="preserveStartEnd"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => {
                            const abs = Math.abs(v)
                            if (abs >= 1000) return `${(v / 1000).toFixed(0)}T`
                            return `${v.toFixed(0)}B`
                          }}
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          width={32}
                          domain={isNegativeAllowed ? ['auto', 'auto'] : [0, 'auto']}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload?.length) {
                              const value = payload[0].value as number
                              return (
                                <div className="bg-gray-900 text-white rounded-md shadow-lg px-2.5 py-1.5 text-xs">
                                  <p className="font-medium">{label}</p>
                                  <p className="font-bold">
                                    {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Line
                          dataKey="total"
                          stroke={config.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Main Content - Full Width */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenues Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                  <h2 className="text-base font-semibold text-gray-900">Revenue Breakdown</h2>
                  <span className="text-xs text-gray-400 ml-auto">{revenueData.length} categories</span>
                </div>

              {revenueData.map((category, catIndex) => {
                const isExpanded = expandedSections.has(`rev-${catIndex}`)
                return (
                  <Card key={category.name} className="border border-gray-100">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSection(`rev-${catIndex}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: LINE_COLORS[catIndex % LINE_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-900">{category.name}</span>
                        <span className="text-xs text-gray-400">{formatCurrency(category.total)}</span>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>

                    {isExpanded && (
                      <CardContent className="pt-0 px-3 pb-3">
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={category.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#f3f4f6" vertical={false} />
                            <XAxis
                              dataKey="year"
                              type="number"
                              scale="linear"
                              domain={[1986, latestYear]}
                              tick={{ fontSize: 9, fill: '#9ca3af' }}
                              tickFormatter={(v) => v.toString().slice(-2)}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tickFormatter={(v) => `${(v / 1000).toFixed(0)}T`}
                              tick={{ fontSize: 9, fill: '#9ca3af' }}
                              width={40}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload?.length) {
                                  return (
                                    <div className="bg-white border border-gray-100 rounded-md shadow-lg p-2 text-xs">
                                      <p className="font-medium text-gray-900 mb-1">{label}</p>
                                      {payload
                                        .filter((e: any) => e.value > 0)
                                        .sort((a: any, b: any) => b.value - a.value)
                                        .map((entry: any, i: number) => (
                                          <div key={i} className="flex justify-between gap-3 text-xs">
                                            <span style={{ color: entry.color }}>{entry.name}</span>
                                            <span className="font-medium">{formatCurrency(entry.value)}</span>
                                          </div>
                                        ))}
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            {category.lineItems.map((item, index) => (
                              <Line
                                key={item.name}
                                dataKey={item.name}
                                name={item.name}
                                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                                strokeWidth={1.5}
                                dot={false}
                                activeDot={{ r: 3 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>

                        <div className="space-y-1 mt-2">
                          {category.latestTotals.map((item, index) => {
                            const pct = ((item.total / category.total) * 100).toFixed(1)
                            return (
                              <div
                                key={item.name}
                                className="flex items-center justify-between py-1 text-xs border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 transition-colors"
                                onClick={() => handleLineItemClick('Revenues', category.name, item.name, item.total)}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                                  />
                                  <span className="text-gray-600 truncate">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <span className="text-gray-400 w-8 text-right">{pct}%</span>
                                  <span className="font-medium text-gray-900 w-16 text-right">{formatCurrency(item.total)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
              </div>

              {/* Expenditures Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-red-500 rounded-full"></div>
                  <h2 className="text-base font-semibold text-gray-900">Expenditure Breakdown</h2>
                  <span className="text-xs text-gray-400 ml-auto">{expenditureLineItems.length} categories</span>
                </div>

              <Card className="border border-gray-100">
                <CardContent className="p-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={expenditureChartData} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="year"
                        type="number"
                        scale="linear"
                        domain={[1986, latestYear]}
                        tick={{ fontSize: 9, fill: '#9ca3af' }}
                        tickFormatter={(v) => v.toString().slice(-2)}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}T`}
                        tick={{ fontSize: 9, fill: '#9ca3af' }}
                        width={40}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload?.length) {
                            return (
                              <div className="bg-white border border-gray-100 rounded-md shadow-lg p-2 text-xs">
                                <p className="font-medium text-gray-900 mb-1">{label}</p>
                                {payload
                                  .filter((e: any) => e.value > 0)
                                  .sort((a: any, b: any) => b.value - a.value)
                                  .map((entry: any, i: number) => (
                                    <div key={i} className="flex justify-between gap-3 text-xs">
                                      <span style={{ color: entry.color }}>{entry.name}</span>
                                      <span className="font-medium">{formatCurrency(entry.value)}</span>
                                    </div>
                                  ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      {expenditureLineItems.map((item, index) => (
                        <Line
                          key={item.name}
                          dataKey={item.name}
                          name={item.name}
                          stroke={LINE_COLORS[index % LINE_COLORS.length]}
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expenditure Categories List */}
              <Card className="border border-gray-100">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Breakdown ({latestYear})</p>
                </div>
                <div className="p-3 space-y-1">
                  {expenditureLatestTotals.map((item, index) => {
                    const pct = ((item.total / totalExpenditures) * 100).toFixed(1)
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 transition-colors"
                        onClick={() => handleLineItemClick('Expenditures', '', item.name, item.total)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                          />
                          <span className="text-sm text-gray-600 truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-2">
                          <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                          <span className="text-sm font-medium text-gray-900 w-20 text-right">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
              </div>
            </div>
          </div>
        </div>
          </main>
        </div>
      </div>

      <Footer />

      {/* Metric Detail Modal */}
      {isMetricModalOpen && selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={closeMetricModal}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedMetric.color }}
                  />
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedMetric.label}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedMetric.category}{selectedMetric.subcategory ? ` › ${selectedMetric.subcategory}` : ''} • 1986–{latestYear}
                </p>
              </div>
              <button
                onClick={closeMetricModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {/* Large Historical Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getSpecificItemTrend(selectedMetric)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(v) => {
                        const abs = Math.abs(v)
                        if (abs >= 1000) return `₱${(v / 1000).toFixed(1)}T`
                        return `₱${v.toFixed(0)}B`
                      }}
                      tick={{ fontSize: 12 }}
                      width={80}
                      domain={selectedMetric.category === 'Surplus/(-)Deficit' || selectedMetric.category === 'Financing' ? ['auto', 'auto'] : [0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0].value as number
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-gray-900">{label}</p>
                              <p className={`text-lg font-bold ${value < 0 ? 'text-red-600' : ''}`} style={{ color: value >= 0 ? selectedMetric.color : undefined }}>
                                {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
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
                      stroke={selectedMetric.color}
                      strokeWidth={3}
                      name={selectedMetric.label}
                      dot={{ fill: selectedMetric.color, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Yearly Values</h3>
                <div className="overflow-x-auto max-h-64">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSpecificItemTrend(selectedMetric).slice().reverse().map((item) => (
                        <tr key={item.year} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{item.year}</td>
                          <td className={`px-4 py-2 text-right font-mono font-semibold ${item.total < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.total < 0 ? '-' : ''}{formatCurrency(Math.abs(item.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Trend Modal */}
      {isModalOpen && selectedLineItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedLineItem.line_item || selectedLineItem.subcategory || selectedLineItem.category}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Historical Trend Across All Years
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {/* Breadcrumb */}
              <div className="mb-4 text-sm text-gray-600">
                {selectedLineItem.category}
                {selectedLineItem.subcategory && (
                  <>
                    <span className="mx-2">→</span>
                    {selectedLineItem.subcategory}
                  </>
                )}
                {selectedLineItem.line_item && (
                  <>
                    <span className="mx-2">→</span>
                    <span className="font-semibold text-gray-900">{selectedLineItem.line_item}</span>
                  </>
                )}
              </div>

              {/* Historical Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={getHistoricalData(selectedLineItem)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-gray-900">{label}</p>
                              <p className="text-sm text-gray-700">{formatCurrency(payload[0].value as number)}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Total"
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Yearly Values</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getHistoricalData(selectedLineItem).map((item) => (
                        <tr key={item.year} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{item.year}</td>
                          <td className="px-4 py-2 text-right font-mono text-gray-900 font-semibold">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TreasuryOverview
