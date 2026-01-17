import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import type { DPWHProject } from '@/types/dpwh'

interface AggregateData {
  topRegions: Array<{ region: string; count: number; budget: number }>
  topContractors: Array<{ contractor: string; count: number; budget: number }>
  topCategories: Array<{ category: string; count: number; budget: number }>
  statusDistribution: Array<{ status: string; count: number; budget: number }>
  yearDistribution: Array<{ year: string; count: number; budget: number }>
  topProvinces: Array<{ province: string; count: number; budget: number }>
}

interface DPWHVisualizationsTabProps {
  results: DPWHProject[]
  aggregates: AggregateData
  totalBudget: number
  avgProgress: number
}

const CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#1e40af', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']
const STATUS_COLORS: Record<string, string> = {
  'Completed': '#10b981',
  'On-Going': '#3b82f6',
  'For Procurement': '#f59e0b',
  'Not Yet Started': '#6b7280',
  'Terminated': '#ef4444'
}

const DPWHVisualizationsTab: React.FC<DPWHVisualizationsTabProps> = ({ results, aggregates, totalBudget, avgProgress }) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-PH').format(num)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompact = (num: number) => {
    if (num >= 1e9) return `₱${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `₱${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `₱${(num / 1e3).toFixed(1)}K`
    return formatCurrency(num)
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm p-3">
          <p className="text-xs text-gray-600 mb-1">Total Projects</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(results.length)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3">
          <p className="text-xs text-gray-600 mb-1">Total Budget</p>
          <p className="text-xl font-bold text-gray-900">{formatCompact(totalBudget)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3">
          <p className="text-xs text-gray-600 mb-1">Avg Progress</p>
          <p className="text-xl font-bold text-gray-900">{avgProgress.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3">
          <p className="text-xs text-gray-600 mb-1">Regions</p>
          <p className="text-xl font-bold text-gray-900">{aggregates.topRegions.length}</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aggregates.statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="status" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => formatNumber(value)} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {aggregates.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Budget by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={aggregates.statusDistribution}
                dataKey="budget"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry: any) => `${entry.status}: ${formatCompact(entry.budget)}`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              >
                {aggregates.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Regions - Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top 10 Regions by Budget</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={aggregates.topRegions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="region" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => formatCompact(value)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="budget" radius={[8, 8, 0, 0]}>
                {aggregates.topRegions.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top Regions - Table View</h3>
          <div className="overflow-y-auto max-h-[350px]">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Projects</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {aggregates.topRegions.map((item, index) => (
                  <tr key={item.region} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-900 font-medium">{item.region}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatNumber(item.count)}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">{formatCompact(item.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Contractors - Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top 10 Contractors by Budget</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={aggregates.topContractors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={(value) => formatCompact(value)} tick={{ fontSize: 11 }} />
              <YAxis dataKey="contractor" type="category" width={200} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="budget" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top Contractors - Table View</h3>
          <div className="overflow-y-auto max-h-[350px]">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Contractor</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Projects</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {aggregates.topContractors.map((item, index) => (
                  <tr key={item.contractor} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-900 font-medium truncate max-w-[200px]" title={item.contractor}>
                      {item.contractor}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatNumber(item.count)}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">{formatCompact(item.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Categories - Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top 10 Categories by Budget</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={aggregates.topCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={(value) => formatCompact(value)} tick={{ fontSize: 11 }} />
              <YAxis dataKey="category" type="category" width={200} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="budget" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top Categories - Table View</h3>
          <div className="overflow-y-auto max-h-[350px]">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Projects</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {aggregates.topCategories.map((item, index) => (
                  <tr key={item.category} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-900 font-medium truncate max-w-[200px]" title={item.category}>
                      {item.category}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatNumber(item.count)}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">{formatCompact(item.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Provinces - Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top 10 Provinces by Budget</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={aggregates.topProvinces} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={(value) => formatCompact(value)} tick={{ fontSize: 11 }} />
              <YAxis dataKey="province" type="category" width={150} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="budget" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Top Provinces - Table View</h3>
          <div className="overflow-y-auto max-h-[350px]">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Province</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Projects</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {aggregates.topProvinces.map((item, index) => (
                  <tr key={item.province} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-900 font-medium">{item.province}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatNumber(item.count)}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">{formatCompact(item.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Year Distribution */}
      {aggregates.yearDistribution.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Projects and Budget by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aggregates.yearDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatCompact(value)} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'count') return [formatNumber(value), 'Projects']
                  if (name === 'budget') return [formatCurrency(value), 'Budget']
                  return value
                }}
              />
              <Bar yAxisId="left" dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Projects" />
              <Bar yAxisId="right" dataKey="budget" fill="#60a5fa" radius={[8, 8, 0, 0]} name="Budget" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default DPWHVisualizationsTab
