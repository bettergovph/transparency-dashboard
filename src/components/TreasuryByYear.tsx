import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart as PieChartIcon,
  AlertCircle,
  Menu,
  X,
  Download,
  Wallet,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle
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
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import Navigation from './Navigation'
import Footer from './Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Type definitions
interface TreasuryRecord {
  year: number
  month: string
  category: string
  subcategory: string
  line_item: string
  value: number
}

interface YearSummary {
  year: number
  revenues: number
  expenditures: number
  surplus: number
  financing: number
}

interface MonthlyData {
  month: string
  revenues: number
  expenditures: number
  surplus: number
  monthNum: number
}

interface CategoryBreakdown {
  category: string
  value: number
  percentage: number
}

interface YearlyRow {
  category: string
  subcategory: string
  line_item: string
  total: number
}

// Colors for charts
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#f43f5e'
]

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const TreasuryByYear = () => {
  const { year: yearParam } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<TreasuryRecord[]>([])
  const [yearSummaries, setYearSummaries] = useState<YearSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(yearParam ? parseInt(yearParam) : 2024)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [selectedLineItem, setSelectedLineItem] = useState<YearlyRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Update selected year when URL param changes
  useEffect(() => {
    if (yearParam && availableYears.length > 0) {
      const year = parseInt(yearParam)
      if (availableYears.includes(year)) {
        setSelectedYear(year)
      }
    }
  }, [yearParam, availableYears])

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    navigate(`/treasury/year/${year}`)
    setIsMobileSidebarOpen(false)
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/data/treasury/cor_data.csv')
      const csvText = await response.text()
      
      // Parse CSV
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
      
      // Calculate year summaries
      const years = [...new Set(records.map(r => r.year))].sort((a, b) => b - a)
      setAvailableYears(years)
      
      // Only set selected year if not already set from URL param
      if (!yearParam && years.length > 0) {
        setSelectedYear(years[0])
      }
      
      const summaries = years.map(year => {
        const yearData = records.filter(r => r.year === year)
        
        const revenues = yearData
          .filter(r => r.category === 'Revenues' && !r.subcategory && !r.line_item)
          .reduce((sum, r) => sum + r.value, 0)
        
        const expenditures = yearData
          .filter(r => r.category === 'Expenditures' && !r.subcategory && !r.line_item)
          .reduce((sum, r) => sum + r.value, 0)
        
        const surplus = yearData
          .filter(r => r.category === 'Surplus/(-)Deficit' && !r.subcategory && !r.line_item)
          .reduce((sum, r) => sum + r.value, 0)
        
        const financing = yearData
          .filter(r => r.category === 'Financing' && !r.subcategory && !r.line_item)
          .reduce((sum, r) => sum + r.value, 0)
        
        return { year, revenues, expenditures, surplus, financing }
      })
      
      setYearSummaries(summaries)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading treasury data:', error)
      setIsLoading(false)
    }
  }

  // Get monthly data for selected year
  const getMonthlyData = (): MonthlyData[] => {
    const yearData = data.filter(r => r.year === selectedYear)
    
    return MONTH_ORDER.map((month, index) => {
      const monthData = yearData.filter(r => r.month === month)
      
      const revenues = monthData
        .filter(r => r.category === 'Revenues' && !r.subcategory && !r.line_item)
        .reduce((sum, r) => sum + r.value, 0)
      
      const expenditures = monthData
        .filter(r => r.category === 'Expenditures' && !r.subcategory && !r.line_item)
        .reduce((sum, r) => sum + r.value, 0)
      
      const surplus = revenues - expenditures
      
      return {
        month,
        revenues,
        expenditures,
        surplus,
        monthNum: index + 1
      }
    }).filter(d => d.revenues > 0 || d.expenditures > 0)
  }

  // Get category breakdown for selected year and category
  const getCategoryBreakdown = (category: string): CategoryBreakdown[] => {
    const yearData = data.filter(r => r.year === selectedYear && r.category === category)
    
    // Get subcategories (first level breakdown)
    const subcategories = [...new Set(yearData.filter(r => r.subcategory).map(r => r.subcategory))]
    
    const breakdown = subcategories.map(subcat => {
      const value = yearData
        .filter(r => r.subcategory === subcat && !r.line_item)
        .reduce((sum, r) => sum + r.value, 0)
      return { category: subcat, value, percentage: 0 }
    }).filter(b => b.value > 0)
    
    const total = breakdown.reduce((sum, b) => sum + b.value, 0)
    breakdown.forEach(b => b.percentage = (b.value / total) * 100)
    
    return breakdown.sort((a, b) => b.value - a.value)
  }

  // Get yearly aggregated rows for selected year (maintains CSV order)
  const getYearlyRows = (): YearlyRow[] => {
    const yearData = data.filter(r => r.year === selectedYear)

    const map = new Map<string, YearlyRow>()
    const orderMap = new Map<string, number>()
    let orderIndex = 0

    for (const record of yearData) {
      const key = `${record.category}||${record.subcategory}||${record.line_item}`
      
      if (!orderMap.has(key)) {
        orderMap.set(key, orderIndex++)
      }
      
      const existing = map.get(key)
      if (existing) {
        existing.total += record.value
      } else {
        map.set(key, {
          category: record.category,
          subcategory: record.subcategory,
          line_item: record.line_item,
          total: record.value
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const keyA = `${a.category}||${a.subcategory}||${a.line_item}`
      const keyB = `${b.category}||${b.subcategory}||${b.line_item}`
      return (orderMap.get(keyA) || 0) - (orderMap.get(keyB) || 0)
    })
  }

  // Get historical data for a specific line item across all years
  const getHistoricalData = (row: YearlyRow) => {
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

    return historicalData.sort((a, b) => a.year - b.year)
  }

  const handleRowClick = (row: YearlyRow) => {
    setSelectedLineItem(row)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedLineItem(null)
  }

  // Calculate summary statistics
  const currentYearSummary = yearSummaries.find(y => y.year === selectedYear)
  const revenues = currentYearSummary?.revenues || 0
  const expenditures = currentYearSummary?.expenditures || 0
  const surplus = currentYearSummary?.surplus || 0
  const financing = currentYearSummary?.financing || 0

  // Format currency (values are in thousands)
  const formatCurrency = (value: number) => {
    const millions = value / 1000
    if (millions >= 1000) {
      const billions = millions / 1000
      return `₱${billions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}T`
    }
    return `₱${millions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
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
    const yearData = data.filter(r => r.year === selectedYear)
    
    let csvContent = 'Year,Month,Category,Subcategory,Line Item,Value (in thousands)\\n'
    yearData.forEach((row) => {
      csvContent += `${row.year},"${row.month}","${row.category}","${row.subcategory}","${row.line_item}",${row.value}\\n`
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `Treasury_COR_${selectedYear}.csv`)
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
            <p className="text-gray-600">Loading Treasury Data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const monthlyData = getMonthlyData()
  const revenuesBreakdown = getCategoryBreakdown('Revenues')
  const expendituresBreakdown = getCategoryBreakdown('Expenditures')
  const yearlyRows = getYearlyRows()
 
  return (
    <>
      <Helmet>
        <title>Treasury Dashboard - Cash Operations Report - Transparency Dashboard</title>
        <meta name="description" content="Explore Philippine government treasury cash operations, revenues, expenditures, and fiscal health indicators." />
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

          {/* Sidebar - Category Navigation */}
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
              <h2 className="font-semibold text-gray-900">Select Year</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <Link
                to="/treasury"
                className="flex items-center gap-2 px-3 py-2 mb-4 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                ← Overview
              </Link>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Select Year</h3>
              <nav className="space-y-1">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearChange(year)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedYear === year
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {year}
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
                      <Wallet className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                        Treasury Dashboard
                      </h1>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                        Cash Operations Report (COR) - {selectedYear}
                      </p>
                    </div>
                  </div>

                  {/* Download Button */}
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
                      The Cash Operations Report (COR) provides a comprehensive view of the Philippine government's 
                      monthly cash receipts and disbursements. Data covers revenues from various sources, 
                      expenditures across different categories, and financing activities.
                    </p>
                  </div>
                </div>
              </div>

              {/* Yearly Browser Table */}
              <div className="max-w-[1800px] mx-auto mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Yearly Cash Operations Browser ({selectedYear})</CardTitle>
                    <CardDescription>
                      Aggregated values by category, subcategory, and line item for the selected year.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[480px]">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total ({selectedYear})</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {yearlyRows.map((row, index) => {
                            // Determine hierarchy level and styling
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

                            return (
                              <tr
                                key={`${row.category}-${row.subcategory}-${row.line_item}-${index}`}
                                className={`hover:bg-gray-100 ${bgClass} cursor-pointer transition-colors`}
                                onClick={() => handleRowClick(row)}
                              >
                                <td className={`py-2 ${indentClass} ${textClass}`}>
                                  {displayText}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-green-700 font-semibold whitespace-nowrap">
                                  {formatCurrency(row.total)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4 max-w-[1800px] mx-auto">
                <Card className="border-l-4 border-l-green-600">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4" />
                      Total Revenues
                    </CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {formatCurrency(revenues)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      For {selectedYear}
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
                      {formatCurrency(expenditures)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      For {selectedYear}
                    </p>
                  </CardContent>
                </Card>

                <Card className={`border-l-4 ${surplus >= 0 ? 'border-l-blue-600' : 'border-l-orange-600'}`}>
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      {surplus >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      Surplus/(Deficit)
                    </CardDescription>
                    <CardTitle className={`text-2xl ${surplus >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(surplus)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      {surplus >= 0 ? 'Surplus' : 'Deficit'} in {selectedYear}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Net Financing
                    </CardDescription>
                    <CardTitle className="text-2xl text-purple-600">
                      {formatCurrency(financing)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      For {selectedYear}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto">
                {/* Historical Trend */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Historical Trend (All Years)
                    </CardTitle>
                    <CardDescription>
                      Revenues vs Expenditures over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={yearSummaries}>
                        <defs>
                          <linearGradient id="colorRevenues" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpenditures" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenues"
                          stroke="#10b981"
                          fillOpacity={1}
                          fill="url(#colorRevenues)"
                          name="Revenues"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenditures"
                          stroke="#ef4444"
                          fillOpacity={1}
                          fill="url(#colorExpenditures)"
                          name="Expenditures"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      Monthly Cash Operations ({selectedYear})
                    </CardTitle>
                    <CardDescription>
                      Monthly revenues and expenditures breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="revenues" fill="#10b981" name="Revenues" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="expenditures" fill="#ef4444" name="Expenditures" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Revenues Breakdown Pie Chart */}
                {revenuesBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-green-600" />
                        Revenues Breakdown ({selectedYear})
                      </CardTitle>
                      <CardDescription>
                        Distribution by subcategory
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={revenuesBreakdown as any}
                            dataKey="value"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label={(entry: any) => `${entry.percentage.toFixed(1)}%`}
                            labelLine={{ stroke: '#666', strokeWidth: 1 }}
                          >
                            {revenuesBreakdown.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Expenditures Breakdown Bar Chart */}
                {expendituresBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-red-600" />
                        Expenditures Details ({selectedYear})
                      </CardTitle>
                      <CardDescription>
                        Breakdown by subcategory
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={expendituresBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="#ef4444" name="Expenditures" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

               
              </div>
            </div>
          </main>
        </div>
      </div>

      <Footer />

      {/* Historical Trend Modal */}
      {isModalOpen && selectedLineItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
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
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getHistoricalData(selectedLineItem)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Amount', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
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
                          <td className="px-4 py-2 text-right font-mono text-green-700 font-semibold">
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

export default TreasuryByYear
