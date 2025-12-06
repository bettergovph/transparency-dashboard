import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Building2, ChevronRight, ArrowLeft, TrendingUp, DollarSign } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toSlug } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'

interface Agency {
  id: string
  description: string
  department_id: string
  years: Record<string, { count: number; amount: number }>
}

interface FundSubCategory {
  description: string
  department_id: string
  agency_id: string
  years: Record<string, { count: number; amount: number }>
}

interface Expense {
  id: string
  description: string
  department_id: string
  agency_id: string
  years: Record<string, { count: number; amount: number }>
}

const AgencyPage = () => {
  const { deptSlug, agencySlug } = useParams<{ deptSlug: string; agencySlug: string }>()
  const location = useLocation()
  const agencyId = location.state?.agencyId
  const agencyName = location.state?.agencyName
  const departmentId = location.state?.departmentId
  const departmentName = location.state?.departmentName

  const [agency, setAgency] = useState<Agency | null>(null)
  const [fundSubCategories, setFundSubCategories] = useState<FundSubCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<'fund_subcategories' | 'expenses'>('fund_subcategories')

  useEffect(() => {
    loadData()
  }, [agencyId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [agenciesRes, fundRes, expensesRes] = await Promise.all([
        fetch('/data/gaa/aggregates/agencies.json'),
        fetch('/data/gaa/aggregates/fund_subcategories.json'),
        fetch('/data/gaa/aggregates/expenses.json')
      ])

      const agenciesData = await agenciesRes.json()
      const fundData = await fundRes.json()
      const expensesData = await expensesRes.json()

      // Find the agency
      const foundAgency = agenciesData.data.find((a: Agency) =>
        a.id === agencyId || toSlug(a.description) === agencySlug
      )

      if (foundAgency) {
        setAgency(foundAgency)

        // Get years
        const years = Object.keys(foundAgency.years).map(Number).sort((a, b) => b - a)
        setAvailableYears(years)
        if (years.length > 0) {
          setSelectedYear(years[0])
        }

        // Filter fund subcategories and expenses for this agency
        const agencyFunds = fundData.data.filter((f: FundSubCategory) =>
          f.department_id === foundAgency.department_id && f.agency_id === foundAgency.id
        )
        const agencyExpenses = expensesData.data.filter((e: Expense) =>
          e.department_id === foundAgency.department_id && e.agency_id === foundAgency.id
        )

        setFundSubCategories(agencyFunds)
        setExpenses(agencyExpenses)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000_000) {
      return `₱${(value / 1_000_000_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}T`
    } else if (value >= 1_000_000_000) {
      return `₱${(value / 1_000_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
    } else {
      return `₱${(value / 1_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Agency Data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!agency) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Agency not found</h3>
              <Link to="/budget/departments" className="text-blue-600 hover:text-blue-800">
                ← Back to departments
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    )
  }

  const yearData = agency.years[String(selectedYear)]
  const totalAmount = yearData?.amount || 0
  const totalItems = yearData?.count || 0

  // Filter items for selected year
  const filteredFunds = fundSubCategories
    .filter(fund => fund.years[String(selectedYear)]?.amount > 0)
    .sort((a, b) => {
      const aAmount = a.years[String(selectedYear)]?.amount || 0
      const bAmount = b.years[String(selectedYear)]?.amount || 0
      return bAmount - aAmount
    })

  const filteredExpenses = expenses
    .filter(exp => exp.years[String(selectedYear)]?.amount > 0)
    .sort((a, b) => {
      const aAmount = a.years[String(selectedYear)]?.amount || 0
      const bAmount = b.years[String(selectedYear)]?.amount || 0
      return bAmount - aAmount
    })

  // Year-over-year data
  const yearOverYearData = availableYears
    .sort((a, b) => a - b)
    .map(year => ({
      year,
      amount: agency.years[String(year)]?.amount || 0,
      count: agency.years[String(year)]?.count || 0
    }))

  const topFundsData = filteredFunds.slice(0, 10).map(fund => ({
    name: fund.description.length > 30 ? fund.description.substring(0, 30) + '...' : fund.description,
    amount: fund.years[String(selectedYear)]?.amount || 0
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].payload.year || payload[0].payload.name}</p>
          <p className="text-sm text-blue-600">
            Amount: {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <Helmet>
        <title>{agency.description} - GAA Budget Browser</title>
        <meta name="description" content={`Browse budget allocations for ${agency.description} under ${departmentName}`} />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6 flex-wrap">
            <Link to="/budget" className="hover:text-blue-600">Budget</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/budget/departments" className="hover:text-blue-600">Departments</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/budget/departments/${deptSlug}`} state={{ departmentId, departmentName }} className="hover:text-blue-600">
              {departmentName}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">{agency.description}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <Link
              to={`/budget/departments/${deptSlug}`}
              state={{ departmentId, departmentName }}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {departmentName}
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{agency.description}</h1>
                <p className="text-gray-600 mt-1">Agency ID: {agency.id} • {departmentName}</p>
              </div>
            </div>

            {/* Year Tabs */}
            <div className="flex flex-wrap gap-2">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${selectedYear === year
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <CardDescription>Total Budget ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {formatCurrency(totalAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Agency allocation</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <CardDescription>Fund Sub-Categories</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {filteredFunds.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Funding sources</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <CardDescription>Expense Categories</CardDescription>
                <CardTitle className="text-2xl text-purple-600">
                  {filteredExpenses.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Expense types</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader className="pb-3">
                <CardDescription>Line Items</CardDescription>
                <CardTitle className="text-2xl text-orange-600">
                  {totalItems.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Budget allocations</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Year-over-Year Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Year-over-Year Budget Trend
                </CardTitle>
                <CardDescription>Agency budget allocation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={yearOverYearData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Budget"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Fund Sub-Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Top 10 Fund Sub-Categories ({selectedYear})
                </CardTitle>
                <CardDescription>Largest funding sources</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topFundsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Fund Sub-Categories and Expenses */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4 border-b">
                <button
                  onClick={() => setActiveTab('fund_subcategories')}
                  className={`px-4 py-2 font-semibold text-sm transition-all ${activeTab === 'fund_subcategories'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Fund Sub-Categories ({filteredFunds.length})
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`px-4 py-2 font-semibold text-sm transition-all ${activeTab === 'expenses'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Expense Categories ({filteredExpenses.length})
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'fund_subcategories' && (
                <div className="space-y-2">
                  {filteredFunds.map((fund, index) => {
                    const fundYearData = fund.years[String(selectedYear)]
                    const percentage = totalAmount > 0 ? (fundYearData.amount / totalAmount) * 100 : 0

                    return (
                      <div key={`${fund.description}-${index}`} className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-purple-600">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs">
                                #{index + 1}
                              </span>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {fund.description}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>{fundYearData.count.toLocaleString()} items</span>
                              <span className="font-semibold">{percentage.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-purple-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-purple-600">
                              {formatCurrency(fundYearData.amount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {filteredFunds.length === 0 && (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No fund sub-categories found for {selectedYear}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'expenses' && (
                <div className="space-y-2">
                  {filteredExpenses.map((expense, index) => {
                    const expenseYearData = expense.years[String(selectedYear)]
                    const percentage = totalAmount > 0 ? (expenseYearData.amount / totalAmount) * 100 : 0

                    return (
                      <div key={`${expense.id}-${index}`} className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-orange-600">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-semibold text-xs">
                                #{index + 1}
                              </span>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {expense.description}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Code: {expense.id} • {expenseYearData.count.toLocaleString()} items</span>
                              <span className="font-semibold">{percentage.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-orange-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-orange-600">
                              {formatCurrency(expenseYearData.amount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {filteredExpenses.length === 0 && (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No expense categories found for {selectedYear}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default AgencyPage
