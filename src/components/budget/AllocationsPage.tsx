import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Package, TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import Navigation from '../Navigation'
import Footer from '../Footer'
import BudgetHeader from './BudgetHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatGAAAmount } from '@/lib/formatGAAAmount'
import { toSlug } from '@/lib/utils'

interface ObjectData {
  id: string
  object_code: string
  description: string
  department_id: string
  agency_id: string
  years: Record<string, { count: number; amount: number }>
}

interface ObjectsData {
  metadata: {
    title: string
    source: string
    total_items: number
  }
  data: ObjectData[]
}

const AllocationsPage = () => {
  const [objectsData, setObjectsData] = useState<ObjectsData | null>(null)
  const [departments, setDepartments] = useState<Map<string, { id: string; description: string }>>(new Map())
  const [agencies, setAgencies] = useState<Map<string, { id: string; description: string; department_id: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    loadObjectsData()
    loadMappingData()
  }, [])

  // Reset to page 1 when search or year changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedYear])

  const loadObjectsData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/data/gaa/aggregates/objects.json')
      const data: ObjectsData = await response.json()
      setObjectsData(data)

      // Extract available years from first object
      if (data.data.length > 0) {
        const years = Object.keys(data.data[0].years).map(Number).sort((a, b) => b - a)
        setAvailableYears(years)
        if (years.length > 0) {
          setSelectedYear(years[0])
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading objects data:', error)
      setLoading(false)
    }
  }

  const loadMappingData = async () => {
    try {
      const [deptRes, agencyRes] = await Promise.all([
        fetch('/data/gaa/aggregates/departments.json'),
        fetch('/data/gaa/aggregates/agencies.json')
      ])
      const deptData = await deptRes.json()
      const agencyData = await agencyRes.json()

      // Create department map
      const deptMap = new Map()
      deptData.data.forEach((dept: any) => {
        deptMap.set(dept.id, { id: dept.id, description: dept.description })
      })
      setDepartments(deptMap)

      // Create agency map
      const agencyMap = new Map()
      agencyData.data.forEach((agency: any) => {
        agencyMap.set(agency.id, { id: agency.id, description: agency.description, department_id: agency.department_id })
      })
      setAgencies(agencyMap)
    } catch (error) {
      console.error('Error loading mapping data:', error)
    }
  }

  const formatCurrency = (value: number) => formatGAAAmount(value)

  if (loading || !objectsData) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Budget Allocations...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Filter and sort objects
  const filteredObjects = objectsData.data
    .filter(obj => {
      const hasDataForYear = obj.years[String(selectedYear)]?.amount > 0
      if (!hasDataForYear) return false

      if (!searchQuery) return true

      const query = searchQuery.toLowerCase()
      return obj.description.toLowerCase().includes(query) ||
        obj.object_code.includes(query) ||
        obj.department_id.toLowerCase().includes(query) ||
        obj.agency_id.toLowerCase().includes(query)
    })
    .sort((a, b) => {
      const aAmount = a.years[String(selectedYear)]?.amount || 0
      const bAmount = b.years[String(selectedYear)]?.amount || 0
      return bAmount - aAmount
    })

  const totalAllocation = filteredObjects.reduce((sum, obj) => {
    return sum + (obj.years[String(selectedYear)]?.amount || 0)
  }, 0)

  const totalItems = filteredObjects.reduce((sum, obj) => {
    return sum + (obj.years[String(selectedYear)]?.count || 0)
  }, 0)

  // Pagination
  const totalPages = Math.ceil(filteredObjects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedObjects = filteredObjects.slice(startIndex, endIndex)

  return (
    <>
      <Helmet>
        <title>Allocations - GAA Budget Browser</title>
        <meta name="description" content="Browse all budget allocation objects from the Philippine General Appropriations Act (GAA)." />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Sticky Header */}
        <BudgetHeader
          title="Allocations"
          subtitle="Browse all budget allocation objects"
          icon={<Package className="h-5 w-5 md:h-6 md:w-6 text-white" />}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by object, code, department, or agency..."
          showSearch={true}
        />

        {/* Content Area with Padding */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-[1800px] mx-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Objects ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {filteredObjects.length.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Budget allocation types</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Allocation ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(totalAllocation)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Combined budget</p>
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
                <p className="text-xs text-gray-500">Budget entries</p>
              </CardContent>
            </Card>
          </div>

          {/* Objects Table/Cards */}
          <div className="max-w-[1800px] mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Budget Allocations ({selectedYear})
              </h2>
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredObjects.length)} of {filteredObjects.length.toLocaleString()}
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block mb-6">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Object Code
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Allocation
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Trend
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedObjects.map((obj, index) => {
                        const globalRank = startIndex + index + 1
                        const yearData = obj.years[String(selectedYear)]

                        // Prepare year-over-year data for mini chart
                        const chartData = availableYears
                          .map(year => ({
                            year,
                            amount: obj.years[String(year)]?.amount || 0
                          }))
                          .sort((a, b) => a.year - b.year)

                        // Calculate YoY change
                        const previousYear = selectedYear - 1
                        const previousYearAmount = obj.years[String(previousYear)]?.amount || 0
                        const yoyChange = previousYearAmount > 0
                          ? ((yearData.amount - previousYearAmount) / previousYearAmount) * 100
                          : 0

                        const department = departments.get(obj.department_id)
                        const agency = agencies.get(obj.agency_id)

                        return (
                          <tr key={obj.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                {globalRank}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                {obj.object_code}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {department && agency ? (
                                <Link
                                  to={`/budget/departments/${toSlug(department.description)}/agencies/${toSlug(agency.description)}/objects/${toSlug(obj.description)}`}
                                  state={{
                                    objectId: obj.id,
                                    objectCode: obj.object_code,
                                    objectName: obj.description,
                                    agencyId: agency.id,
                                    agencyName: agency.description,
                                    departmentId: department.id,
                                    departmentName: department.description
                                  }}
                                  className="block max-w-md"
                                >
                                  <p className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline line-clamp-2">
                                    {obj.description}
                                  </p>
                                </Link>
                              ) : (
                                <div className="max-w-md">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                    {obj.description}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {department ? (
                                <Link
                                  to={`/budget/departments/${toSlug(department.description)}`}
                                  state={{ departmentId: department.id, departmentName: department.description }}
                                  className="block max-w-xs"
                                >
                                  <p className="text-xs text-blue-600 hover:text-blue-800 hover:underline line-clamp-2">
                                    {department.description}
                                  </p>
                                </Link>
                              ) : (
                                <div className="max-w-xs">
                                  <p className="text-xs text-gray-600 line-clamp-2">
                                    {obj.department_id}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-blue-600">
                                {formatCurrency(yearData.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-sm text-gray-700">
                                {yearData.count.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <ResponsiveContainer width={60} height={30}>
                                  <LineChart data={chartData}>
                                    <Line
                                      type="monotone"
                                      dataKey="amount"
                                      stroke="#2563eb"
                                      strokeWidth={1.5}
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                                {yoyChange !== 0 && (
                                  <span className={`text-xs font-semibold flex items-center gap-1 ${yoyChange > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    <TrendingUp className={`h-3 w-3 ${yoyChange < 0 ? 'rotate-180' : ''
                                      }`} />
                                    {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 mb-6">
              {paginatedObjects.map((obj, index) => {
                const globalRank = startIndex + index + 1
                const yearData = obj.years[String(selectedYear)]

                const chartData = availableYears
                  .map(year => ({
                    year,
                    amount: obj.years[String(year)]?.amount || 0
                  }))
                  .sort((a, b) => a.year - b.year)

                const previousYear = selectedYear - 1
                const previousYearAmount = obj.years[String(previousYear)]?.amount || 0
                const yoyChange = previousYearAmount > 0
                  ? ((yearData.amount - previousYearAmount) / previousYearAmount) * 100
                  : 0

                const department = departments.get(obj.department_id)
                const agency = agencies.get(obj.agency_id)

                return (
                  <Card key={obj.id} className="border-l-4 border-l-blue-600">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold text-sm shrink-0">
                            #{globalRank}
                          </span>
                          <div className="min-w-0 flex-1">
                            {department && agency ? (
                              <Link
                                to={`/budget/departments/${toSlug(department.description)}/agencies/${toSlug(agency.description)}/objects/${toSlug(obj.description)}`}
                                state={{
                                  objectId: obj.id,
                                  objectCode: obj.object_code,
                                  objectName: obj.description,
                                  agencyId: agency.id,
                                  agencyName: agency.description,
                                  departmentId: department.id,
                                  departmentName: department.description
                                }}
                              >
                                <h3 className="text-base font-bold text-blue-600 hover:text-blue-800 hover:underline line-clamp-2">
                                  {obj.description}
                                </h3>
                              </Link>
                            ) : (
                              <h3 className="text-base font-bold text-gray-900 line-clamp-2">
                                {obj.description}
                              </h3>
                            )}
                            <p className="text-xs font-mono text-gray-500 mt-0.5 bg-gray-100 px-2 py-0.5 rounded inline-block">
                              {obj.object_code}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Department</p>
                          {department ? (
                            <Link
                              to={`/budget/departments/${toSlug(department.description)}`}
                              state={{ departmentId: department.id, departmentName: department.description }}
                            >
                              <p className="text-sm text-blue-600 hover:text-blue-800 hover:underline line-clamp-2">{department.description}</p>
                            </Link>
                          ) : (
                            <p className="text-sm text-gray-700 line-clamp-2">{obj.department_id}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Allocation</p>
                            <p className="text-sm font-bold text-blue-600">{formatCurrency(yearData.amount)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Line Items</p>
                            <p className="text-sm font-bold text-gray-900">{yearData.count.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-500">Budget Trend</p>
                            {yoyChange !== 0 && (
                              <span className={`text-xs font-semibold flex items-center gap-1 ${yoyChange > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                <TrendingUp className={`h-3 w-3 ${yoyChange < 0 ? 'rotate-180' : ''
                                  }`} />
                                {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <ResponsiveContainer width="100%" height={50}>
                            <LineChart data={chartData}>
                              <XAxis
                                dataKey="year"
                                tick={{ fontSize: 9 }}
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
                                dot={{ fill: '#2563eb', r: 2 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm ${currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {filteredObjects.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No allocations found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search terms' : `No allocation data for ${selectedYear}`}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default AllocationsPage
