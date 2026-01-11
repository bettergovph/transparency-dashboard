import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  ChevronRight
} from 'lucide-react'
import {
  LineChart,
  Line,
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

// Colors for different line items
const LINE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
]

const TreasuryOverview = () => {
  const [data, setData] = useState<TreasuryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [latestYear, setLatestYear] = useState<number>(2024)

  useEffect(() => {
    loadData()
  }, [])

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
      
      // Get latest year
      const years = [...new Set(records.map(r => r.year))].sort((a, b) => b - a)
      if (years.length > 0) {
        setLatestYear(years[0])
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading treasury data:', error)
      setIsLoading(false)
    }
  }

  // Get line items with historical trends for a category/subcategory
  const getLineItemTrends = (category: string, subcategory?: string): LineItemTrend[] => {
    const filteredData = data.filter(r => {
      if (subcategory === '') {
        // For categories with empty subcategory (like Expenditures), get line items directly
        return r.category === category && r.subcategory === '' && r.line_item !== ''
      }
      if (subcategory) {
        return r.category === category && r.subcategory === subcategory && r.line_item !== ''
      }
      return r.category === category && r.subcategory !== '' && r.line_item === ''
    })

    const items = [...new Set(filteredData.map(r => subcategory ? r.line_item : r.subcategory))]
    const years = [...new Set(data.map(r => r.year))].sort((a, b) => a - b)

    return items.map(item => {
      const itemData = years.map(year => {
        const yearData = data.filter(r => {
          if (subcategory === '') {
            // For categories with empty subcategory (like Expenditures), filter by line item
            return r.year === year && r.category === category && r.subcategory === '' && r.line_item === item
          }
          if (subcategory) {
            return r.year === year && r.category === category && r.subcategory === subcategory && r.line_item === item
          }
          return r.year === year && r.category === category && r.subcategory === item && r.line_item === ''
        })
        const total = yearData.reduce((sum, r) => sum + r.value, 0)
        return { year, total }
      }).filter(d => d.total > 0)

      return {
        name: item,
        data: itemData
      }
    }).filter(item => item.data.length > 0)
  }

  // Calculate latest year totals for items in a category
  const getLatestYearTotals = (category: string, subcategory?: string) => {
    const filteredData = data.filter(r => {
      if (subcategory === '') {
        // For categories with empty subcategory (like Expenditures), get line items directly
        return r.year === latestYear && r.category === category && r.subcategory === '' && r.line_item !== ''
      }
      if (subcategory) {
        return r.year === latestYear && r.category === category && r.subcategory === subcategory && r.line_item !== ''
      }
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

  // Format currency
  const formatCurrency = (value: number) => {
    const millions = value / 1000
    if (millions >= 1000) {
      const billions = millions / 1000
      return `₱${billions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
    }
    return `₱${millions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`
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
            <p className="text-gray-600">Loading Treasury Data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const taxRevenueLineItems = getLineItemTrends('Revenues', 'Tax Revenues')
  const revenueLatestTotals = getLatestYearTotals('Revenues', 'Tax Revenues')
  const totalTaxRevenue = revenueLatestTotals.reduce((sum, item) => sum + item.total, 0)

  // For Expenditures, get line items directly (subcategory is empty, line_item has the categories)
  const expenditureLineItems = getLineItemTrends('Expenditures', '')
  const expenditureLatestTotals = getLatestYearTotals('Expenditures', '')
  const totalExpenditures = expenditureLatestTotals.reduce((sum, item) => sum + item.total, 0)

  return (
    <>
      <Helmet>
        <title>Treasury Dashboard - Philippine Government Cash Operations</title>
        <meta name="description" content="Overview of Philippine government treasury cash operations and tax revenue trends." />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        {/* Hero Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-green-600 rounded-lg">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Treasury Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Philippine Government Cash Operations Report (COR)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  Total Tax Revenue ({latestYear})
                </CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {formatCurrency(totalTaxRevenue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  All tax revenue sources
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-600">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Total Expenditures ({latestYear})
                </CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {formatCurrency(totalExpenditures)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  All government spending
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Data Coverage
                </CardDescription>
                <CardTitle className="text-3xl text-purple-600">
                  1986-{latestYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {latestYear - 1986 + 1} years of data
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <Link
              to="/treasury/browser"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              View Detailed Browser
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Revenues Section */}
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-green-700 mb-2">Revenues</h2>
              <p className="text-gray-600">Tax revenue sources and historical trends</p>
            </div>

            {/* Tax Revenue Historical Trends Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  Tax Revenue Historical Trends
                </CardTitle>
                <CardDescription>
                  Year-over-year trends for major tax revenue sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="year"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {taxRevenueLineItems.map((item, index) => (
                      <Line
                        key={item.name}
                        data={item.data}
                        dataKey="total"
                        name={item.name}
                        stroke={LINE_COLORS[index % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tax Revenue Source Cards */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Tax Revenue Sources ({latestYear})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {revenueLatestTotals.map((item, index) => (
                  <Card key={item.name} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs text-gray-500">
                        {item.name}
                      </CardDescription>
                      <CardTitle className="text-2xl" style={{ color: LINE_COLORS[index % LINE_COLORS.length] }}>
                        {formatCurrency(item.total)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        {((item.total / totalTaxRevenue) * 100).toFixed(1)}% of total
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Expenditures Section */}
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-red-700 mb-2">Expenditures</h2>
              <p className="text-gray-600">Government spending categories and historical trends</p>
            </div>

            {/* Expenditures Historical Trends Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                  Expenditures Historical Trends
                </CardTitle>
                <CardDescription>
                  Year-over-year trends for government spending categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="year"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {expenditureLineItems.map((item, index) => (
                      <Line
                        key={item.name}
                        data={item.data}
                        dataKey="total"
                        name={item.name}
                        stroke={LINE_COLORS[index % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expenditure Category Cards */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Expenditure Categories ({latestYear})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {expenditureLatestTotals.map((item, index) => (
                  <Card key={item.name} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs text-gray-500">
                        {item.name}
                      </CardDescription>
                      <CardTitle className="text-2xl" style={{ color: LINE_COLORS[index % LINE_COLORS.length] }}>
                        {formatCurrency(item.total)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        {((item.total / totalExpenditures) * 100).toFixed(1)}% of total
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default TreasuryOverview
