import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { HardHat, TrendingUp, Building2, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts'
import Navigation from '../Navigation'
import Footer from '../Footer'

interface YearData {
  year: string
  project_count: number
  total_budget: number
  avg_budget: number
  avg_progress: number
  statuses: Record<string, number>
}

interface RegionData {
  region: string
  project_count: number
  total_budget: number
  avg_progress: number
  top_categories: Array<{ category: string; count: number }>
}

interface StatusData {
  status: string
  project_count: number
  total_budget: number
  avg_progress: number
}

interface CategoryData {
  category: string
  project_count: number
  total_budget: number
  avg_progress: number
}

interface AggregateResponse<T> {
  metadata: {
    title: string
    total_projects: number
    total_budget: number
    avg_progress: number
  }
  data: T[]
}

const STATUS_COLORS: Record<string, string> = {
  'Completed': '#10b981',
  'On-Going': '#3b82f6',
  'For Procurement': '#f59e0b',
  'Not Yet Started': '#6b7280',
  'Terminated': '#ef4444'
}

const CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb']

const DPWHOverview = () => {
  const [years, setYears] = useState<YearData[]>([])
  const [regions, setRegions] = useState<RegionData[]>([])
  const [statuses, setStatuses] = useState<StatusData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [metadata, setMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [yearsRes, regionsRes, statusesRes, categoriesRes] = await Promise.all([
        fetch('/data/dpwh/aggregates/years.json'),
        fetch('/data/dpwh/aggregates/regions.json'),
        fetch('/data/dpwh/aggregates/statuses.json'),
        fetch('/data/dpwh/aggregates/categories.json')
      ])

      const yearsData: AggregateResponse<YearData> = await yearsRes.json()
      const regionsData: AggregateResponse<RegionData> = await regionsRes.json()
      const statusesData: AggregateResponse<StatusData> = await statusesRes.json()
      const categoriesData: AggregateResponse<CategoryData> = await categoriesRes.json()

      setYears(yearsData.data.filter(y => y.year !== '2026')) // Exclude incomplete year
      setRegions(regionsData.data)
      setStatuses(statusesData.data)
      setCategories(categoriesData.data.slice(0, 10)) // Top 10 categories
      setMetadata(yearsData.metadata)
    } catch (error) {
      console.error('Error loading data:', error)
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

  const formatCompact = (amount: number) => {
    if (amount >= 1e12) return `₱${(amount / 1e12).toFixed(2)}T`
    if (amount >= 1e9) return `₱${(amount / 1e9).toFixed(2)}B`
    if (amount >= 1e6) return `₱${(amount / 1e6).toFixed(2)}M`
    return formatCurrency(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-PH').format(num)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading DPWH Infrastructure Overview...</p>
        </div>
      </div>
    )
  }

  const totalProjects = metadata?.total_projects || 0
  const totalBudget = metadata?.total_budget || 0
  const avgProgress = metadata?.avg_progress || 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>DPWH Infrastructure Overview - Transparency Dashboard</title>
        <meta name="description" content="Comprehensive overview of DPWH infrastructure projects across the Philippines. View budgets, progress, and project statistics." />
        <meta name="keywords" content="DPWH, infrastructure, Philippines, overview, statistics, budget" />
      </Helmet>
      <Navigation />

      <div className="px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <HardHat className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">DPWH Infrastructure Overview</h1>
          </div>
          <p className="text-gray-600">
            {metadata ? `${formatNumber(totalProjects)} projects · ${formatCompact(totalBudget)} total budget · ${avgProgress.toFixed(1)}% avg progress` : 'Loading...'}
          </p>
        </div>

        {/* Key Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(totalProjects)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Total Budget</p>
            <p className="text-2xl font-bold text-gray-900">{formatCompact(totalBudget)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Avg Progress</p>
            <p className="text-2xl font-bold text-gray-900">{avgProgress.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Regions</p>
            <p className="text-2xl font-bold text-gray-900">{regions.length}</p>
          </div>
        </div>

        {/* Project Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Project Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statuses as any}
                  dataKey="project_count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.status} (${(entry.percent * 100).toFixed(1)}%)`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}                  
                >
                  {statuses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {statuses.map((status) => (
                <div key={status.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS[status.status] }}></div>
                    <span className="text-xs font-medium text-gray-700">{status.status}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatNumber(status.project_count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Budget by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statuses} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(value) => formatCompact(value)} />
                <YAxis dataKey="status" type="category" width={120} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="total_budget" radius={[0, 8, 8, 0]}>
                  {statuses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget and Projects by Year */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Budget and Projects Over Time</h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={years}>
              <defs>
                <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" />
              <YAxis yAxisId="left" tickFormatter={(value) => formatCompact(value)} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'total_budget') return [formatCurrency(value), 'Total Budget']
                  if (name === 'project_count') return [formatNumber(value), 'Projects']
                  return value
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="total_budget" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBudget)" name="Total Budget" />
              <Area yAxisId="right" type="monotone" dataKey="project_count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorProjects)" name="Projects" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Trend */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Average Progress by Year</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={years}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="avg_progress" stroke="#3b82f6" strokeWidth={3} name="Avg Progress" dot={{ fill: '#3b82f6', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top Project Categories</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={(value) => formatNumber(value)} />
              <YAxis dataKey="category" type="category" width={200} />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'project_count') return [formatNumber(value), 'Projects']
                  if (name === 'total_budget') return [formatCurrency(value), 'Budget']
                  return value
                }}
              />
              <Legend />
              <Bar dataKey="project_count" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Projects" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Regions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top 10 Regions by Budget</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={regions.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="region" angle={-45} textAnchor="end" height={120} />
              <YAxis tickFormatter={(value) => formatCompact(value)} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="total_budget" radius={[8, 8, 0, 0]}>
                {regions.slice(0, 10).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {regions.slice(0, 6).map((region, index) => (
              <Link
                key={region.region}
                to={`/dpwh/regions/${encodeURIComponent(region.region)}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{region.region}</p>
                    <p className="text-xs text-gray-500">{formatNumber(region.project_count)} projects</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCompact(region.total_budget)}</p>
                  <p className="text-xs text-gray-500">{region.avg_progress.toFixed(1)}% progress</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/dpwh"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-blue-600"
          >
            <HardHat className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Browse All Projects</h3>
            <p className="text-sm text-gray-600">Search and filter through all infrastructure projects</p>
          </Link>

          <Link
            to="/dpwh/regions"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-blue-600"
          >
            <MapPin className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">View by Region</h3>
            <p className="text-sm text-gray-600">Explore projects across different regions</p>
          </Link>

          <Link
            to="/dpwh/contractors"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-blue-600"
          >
            <Building2 className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Browse Contractors</h3>
            <p className="text-sm text-gray-600">View contractor statistics and projects</p>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default DPWHOverview
