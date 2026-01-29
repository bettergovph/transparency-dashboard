import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Building2, TrendingUp } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import BudgetHeader from './BudgetHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toSlug } from '@/lib/utils'
import { formatGAAAmount } from '@/lib/formatGAAAmount'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Agency {
  id: string  // Composite key: "department_id-agency_code"
  slug: string
  agency_code: string  // Original agency code
  description: string
  department_id: string
  years: Record<string, { count: number; amount: number }>
}

interface Department {
  id: string
  slug: string
  description: string
  years: Record<string, { count: number; amount: number }>
}

const DepartmentPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const departmentId = location.state?.departmentId

  const [department, setDepartment] = useState<Department | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<number[]>([])

  useEffect(() => {
    loadData()
  }, [departmentId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [deptRes, agenciesRes] = await Promise.all([
        fetch('/data/gaa/aggregates/departments.json'),
        fetch('/data/gaa/aggregates/agencies.json')
      ])

      const deptData = await deptRes.json()
      const agenciesData = await agenciesRes.json()

      // Find the department
      const foundDept = deptData.data.find((d: Department) =>
        d.id === departmentId || d.slug === slug
      )

      if (foundDept) {
        setDepartment(foundDept)

        // Get years
        const years = Object.keys(foundDept.years).map(Number).sort((a, b) => b - a)
        setAvailableYears(years.reverse())
        if (years.length > 0) {
          setSelectedYear(years[0])
        }

        // Filter agencies for this department
        const deptAgencies = agenciesData.data.filter((a: Agency) => a.department_id === foundDept.id)
        console.log(`Found ${deptAgencies.length} agencies for department ${foundDept.id}:`, deptAgencies.slice(0, 3))
        setAgencies(deptAgencies)
      } else {
        console.log('Department not found:', { departmentId, slug, available: deptData.data.map((d: any) => ({ id: d.id, slug: toSlug(d.description) })).slice(0, 5) })
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => formatGAAAmount(value)

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Department Data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!department) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Department not found</h3>
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

  const yearData = department.years[String(selectedYear)]
  const totalAmount = yearData?.amount || 0
  const totalItems = yearData?.count || 0

  // Filter and sort agencies for selected year
  const filteredAgencies = agencies
    .filter(agency => agency.years[String(selectedYear)]?.amount > 0)
    .sort((a, b) => {
      const aAmount = a.years[String(selectedYear)]?.amount || 0
      const bAmount = b.years[String(selectedYear)]?.amount || 0
      return bAmount - aAmount
    })

  console.log(`Filtered agencies for ${selectedYear}:`, filteredAgencies.length, 'out of', agencies.length)

  // Year-over-year data
  const yearOverYearData = availableYears
    .sort((a, b) => a - b)
    .map(year => ({
      year,
      amount: department.years[String(year)]?.amount || 0,
      count: department.years[String(year)]?.count || 0
    }))

  // Top agencies chart data
  const topAgenciesData = filteredAgencies.slice(0, 10).map(agency => ({
    name: agency.description.length > 40 ? agency.description.substring(0, 40) + '...' : agency.description,
    amount: agency.years[String(selectedYear)]?.amount || 0
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
        <title>{department.description} - GAA Budget Browser</title>
        <meta name="description" content={`Browse budget allocations and agencies under ${department.description}`} />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Sticky Header */}
        <BudgetHeader
          title={department.description}
          subtitle={`Department ID: ${department.id} · Browse agencies and allocations`}
          icon={<Building2 className="h-5 w-5 md:h-6 md:w-6 text-white" />}
          availableYears={availableYears.reverse()}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          showSearch={false}
        />

        {/* Content Area with Padding */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 max-w-[1800px] mx-auto">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <CardDescription>Total Budget ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {formatCurrency(totalAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Department allocation</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <CardDescription>Agencies</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {filteredAgencies.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Under this department</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <CardDescription>Line Items</CardDescription>
                <CardTitle className="text-2xl text-purple-600">
                  {totalItems.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Budget allocations</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader className="pb-3">
                <CardDescription>Active Agencies</CardDescription>
                <CardTitle className="text-2xl text-orange-600">
                  {filteredAgencies.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Under this department</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 max-w-[1800px] mx-auto">
            {/* Year-over-Year Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Year-over-Year Budget Trend
                </CardTitle>
                <CardDescription>Department budget allocation over time</CardDescription>
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
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Budget"
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Agencies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  Top 10 Agencies ({selectedYear})
                </CardTitle>
                <CardDescription>Largest budget allocations by agency</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topAgenciesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Agencies List */}
          <Card className="max-w-[1800px] mx-auto">
            <CardHeader>
              <CardTitle>Agencies ({selectedYear})</CardTitle>
              <CardDescription>
                Click on an agency to view fund subcategories and expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAgencies.map((agency, index) => {
                  const agencyYearData = agency.years[String(selectedYear)]
                  const percentage = totalAmount > 0 ? (agencyYearData.amount / totalAmount) * 100 : 0

                  return (
                    <Link
                      key={agency.id}
                      to={`/budget/departments/${slug}/agencies/${agency.slug}`}
                      state={{
                        agencyId: agency.id,
                        agencyName: agency.description,
                        departmentId: department.id,
                        departmentName: department.description
                      }}
                      className="block"
                    >
                      <div className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer border-l-4 border-l-green-600">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 font-semibold text-xs">
                                #{index + 1}
                              </span>
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {agency.description}
                              </h3>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Agency ID: {agency.id}</span>
                              <span className="font-semibold">{percentage.toFixed(2)}% of dept budget</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-green-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(agencyYearData.amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {agencyYearData.count.toLocaleString()} items
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {filteredAgencies.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No agencies found for {selectedYear}</p>
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

export default DepartmentPage
