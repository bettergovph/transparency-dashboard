import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  AlertCircle,
  Menu,
  X,
  Download,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import Navigation from './Navigation'
import Footer from './Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Type definitions
interface LineItemAggregate {
  category: string
  subcategory: string
  line_item: string
  total: number
}

interface AggregateMetadata {
  title: string
  source: string
  description: string
  generated_at: string
  date_range: {
    start_year: number
    end_year: number
    total_years: number
  }
  total_line_items: number
  scale: string
  note: string
  category_summary: {
    category: string
    total: number
    line_item_count: number
  }[]
}

interface AggregateData {
  metadata: AggregateMetadata
  data: LineItemAggregate[]
}

// Colors for charts
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#f43f5e'
]

const TreasuryAllTime = () => {
  const [aggregateData, setAggregateData] = useState<AggregateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLineItem, setExpandedLineItem] = useState<string | null>(null)
  const [yearlyBreakdown, setYearlyBreakdown] = useState<{year: number, value: number}[]>([])
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/data/treasury/alltime_aggregates.json')
      const data: AggregateData = await response.json()
      setAggregateData(data)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading treasury aggregate data:', error)
      setIsLoading(false)
    }
  }

  // Load yearly breakdown for a specific line item
  const loadYearlyBreakdown = async (category: string, subcategory: string, lineItem: string) => {
    const key = `${category}|${subcategory}|${lineItem}`
    
    // If clicking the same item, collapse it
    if (expandedLineItem === key) {
      setExpandedLineItem(null)
      setYearlyBreakdown([])
      return
    }

    setLoadingBreakdown(true)
    setExpandedLineItem(key)

    try {
      // Load the full CSV data
      const response = await fetch('/data/treasury/cor_data.csv')
      const csvText = await response.text()
      
      // Parse CSV and aggregate by year
      const lines = csvText.split('\n')
      const yearlyData: { [year: number]: number } = {}
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        
        const values = lines[i].split(',')
        if (values.length >= 6) {
          const rowYear = parseInt(values[0])
          const rowCategory = values[2]
          const rowSubcategory = values[3] || ''
          const rowLineItem = values[4] || ''
          const rowValue = parseFloat(values[5]) || 0
          
          // Match the line item
          if (rowCategory === category && rowSubcategory === subcategory && rowLineItem === lineItem) {
            if (!yearlyData[rowYear]) {
              yearlyData[rowYear] = 0
            }
            yearlyData[rowYear] += rowValue
          }
        }
      }
      
      // Convert to array and sort by year
      const breakdown = Object.entries(yearlyData)
        .map(([year, value]) => ({ year: parseInt(year), value }))
        .sort((a, b) => b.year - a.year) // Most recent first
      
      setYearlyBreakdown(breakdown)
      setLoadingBreakdown(false)
    } catch (error) {
      console.error('Error loading yearly breakdown:', error)
      setLoadingBreakdown(false)
    }
  }

  // Format currency (values are in thousands)
  const formatCurrency = (value: number) => {
    const millions = value / 1000
    if (Math.abs(millions) >= 1000) {
      const billions = millions / 1000
      return `₱${billions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}T`
    }
    return `₱${millions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
  }

  // Download CSV function
  const downloadCSV = () => {
    if (!aggregateData) return

    let csvContent = 'Category,Subcategory,Line Item,Total (in thousands)\n'
    aggregateData.data.forEach((row) => {
      csvContent += `"${row.category}","${row.subcategory}","${row.line_item}",${row.total}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `Treasury_AllTime_Aggregates.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get filtered data based on category and search
  const getFilteredData = (): LineItemAggregate[] => {
    if (!aggregateData) return []

    let filtered = aggregateData.data

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.category.toLowerCase().includes(query) ||
        item.subcategory.toLowerCase().includes(query) ||
        item.line_item.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  // Get category totals for pie chart
  const getCategoryData = () => {
    if (!aggregateData) return []

    const categoryTotals = aggregateData.metadata.category_summary
      .filter(cat => cat.category !== 'Budgetary Change-In-Cash') // Exclude technical category
      .map(cat => ({
        name: cat.category,
        value: Math.abs(cat.total) // Use absolute value for visualization
      }))
      .sort((a, b) => b.value - a.value)

    return categoryTotals
  }

  // Get top line items
  const getTopLineItems = (limit: number = 20) => {
    if (!aggregateData) return []

    return [...aggregateData.data]
      .filter(item => item.line_item) // Only items with line_item
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, limit)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name || payload[0].payload.name}</p>
          <p style={{ color: payload[0].color }} className="text-sm">
            Total: {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (isLoading || !aggregateData) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading All-Time Treasury Data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const filteredData = getFilteredData()
  const categoryData = getCategoryData()
  const topLineItems = getTopLineItems()

  // Get main category totals
  const totalRevenues = aggregateData.metadata.category_summary.find(c => c.category === 'Revenues')?.total || 0
  const totalExpenditures = aggregateData.metadata.category_summary.find(c => c.category === 'Expenditures')?.total || 0
  const totalSurplus = aggregateData.metadata.category_summary.find(c => c.category.includes('Surplus'))?.total || 0
  const totalFinancing = aggregateData.metadata.category_summary.find(c => c.category === 'Financing')?.total || 0

  // Get available categories for filter
  const categories = ['All', ...aggregateData.metadata.category_summary.map(c => c.category)]

  return (
    <>
      <Helmet>
        <title>Treasury All-Time Totals - Transparency Dashboard</title>
        <meta name="description" content={`Lifetime totals for Philippine government treasury operations from ${aggregateData.metadata.date_range.start_year} to ${aggregateData.metadata.date_range.end_year}.`} />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="flex">
          {/* Mobile Sidebar Backdrop */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Sidebar - Navigation */}
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
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Treasury Views</h3>
              <nav className="space-y-1">
                <Link
                  to="/treasury"
                  className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Overview
                </Link>
                <div className="block px-3 py-2 rounded-lg text-sm bg-blue-600 text-white font-semibold shadow-sm">
                  All-Time Totals
                </div>
              </nav>

              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 mt-6">Filter by Category</h3>
              <nav className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat)
                      setIsMobileSidebarOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedCategory === cat
                        ? 'bg-green-600 text-white font-semibold shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between gap-4 max-w-[1800px] mx-auto">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                    >
                      <Menu className="h-5 w-5 text-gray-600" />
                    </button>

                    <div className="p-3 bg-green-600 rounded-lg shrink-0">
                      <Clock className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                        All-Time Treasury Totals
                      </h1>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                        {aggregateData.metadata.date_range.start_year} - {aggregateData.metadata.date_range.end_year} ({aggregateData.metadata.date_range.total_years} years)
                      </p>
                    </div>
                  </div>

                  <div className="hidden lg:flex items-center shrink-0">
                    <button
                      onClick={downloadCSV}
                      className="px-4 py-2 rounded-lg font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                  </div>
                </div>

                {/* Mobile Download Button */}
                <div className="lg:hidden mt-4 max-w-[1800px] mx-auto flex justify-end">
                  <button
                    onClick={downloadCSV}
                    className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-green-600 text-white hover:bg-green-700 transition-all shadow flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              {/* Data Notice */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-r-lg max-w-[1800px] mx-auto">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">About This Data</h3>
                    <p className="text-sm text-blue-800">
                      These totals represent cumulative values across {aggregateData.metadata.date_range.total_years} years 
                      of Cash Operations Report (COR) data. All line items are aggregated from monthly records spanning 
                      {aggregateData.metadata.date_range.start_year} to {aggregateData.metadata.date_range.end_year}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 max-w-[1800px] mx-auto">
                <Card className="border-l-4 border-l-green-600">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4" />
                      Total Revenues
                    </CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {formatCurrency(totalRevenues)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      All-time cumulative
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-600">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4" />
                      Total Expenditures
                    </CardDescription>
                    <CardTitle className="text-2xl text-red-600">
                      {formatCurrency(totalExpenditures)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      All-time cumulative
                    </p>
                  </CardContent>
                </Card>

                <Card className={`border-l-4 ${totalSurplus >= 0 ? 'border-l-blue-600' : 'border-l-orange-600'}`}>
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Net Surplus/(Deficit)
                    </CardDescription>
                    <CardTitle className={`text-2xl ${totalSurplus >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(totalSurplus)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      Cumulative balance
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Total Financing
                    </CardDescription>
                    <CardTitle className="text-2xl text-purple-600">
                      {formatCurrency(totalFinancing)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      All-time cumulative
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto mb-6">
                {/* Category Distribution Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                      Category Distribution
                    </CardTitle>
                    <CardDescription>
                      All-time totals by major category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={(entry: any) => {
                            const percent = (entry.value / categoryData.reduce((sum, c) => sum + c.value, 0) * 100).toFixed(1)
                            return `${percent}%`
                          }}
                          labelLine={{ stroke: '#666', strokeWidth: 1 }}
                        >
                          {categoryData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top 20 Line Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Top 20 Line Items
                    </CardTitle>
                    <CardDescription>
                      Highest absolute values across all categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={topLineItems} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(Math.abs(value))} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="line_item" width={150} tick={{ fontSize: 9 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" fill="#10b981" name="Total" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Search Bar */}
              <div className="max-w-[1800px] mx-auto mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by category, subcategory, or line item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              {/* All Line Items Table */}
              <div className="max-w-[1800px] mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>All Line Items</CardTitle>
                    <CardDescription>
                      {selectedCategory !== 'All' ? `Filtered by: ${selectedCategory}` : 'All categories'} 
                      {searchQuery && ` • Search: "${searchQuery}"`}
                      {' • '}{filteredData.length} items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[600px]">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredData.map((row, index) => {
                            const isCategory = !row.subcategory && !row.line_item
                            const isSubcategory = row.subcategory && !row.line_item
                            const isLineItem = row.line_item

                            let indentClass = ''
                            let textClass = ''
                            let bgClass = ''

                            if (isCategory) {
                              indentClass = 'pl-3'
                              textClass = 'font-bold text-gray-900 text-base'
                              bgClass = 'bg-blue-50'
                            } else if (isSubcategory) {
                              indentClass = 'pl-8'
                              textClass = 'font-semibold text-gray-800'
                              bgClass = 'bg-gray-50'
                            } else if (isLineItem) {
                              indentClass = 'pl-16'
                              textClass = 'text-gray-700'
                              bgClass = ''
                            }

                            const displayText = row.line_item || row.subcategory || row.category
                            const rowKey = `${row.category}|${row.subcategory}|${row.line_item}`
                            const isExpanded = expandedLineItem === rowKey

                            return (
                              <>
                                <tr
                                  key={`${row.category}-${row.subcategory}-${row.line_item}-${index}`}
                                  className={`${bgClass} transition-colors ${isLineItem ? 'hover:bg-gray-100 cursor-pointer' : ''}`}
                                  onClick={() => {
                                    if (isLineItem) {
                                      loadYearlyBreakdown(row.category, row.subcategory, row.line_item)
                                    }
                                  }}
                                >
                                  <td className={`py-2 ${indentClass} ${textClass}`}>
                                    <div className="flex items-center gap-2">
                                      {isLineItem && (
                                        <span className="text-gray-400">
                                          {isExpanded ? '▼' : '▶'}
                                        </span>
                                      )}
                                      {displayText}
                                    </div>
                                  </td>
                                  <td className={`px-3 py-2 text-right font-mono ${row.total < 0 ? 'text-red-700' : 'text-green-700'} font-semibold whitespace-nowrap`}>
                                    {formatCurrency(row.total)}
                                  </td>
                                </tr>
                                
                                {/* Yearly Breakdown */}
                                {isLineItem && isExpanded && (
                                  <tr className="bg-gray-50">
                                    <td colSpan={2} className="px-3 py-3">
                                      <div className="pl-20">
                                        {loadingBreakdown ? (
                                          <div className="text-sm text-gray-500 italic">Loading yearly breakdown...</div>
                                        ) : yearlyBreakdown.length > 0 ? (
                                          <div className="space-y-1">
                                            <div className="text-xs font-semibold text-gray-600 mb-2">Yearly Breakdown:</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                              {yearlyBreakdown.map((yearData) => (
                                                <div
                                                  key={yearData.year}
                                                  className="flex justify-between items-center bg-white px-3 py-2 rounded border border-gray-200"
                                                >
                                                  <span className="text-xs font-medium text-gray-700">{yearData.year}:</span>
                                                  <span className={`text-xs font-semibold ${yearData.value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(yearData.value)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500 italic">No yearly data available</div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default TreasuryAllTime
