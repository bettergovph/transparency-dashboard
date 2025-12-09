import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Building2, TrendingUp, ArrowRight } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import Navigation from '../Navigation'
import Footer from '../Footer'
import BudgetHeader from './BudgetHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatGAAAmount } from '@/lib/formatGAAAmount'

interface Department {
  id: string
  slug: string
  description: string
  years: Record<string, { count: number; amount: number }>
}

const DepartmentsListPage = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<number[]>([])

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/data/gaa/aggregates/departments.json')
      const data = await response.json()
      setDepartments(data.data)

      // Extract available years from first department
      if (data.data.length > 0) {
        const years = Object.keys(data.data[0].years).map(Number).sort((a, b) => b - a)
        setAvailableYears(years)
        if (years.length > 0) {
          setSelectedYear(years[0])
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading departments:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => formatGAAAmount(value)

  // Filter and sort departments
  const filteredDepartments = departments
    .filter(dept => {
      const hasDataForYear = dept.years[String(selectedYear)]?.amount > 0
      const matchesSearch = dept.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.id.includes(searchQuery)
      return hasDataForYear && matchesSearch
    })
    .sort((a, b) => {
      const aAmount = a.years[String(selectedYear)]?.amount || 0
      const bAmount = b.years[String(selectedYear)]?.amount || 0
      return bAmount - aAmount
    })

  const totalBudget = filteredDepartments.reduce((sum, dept) => {
    return sum + (dept.years[String(selectedYear)]?.amount || 0)
  }, 0)

  const totalItems = filteredDepartments.reduce((sum, dept) => {
    return sum + (dept.years[String(selectedYear)]?.count || 0)
  }, 0)

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Departments...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Departments - GAA Budget Browser</title>
        <meta name="description" content="Browse Philippine government departments and their budget allocations from the General Appropriations Act." />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Sticky Header */}
        <BudgetHeader
          title="Government Departments"
          subtitle="Browse department budgets and drill down to agencies"
          icon={<Building2 className="h-5 w-5 md:h-6 md:w-6 text-white" />}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search departments..."
          showSearch={true}
        />

        {/* Content Area with Padding */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-[1800px] mx-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Departments ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {filteredDepartments.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Active departments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Budget ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(totalBudget)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Combined allocations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Line Items</CardDescription>
                <CardTitle className="text-2xl text-purple-600">
                  {totalItems.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Budget allocations</p>
              </CardContent>
            </Card>
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1800px] mx-auto">
            {filteredDepartments.map((dept, index) => {
              const yearData = dept.years[String(selectedYear)]
              const percentage = totalBudget > 0 ? (yearData.amount / totalBudget) * 100 : 0

              // Prepare year-over-year data for chart
              const chartData = availableYears
                .map(year => ({
                  year,
                  amount: dept.years[String(year)]?.amount || 0
                }))
                .sort((a, b) => a.year - b.year)

              // Calculate year-over-year change
              const currentYearAmount = dept.years[String(selectedYear)]?.amount || 0
              const previousYear = selectedYear - 1
              const previousYearAmount = dept.years[String(previousYear)]?.amount || 0
              const yoyChange = previousYearAmount > 0
                ? ((currentYearAmount - previousYearAmount) / previousYearAmount) * 100
                : 0

              return (
                <Link
                  key={dept.id}
                  to={`/budget/departments/${dept.slug}`}
                  state={{ departmentId: dept.id, departmentName: dept.description }}
                >
                  <Card className="hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-blue-600 h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold text-sm shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-gray-900 line-clamp-2">
                              {dept.description}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">ID: {dept.id}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-bold text-blue-600">
                            {formatCurrency(yearData.amount)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {selectedYear}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Year-over-Year Chart */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600">Budget Trend (2020-2025)</span>
                          {yoyChange !== 0 && (
                            <span className={`text-xs font-semibold flex items-center gap-1 ${yoyChange > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                              <TrendingUp className={`h-3 w-3 ${yoyChange < 0 ? 'rotate-180' : ''
                                }`} />
                              {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}% YoY
                            </span>
                          )}
                        </div>
                        <ResponsiveContainer width="100%" height={80}>
                          <LineChart data={chartData}>
                            <XAxis
                              dataKey="year"
                              tick={{ fontSize: 10 }}
                              stroke="#9ca3af"
                            />
                            <YAxis hide />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white px-2 py-1 border border-gray-200 rounded shadow-sm">
                                      <p className="text-xs font-semibold">{payload[0].payload.year}</p>
                                      <p className="text-xs text-blue-600">
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
                              dataKey="amount"
                              stroke="#2563eb"
                              strokeWidth={2}
                              dot={{ fill: '#2563eb', r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Budget Items</p>
                          <p className="text-sm font-bold text-gray-900">{yearData.count.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Share of Total</p>
                          <p className="text-sm font-bold text-gray-900">{percentage.toFixed(2)}%</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Click to explore agencies</span>
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {filteredDepartments.length === 0 && (
            <div className="col-span-full max-w-[1800px] mx-auto">
              <Card>
                <CardContent className="p-12 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No departments found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search terms' : `No departments with budget data for ${selectedYear}`}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}

export default DepartmentsListPage
