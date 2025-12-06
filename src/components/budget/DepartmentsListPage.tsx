import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Building2, TrendingUp, Search } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toSlug } from '@/lib/utils'

interface Department {
  id: string
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

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000_000) {
      return `₱${(value / 1_000_000_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}T`
    } else if (value >= 1_000_000_000) {
      return `₱${(value / 1_000_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`
    } else {
      return `₱${(value / 1_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`
    }
  }

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Government Departments</h1>
                <p className="text-gray-600 mt-1">Browse department budgets and drill down to agencies</p>
              </div>
            </div>

            {/* Year Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
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

            {/* Search Bar */}
            <div className="relative">
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
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <div className="grid grid-cols-1 gap-4">
            {filteredDepartments.map((dept, index) => {
              const yearData = dept.years[String(selectedYear)]
              const percentage = totalBudget > 0 ? (yearData.amount / totalBudget) * 100 : 0

              return (
                <Link
                  key={dept.id}
                  to={`/budget/departments/${toSlug(dept.description)}`}
                  state={{ departmentId: dept.id, departmentName: dept.description }}
                >
                  <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-600">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                              #{index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {dept.description}
                              </h3>
                              <p className="text-sm text-gray-500">Department ID: {dept.id}</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Share of total budget</span>
                              <span className="font-semibold">{percentage.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(yearData.amount)}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {yearData.count.toLocaleString()} items
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                            <TrendingUp className="h-3 w-3" />
                            View agencies
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {filteredDepartments.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No departments found</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Try adjusting your search terms' : `No departments with budget data for ${selectedYear}`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}

export default DepartmentsListPage
