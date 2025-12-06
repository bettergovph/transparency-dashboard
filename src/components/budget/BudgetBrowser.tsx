import { useState, useEffect } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import {
  DollarSign,
  TrendingUp,
  Building2,
  Download,
  AlertCircle,
  ArrowRight
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatGAAAmount } from '@/lib/formatGAAAmount'
import { searchBudgetDocuments } from '@/lib/meilisearch'
import type { BudgetDocument } from '@/types/budget'
import { Link } from 'react-router-dom'

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
  const topDepartments = departments
    .map(dept => ({
      id: dept.id,
      description: dept.description,
      amount: dept.years[String(selectedYear)]?.amount || 0,
      count: dept.years[String(selectedYear)]?.count || 0
    }))
    .filter(d => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

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
            {/* Sticky Header with Title and Year Tabs */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between gap-4 max-w-[1800px] mx-auto">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-3 bg-blue-600 rounded-lg shrink-0">
                      <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                        GAA Budget Browser
                      </h1>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                        General Appropriations Act (2020-2025)
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
                        title={`Download ${selectedYear} sample data as CSV`}
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
                      title={`Download ${selectedYear} sample as CSV`}
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
              {/* Data Notice */}
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg max-w-[1800px] mx-auto">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900 mb-1">Data Preview Notice</h3>
                    <p className="text-sm text-amber-800 mb-2">
                      This is a preview showing the first 100 budget line items for {selectedYear}.
                      For detailed hierarchical browsing by department, agency, fund categories, and expenses,
                      visit the <Link to="/budget/departments" className="font-semibold underline hover:text-amber-900">Departments Browser</Link>.
                    </p>
                    <Link
                      to="/budget/departments"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900 hover:text-amber-950 bg-amber-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Building2 className="h-4 w-4" />
                      Browse by Department
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

              {/* Sample Data Table */}
              <Card className="max-w-[1800px] mx-auto">
                <CardHeader>
                  <CardTitle>Sample Budget Line Items ({selectedYear})</CardTitle>
                  <CardDescription>
                    First 100 budget allocations - sorted by ID
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading budget data...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">ID</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Agency</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{doc.id}</td>
                              <td className="px-3 py-2 text-xs text-gray-700 max-w-xs">
                                <div className="truncate" title={doc.uacs_dpt_dsc}>{doc.uacs_dpt_dsc}</div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-700 max-w-xs">
                                <div className="truncate" title={doc.uacs_agy_dsc}>{doc.uacs_agy_dsc}</div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-700 max-w-md">
                                <div className="truncate" title={doc.dsc}>{doc.dsc}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-gray-900">
                                {formatCurrency(doc.amt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
