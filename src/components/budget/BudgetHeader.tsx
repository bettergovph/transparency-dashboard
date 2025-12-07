import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface BudgetHeaderProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  availableYears: number[]
  selectedYear: number
  onYearChange: (year: number) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
}

const BudgetHeader = ({
  title,
  subtitle,
  icon,
  availableYears,
  selectedYear,
  onYearChange,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true
}: BudgetHeaderProps) => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navLinks = [
    { path: '/budget', label: 'Overview' },
    { path: '/budget/departments', label: 'Departments' },
    { path: '/budget/regional', label: 'Regional' },
    { path: '/budget/allocations', label: 'Allocations' },
    { path: '/budget/search', label: 'Search' }
  ]

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Title, Navigation, and Year Selection Row */}
        <div className="flex items-center justify-between gap-6 max-w-[1800px] mx-auto">
          {/* Title Section */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 bg-blue-600 rounded-lg">
              {icon}
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 whitespace-nowrap">
                {title}
              </h1>
              <p className="text-xs text-gray-600 whitespace-nowrap">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold transition-colors whitespace-nowrap ${isActive(link.path)
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Year Tabs - Desktop */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${selectedYear === year
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: Navigation Links and Year Tabs */}
        <div className="lg:hidden mt-4 max-w-[1800px] mx-auto">
          {/* Navigation Links */}
          <div className="flex items-center gap-4 mb-3 border-b border-gray-200 pb-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold transition-colors ${isActive(link.path)
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-2'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Year Selection */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Select Year</h3>
            <div className="flex flex-wrap gap-2">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => onYearChange(year)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${selectedYear === year
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && onSearchChange && (
          <div className="mt-4 max-w-[1800px] mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BudgetHeader
