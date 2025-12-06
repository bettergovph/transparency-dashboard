import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Package, ChevronRight, ArrowLeft, TrendingUp, DollarSign, Calendar, Filter } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatGAAAmount } from '@/lib/formatGAAAmount'
import { searchBudgetDocuments } from '@/lib/meilisearch'
import type { BudgetDocument } from '@/types/budget'

const ObjectDetailPage = () => {
  const { deptSlug, agencySlug, objectSlug } = useParams<{ deptSlug: string; agencySlug: string; objectSlug: string }>()
  const location = useLocation()
  const objectId = location.state?.objectId
  const objectCode = location.state?.objectCode
  const objectName = location.state?.objectName
  const agencyId = location.state?.agencyId
  const agencyName = location.state?.agencyName
  const departmentId = location.state?.departmentId
  const departmentName = location.state?.departmentName

  const [items, setItems] = useState<BudgetDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    loadData()
  }, [objectCode, selectedYear, currentPage])

  const loadData = async () => {
    if (!objectCode) return

    try {
      setLoading(true)

      // Build filter for Meilisearch
      const filters: string[] = []

      // Filter by object code
      filters.push(`uacs_sobj_cd = "${objectCode}"`)

      // Filter by department and agency descriptions if available
      if (departmentId) {
        filters.push(`uacs_dpt_dsc = "${departmentId}"`)
      }
      if (agencyName) {
        filters.push(`uacs_agy_dsc = "${agencyName}"`)
      }

      // Filter by year (required)
      filters.push(`year = ${selectedYear}`)

      const filterString = filters.join(' AND ')

      const result = await searchBudgetDocuments({
        query: '',
        filter: filterString,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort: ['year:desc', 'amt:desc']
      })

      setItems(result.hits)
      setTotalItems(result.estimatedTotalHits)

      // Extract available years from a quick query to get all years for this object
      if (availableYears.length === 0) {
        const yearsFilterString = filters.filter(f => !f.includes('year =')).join(' AND ')
        const yearsResult = await searchBudgetDocuments({
          query: '',
          filter: yearsFilterString,
          limit: 1000,
        })
        const years = Array.from(new Set(yearsResult.hits.map(item => item.year))).sort((a, b) => b - a)
        setAvailableYears(years)
        // If selected year is not available, set to first available year
        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[0])
          return // Re-run loadData with new year
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading object details:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => formatGAAAmount(value)

  const totalAmount = items.reduce((sum, item) => sum + item.amt, 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (loading && items.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Object Details...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>{objectName || 'Object'} - GAA Budget Browser</title>
        <meta name="description" content={`Browse budget line items for ${objectName} under ${agencyName}`} />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
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
            <Link
              to={`/budget/departments/${deptSlug}/${agencySlug}`}
              state={{ agencyId, agencyName, departmentId, departmentName }}
              className="hover:text-blue-600"
            >
              {agencyName}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">{objectName}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <Link
              to={`/budget/departments/${deptSlug}/${agencySlug}`}
              state={{ agencyId, agencyName, departmentId, departmentName }}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {agencyName}
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-600 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{objectName}</h1>
                <p className="text-gray-600 mt-1">Object Code: {objectCode} • {agencyName}</p>
              </div>
            </div>

            {/* Year Filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-gray-500" />
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year)
                    setCurrentPage(1) // Reset to first page when changing year
                  }}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-indigo-600">
              <CardHeader className="pb-3">
                <CardDescription>Total Amount ({selectedYear})</CardDescription>
                <CardTitle className="text-2xl text-indigo-600">
                  {formatCurrency(totalAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Current page total</p>
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

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <CardDescription>Current Page</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {currentPage} / {totalPages}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Showing {items.length} items</p>
              </CardContent>
            </Card>
          </div>

          {/* Items List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-600" />
                Budget Line Items
              </CardTitle>
              <CardDescription>Detailed budget allocations for {objectName}</CardDescription>
            </CardHeader>
            <CardContent>
              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-semibold text-indigo-600">{item.year}</span>
                          </div>

                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            {item.dsc}
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                            {item.uacs_oper_dsc && (
                              <div>
                                <span className="font-semibold">Operating Unit:</span> {item.uacs_oper_dsc}
                              </div>
                            )}
                            {item.uacs_fundsubcat_dsc && (
                              <div>
                                <span className="font-semibold">Fund:</span> {item.uacs_fundsubcat_dsc}
                              </div>
                            )}
                            {item.uacs_exp_dsc && (
                              <div>
                                <span className="font-semibold">Expense:</span> {item.uacs_exp_dsc}
                              </div>
                            )}
                            {item.uacs_div_dsc && (
                              <div>
                                <span className="font-semibold">Division:</span> {item.uacs_div_dsc}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xl font-bold text-indigo-600">
                            {formatCurrency(item.amt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No budget items found</p>
                  <p className="text-gray-500 text-sm mt-2">Try adjusting the filters</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} • {totalItems.toLocaleString()} total items
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
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

export default ObjectDetailPage
