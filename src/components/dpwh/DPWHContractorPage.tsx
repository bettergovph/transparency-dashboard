import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Users, TrendingUp, MapPin, Calendar, DollarSign, Grid3x3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { dpwhIndex } from '@/lib/meilisearch'
import type { DPWHProject } from '@/types/dpwh'
import Navigation from '../Navigation'
import Footer from '../Footer'
import DPWHBrowser from './DPWHBrowser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

const DPWHContractorPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const contractorName = slug ? decodeURIComponent(slug) : ''

  const [projects, setProjects] = useState<DPWHProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [contractorName])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const searchResults = await dpwhIndex.search('', {
        filter: `contractor = "${contractorName}"`,
        limit: 10000
      })
      setProjects(searchResults.hits as any[])
    } catch (error) {
      console.error('Error loading contractor projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-PH').format(num)
  }

  // Calculate statistics
  const totalProjects = projects.length
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  const totalAmountPaid = projects.reduce((sum, p) => sum + (p.amountPaid || 0), 0)
  const avgProgress = projects.length > 0
    ? projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length
    : 0

  // Projects per year data
  const projectsByYear = projects.reduce((acc, project) => {
    const year = project.infraYear
    if (!acc[year]) {
      acc[year] = { year, count: 0, budget: 0 }
    }
    acc[year].count++
    acc[year].budget += project.budget || 0
    return acc
  }, {} as Record<number, { year: number; count: number; budget: number }>)

  const yearChartData = Object.values(projectsByYear)
    .sort((a, b) => a.year - b.year)
    .map(d => ({
      year: d.year.toString(),
      count: d.count,
      budget: d.budget / 1_000_000
    }))

  // Projects per region data
  const projectsByRegion = projects.reduce((acc, project) => {
    const region = project.location?.region || 'Unknown'
    if (!acc[region]) {
      acc[region] = { region, count: 0, budget: 0 }
    }
    acc[region].count++
    acc[region].budget += project.budget || 0
    return acc
  }, {} as Record<string, { region: string; count: number; budget: number }>)

  const regionChartData = Object.values(projectsByRegion)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white px-3 py-2 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-900">{data.year || data.region}</p>
          {data.count !== undefined && (
            <p className="text-sm text-blue-600">Projects: {formatNumber(data.count)}</p>
          )}
          {data.budget !== undefined && (
            <p className="text-sm text-green-600">
              Budget: {typeof data.budget === 'number' && data.budget < 10000
                ? `₱${formatNumber(Math.round(data.budget))}M`
                : formatCurrency(data.budget)}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contractor data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>{contractorName} - DPWH Contractors</title>
        <meta name="description" content={`View all DPWH infrastructure projects by ${contractorName}. Statistics, charts, and project details.`} />
      </Helmet>
      <Navigation />

      <div className="px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{contractorName}</h1>
          </div>
          <p className="text-gray-600">
            Complete portfolio of DPWH infrastructure projects
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                Total Projects
              </CardDescription>
              <CardTitle className="text-2xl text-blue-600">
                {formatNumber(totalProjects)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Infrastructure contracts</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Budget
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {formatCurrency(totalBudget)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Allocated funds</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount Paid
              </CardDescription>
              <CardTitle className="text-2xl text-purple-600">
                {formatCurrency(totalAmountPaid)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Total payments</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Progress
              </CardDescription>
              <CardTitle className="text-2xl text-orange-600">
                {avgProgress.toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Across all projects</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid - Year chart 3/4 width, Regions 1/4 width */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Projects per Year */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-blue-600" />
                Projects per Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={yearChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Budget (₱M)', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Projects" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="budget" fill="#10b981" name="Budget (₱M)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Region Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-green-600" />
                Top 10 Regions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={regionChartData}
                    dataKey="count"
                    nameKey="region"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={(entry: any) => `${entry.count}`}
                    labelLine={{ stroke: '#666', strokeWidth: 1 }}
                  >
                    {regionChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* DPWHBrowser with search/filter and table */}
        <DPWHBrowser filterType="contractor" filterValue={slug} embedded />
      </div>

      <Footer />
    </div>
  )
}

export default DPWHContractorPage
