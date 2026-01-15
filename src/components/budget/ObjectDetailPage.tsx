import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Package, ChartBarStacked, Calendar } from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import BudgetHeader from './BudgetHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { searchBudgetDocuments } from '@/lib/meilisearch'
import type { BudgetDocument } from '@/types/budget'

const ObjectDetailPage = () => {
  // Get route params (slugs are from URL, actual data comes from location.state)
  const { deptSlug: _deptSlug, agencySlug: _agencySlug } = useParams<{ deptSlug: string; agencySlug: string; objectSlug: string }>()
  const location = useLocation()
  const objectCode = location.state?.objectCode
  const objectName = location.state?.objectName
  const agencyId = location.state?.agencyId
  const agencyName = location.state?.agencyName
  const departmentId = location.state?.departmentId

  const [items, setItems] = useState<BudgetDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Load breadcrumb data
  const [department, setDepartment] = useState<{ id: string, description: string } | null>(null)
  const [agency, setAgency] = useState<{ id: string, description: string } | null>(null)

  // Load department and agency data for breadcrumbs
  useEffect(() => {
    const loadBreadcrumbData = async () => {
      try {
        const [deptRes, agencyRes] = await Promise.all([
          fetch('/data/gaa/aggregates/departments.json'),
          fetch('/data/gaa/aggregates/agencies.json')
        ])
        const deptData = await deptRes.json()
        const agencyData = await agencyRes.json()

        // Find department by ID
        if (departmentId) {
          const foundDept = deptData.data.find((d: any) => d.id === departmentId)
          if (foundDept) {
            setDepartment({ id: foundDept.id, description: foundDept.description })
          }
        }

        // Find agency by ID
        if (agencyId) {
          const foundAgency = agencyData.data.find((a: any) => a.id === agencyId)
          if (foundAgency) {
            setAgency({ id: foundAgency.id, description: foundAgency.description })
            // Also set department if not already set
            if (!department && !departmentId) {
              const foundDept = deptData.data.find((d: any) => d.id === foundAgency.department_id)
              if (foundDept) {
                setDepartment({ id: foundDept.id, description: foundDept.description })
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading breadcrumb data:', error)
      }
    }

    if (!department || !agency) {
      loadBreadcrumbData()
    }
  }, [departmentId, agencyId, department, agency])

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
          limit: 10000,
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

  const formatCurrency = (value: number) => {
    // Ensure value is a number
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '₱0.00'

    // MeiliSearch data stores amounts in MILLIONS, so multiply by 1,000,000
    const actualPesos = numValue * 1_000_000

    if (actualPesos >= 1_000_000_000_000) {
      return `₱${(actualPesos / 1_000_000_000_000).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}T`
    } else if (actualPesos >= 1_000_000_000) {
      return `₱${(actualPesos / 1_000_000_000).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}B`
    } else if (actualPesos >= 1_000_000) {
      return `₱${(actualPesos / 1_000_000).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}M`
    } else if (actualPesos >= 1_000) {
      return `₱${(actualPesos / 1_000).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}K`
    } else {
      return `₱${actualPesos.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    }
  }

  const totalAmount = items.reduce((sum, item) => {
    const amt = typeof item.amt === 'string' ? parseFloat(item.amt) : item.amt
    return sum + (isNaN(amt) ? 0 : amt)
  }, 0)
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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Sticky Header */}
        <BudgetHeader
          title={objectName || 'Object Details'}
          subtitle={`Object Code: ${objectCode} · ${agency?.description || agencyName || 'Agency'}`}
          icon={<Package className="h-5 w-5 md:h-6 md:w-6 text-white" />}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={(year) => {
            setSelectedYear(year)
            setCurrentPage(1)
          }}
          showSearch={false}
        />

        {/* Content Area with Padding */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-[1800px] mx-auto">
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
          <Card className="max-w-[1800px] mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarStacked className="h-5 w-5 text-indigo-600" />
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
