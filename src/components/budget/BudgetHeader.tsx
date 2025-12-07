import { Search } from 'lucide-react'

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
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Desktop: Single Row with Title, Search, and Year Selection */}
        <div className="hidden lg:flex items-center gap-4 max-w-[1800px] mx-auto">
          {/* Title Section */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-600 rounded-lg">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap leading-tight">
                {title}
              </h1>
              <p className="text-xs text-gray-600 whitespace-nowrap">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && onSearchChange && (
            <div className="flex-1 min-w-0 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}

                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          )}

          {/* Year Tabs */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className={`px-3 py-1.5 rounded-md font-semibold text-sm transition-all whitespace-nowrap ${selectedYear === year
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: Stacked Layout */}
        <div className="lg:hidden max-w-[1800px] mx-auto">
          {/* Title Section */}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {title}
              </h1>
              <p className="text-xs text-gray-600 truncate">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && onSearchChange && (
            <div className="mb-3" bg-white rounded-lg shadow-sm>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          )}

          {/* Year Selection */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Select Year</h3>
            <div className="flex flex-wrap gap-2">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => onYearChange(year)}
                  className={`px-3 py-1.5 rounded-md font-semibold text-sm transition-all ${selectedYear === year
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BudgetHeader
