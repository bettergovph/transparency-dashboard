import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import {
  ChartBarStackedIcon,
  TrendingUp,
  Building2,
  AlertCircle,
  ArrowRight,
  Search,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import Navigation from '../Navigation'
import Footer from '../Footer'
import BudgetHeader from './BudgetHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatGAAAmount } from '@/lib/formatGAAAmount'
import { searchBudgetDocuments } from '@/lib/meilisearch'
import type { BudgetDocument } from '@/types/budget'
import { Link } from 'react-router-dom'
import { toSlug } from '@/lib/utils'

// Type definitions
interface YearlyTotal {
  year: number
  count: number
  amount: number
}

interface Department {
  id: string
  description: string
  years: Record<string, { count: number; amount: number }>
}

interface Agency {
  id: string
  description: string
  department_id: string
  years: Record<string, { count: number; amount: number }>
}

const BudgetBrowser = () => {
  const [results, setResults] = useState<BudgetDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [searchQuery, setSearchQuery] = useState('')

  // Aggregate data
  const [yearlyTotals, setYearlyTotals] = useState<YearlyTotal[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

  useEffect(() => {
    loadAggregateData()
  }, [])

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  useEffect(() => {
    if (selectedYear) {
      performSearch()
    }
  }, [selectedYear])

  const loadAggregateData = async () => {
    try {
      setIsDataLoading(true)

      const [yearlyRes, departmentsRes, agenciesRes] = await Promise.all([
        fetch('/data/gaa/aggregates/yearly_totals.json'),
        fetch('/data/gaa/aggregates/departments.json'),
        fetch('/data/gaa/aggregates/agencies.json')
      ])

      const yearlyData = await yearlyRes.json()
      const departmentsData = await departmentsRes.json()
      const agenciesData = await agenciesRes.json()

      setYearlyTotals(yearlyData.data)
      setDepartments(departmentsData.data)
      setAgencies(agenciesData.data)

      const years = yearlyData.data.map((y: YearlyTotal) => y.year).sort((a: number, b: number) => b - a)
      setAvailableYears(years)
      if (years.length > 0) {
        setSelectedYear(years[0])
      }

      setIsDataLoading(false)
    } catch (error) {
      console.error('Error loading aggregate data:', error)
      setIsDataLoading(false)
    }
  }

  const performSearch = async () => {
    setLoading(true)

    try {
      const searchResults = await searchBudgetDocuments({
        query: '',
        filter: `year = ${selectedYear}`,
        limit: 100,
        sort: ['id:asc']
      })

      setResults(searchResults.hits)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => formatGAAAmount(value)

  // Calculate current year stats
  const yearData = yearlyTotals.find(y => y.year === selectedYear)
  const totalAmount = yearData?.amount || 0
  const totalItems = yearData?.count || 0

  // Get top departments for current year
  const filteredDepartments = departments
    .map(dept => ({
      id: dept.id,
      description: dept.description,
      amount: dept.years[String(selectedYear)]?.amount || 0,
      count: dept.years[String(selectedYear)]?.count || 0
    }))
    .filter(d => {
      const hasData = d.amount > 0
      const matchesSearch = d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.includes(searchQuery)
      return hasData && matchesSearch
    })
    .sort((a, b) => b.amount - a.amount)

  const topDepartments = filteredDepartments.slice(0, 10)

  // Download CSV function
  const downloadCSV = () => {
    const csvContent = [
      'Year,ID,Agency,Department,Description,Amount,Operating Unit',
      ...results.slice(0, 1000).map(doc =>
        `${doc.year},"${doc.id}","${doc.uacs_agy_dsc}","${doc.uacs_dpt_dsc}","${doc.dsc}",${doc.amt},"${doc.uacs_oper_dsc}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `GAA_Budget_${selectedYear}_Sample.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  if (isDataLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading GAA Budget Data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>GAA Budget Browser - Transparency Dashboard</title>
        <meta name="description" content="Explore Philippine government budget allocations from the General Appropriations Act (GAA). View year-by-year budget data by department and agency." />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="flex">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Sticky Header */}
            <BudgetHeader
              title="GAA Budget Browser"
              subtitle="General Appropriations Act (2020-2025)"
              icon={<ChartBarStackedIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />}
              availableYears={availableYears}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              showSearch={false}
            />

            {/* Content Area with Padding */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              {/* Data Notice */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-r-lg max-w-[1800px] mx-auto">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Browse GAA Budget by Department</h3>
                    <p className="text-sm text-blue-800 mb-2">
                      Explore the {selectedYear} General Appropriations Act budget organized by government departments.
                      Click any department to drill down into agencies, fund categories, expense categories, and detailed line items.
                    </p>
                    <Link
                      to="/budget/departments"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:text-blue-950 bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Building2 className="h-4 w-4" />
                      View Full Departments Page
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 max-w-[1800px] mx-auto">
                <Card className="border-l-4 border-l-blue-600">
                  <CardHeader className="pb-3">
                    <CardDescription>Total Budget ({selectedYear})</CardDescription>
                    <CardTitle className="text-2xl text-blue-600">
                      {formatCurrency(totalAmount)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      National appropriations
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600">
                  <CardHeader className="pb-3">
                    <CardDescription>Total Line Items</CardDescription>
                    <CardTitle className="text-2xl text-purple-600">
                      {totalItems.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      Budget allocations
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-600">
                  <CardHeader className="pb-3">
                    <CardDescription>Departments</CardDescription>
                    <CardTitle className="text-2xl text-orange-600">
                      {departments.filter(d => d.years[String(selectedYear)]?.amount > 0).length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      Active departments
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto mb-6">
                {/* Year-over-Year Trend */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      Year-over-Year Budget Trend (2020-2025)
                    </CardTitle>
                    <CardDescription>
                      Total national budget appropriations by year
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={yearlyTotals}>
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
                          dataKey="amount"
                          stroke="#6366f1"
                          strokeWidth={3}
                          name="Total Budget"
                          dot={{ fill: '#6366f1', r: 6 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Departments */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-orange-600" />
                      Top 10 Departments by Budget ({selectedYear})
                    </CardTitle>
                    <CardDescription>
                      Largest budget allocations by department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={topDepartments}
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
                          dataKey="description"
                          tick={{ fontSize: 9 }}
                          width={200}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="amount"
                          fill="#f97316"
                          name="Budget Allocation"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Departments List */}
              <Card className="max-w-[1800px] mx-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Government Departments ({selectedYear})</CardTitle>
                      <CardDescription>
                        Browse {filteredDepartments.length} departments - Click to explore agencies and budget details
                      </CardDescription>
                    </div>
                    <Link
                      to="/budget/departments"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Building2 className="h-4 w-4" />
                      View All
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mt-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search departments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading departments...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredDepartments.map((dept, index) => {
                        const percentage = totalAmount > 0 ? (dept.amount / totalAmount) * 100 : 0

                        return (
                          <Link
                            key={dept.id}
                            to={`/budget/departments/${toSlug(dept.description)}`}
                            state={{ departmentId: dept.id, departmentName: dept.description }}
                          >
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                                      #{index + 1}
                                    </span>
                                    <h4 className="text-base font-semibold text-gray-900">
                                      {dept.description}
                                    </h4>
                                  </div>

                                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                    <span>ID: {dept.id} • {dept.count.toLocaleString()} budget items</span>
                                    <span className="font-semibold">{percentage.toFixed(2)}% of total</span>
                                  </div>

                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(dept.amount)}
                                  </div>
                                  <div className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                                    Explore <ArrowRight className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                      {filteredDepartments.length === 0 && (
                        <div className="text-center py-12">
                          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 text-lg">No departments found</p>
                          <p className="text-gray-500 text-sm mt-2">Try adjusting your search</p>
                        </div>
                      )}
                    </div>
                  )}
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

export default BudgetBrowser
