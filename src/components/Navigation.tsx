import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Building2, Grid3x3, MapPin, Menu, X, Facebook, ChevronDown, TrendingUp, ShoppingCart, Coins, ChartBarStackedIcon, HardHat, Search, CircleQuestionMark } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const Navigation = () => {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [procurementDropdownOpen, setProcurementDropdownOpen] = useState(false)
  const [taxDropdownOpen, setTaxDropdownOpen] = useState(false)
  const [budgetDropdownOpen, setBudgetDropdownOpen] = useState(false)
  const [dpwhDropdownOpen, setDpwhDropdownOpen] = useState(false)
  const procurementDropdownRef = useRef<HTMLDivElement>(null)
  const taxDropdownRef = useRef<HTMLDivElement>(null)
  const budgetDropdownRef = useRef<HTMLDivElement>(null)
  const dpwhDropdownRef = useRef<HTMLDivElement>(null)

  const procurementItems = [
    { path: '/procurement', label: 'Search Records', icon: Search },
    { path: '/contractors', label: 'Contractors', icon: Users },
    { path: '/organizations', label: 'Organizations', icon: Building2 },
    { path: '/locations', label: 'Locations', icon: MapPin },
    { path: '/categories', label: 'Categories', icon: Grid3x3 },
  ]

  const taxCollectionItems = [
    { path: '/bir', label: 'BIR Collection Statistics', icon: TrendingUp },
    { path: '/treasury', label: 'Treasury Cash Operations', icon: Coins },
  ]

  const budgetItems = [
    { path: '/budget', label: 'Overview', icon: ChartBarStackedIcon },
    { path: '/budget/departments', label: 'Departments', icon: Building2 },
    { path: '/budget/regional', label: 'Regional', icon: MapPin },
    { path: '/budget/allocations', label: 'Allocations', icon: Grid3x3 },
    { path: '/budget/search', label: 'Search', icon: TrendingUp },
  ]

  const dpwhItems = [
    { path: '/dpwh', label: 'Browse Projects', icon: TrendingUp },
    { path: '/dpwh/overview', label: 'Overview', icon: Building2 },
    // { path: '/dpwh/categories', label: 'Categories', icon: Grid3x3 },
    { path: '/dpwh/regions', label: 'Regions', icon: MapPin },
    // { path: '/dpwh/provinces', label: 'Provinces', icon: Building2 },
    { path: '/dpwh/contractors', label: 'Contractors', icon: Users },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const isProcurementActive = () => {
    return procurementItems.some(item => isActive(item.path)) || location.pathname === '/procurement'
  }

  const isTaxCollectionActive = () => {
    return taxCollectionItems.some(item => isActive(item.path))
  }

  const isBudgetActive = () => {
    return budgetItems.some(item => isActive(item.path))
  }

  const isDpwhActive = () => {
    return dpwhItems.some(item => isActive(item.path))
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (procurementDropdownRef.current && !procurementDropdownRef.current.contains(event.target as Node)) {
        setProcurementDropdownOpen(false)
      }
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target as Node)) {
        setTaxDropdownOpen(false)
      }
      if (budgetDropdownRef.current && !budgetDropdownRef.current.contains(event.target as Node)) {
        setBudgetDropdownOpen(false)
      }
      if (dpwhDropdownRef.current && !dpwhDropdownRef.current.contains(event.target as Node)) {
        setDpwhDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-24">
          <div className="flex items-center gap-4 lg:gap-8">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-8">
              <img
                src="https://bettergov.ph/logos/svg/BetterGov_Icon-Primary.svg"
                alt="BetterGov.ph Logo"
                className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12"
              />
              <Link to="/">
                <h1 className="text-xs sm:text-sm lg:text-lg font-bold text-black font-figtree">
                  Transparency Dashboard
                </h1>
                <p className="text-gray-600 text-xs hidden sm:block">by BetterGov.ph</p>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {/* Home */}
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm xl:text-md transition-colors ${isActive('/')
                  ? 'border-b text-blue-600 font-bold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <Home className="h-4 w-4" />
                Home
              </Link>

              {/* Procurement Dropdown */}
              <div className="relative" ref={procurementDropdownRef}>
                <button
                  onClick={() => setProcurementDropdownOpen(!procurementDropdownOpen)}
                  className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm xl:text-md transition-colors ${isProcurementActive()
                    ? 'border-b text-blue-600 font-bold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Procurement
                  <ChevronDown className={`h-4 w-4 transition-transform ${procurementDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {procurementDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {procurementItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${isActive(item.path)
                            ? 'bg-blue-50 text-blue-600 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          onClick={() => setProcurementDropdownOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* DPWH Dropdown */}
              <div className="relative" ref={dpwhDropdownRef}>
                <button
                  onClick={() => setDpwhDropdownOpen(!dpwhDropdownOpen)}
                  className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm xl:text-md transition-colors ${isDpwhActive()
                    ? 'border-b text-blue-600 font-bold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <HardHat className="h-4 w-4" />
                  DPWH
                  <ChevronDown className={`h-4 w-4 transition-transform ${dpwhDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dpwhDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {dpwhItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${isActive(item.path)
                            ? 'bg-blue-50 text-blue-600 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          onClick={() => setDpwhDropdownOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Budget Dropdown */}
              <div className="relative" ref={budgetDropdownRef}>
                <button
                  onClick={() => setBudgetDropdownOpen(!budgetDropdownOpen)}
                  className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm xl:text-md transition-colors ${isBudgetActive()
                    ? 'border-b text-blue-600 font-bold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <span className="text-gray-700 mr-1">₱</span>
                  Budget
                  <ChevronDown className={`h-4 w-4 transition-transform ${budgetDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {budgetDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {budgetItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${isActive(item.path)
                            ? 'bg-blue-50 text-blue-600 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          onClick={() => setBudgetDropdownOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Tax Collection Dropdown */}
              <div className="relative" ref={taxDropdownRef}>
                <button
                  onClick={() => setTaxDropdownOpen(!taxDropdownOpen)}
                  className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm xl:text-md transition-colors ${isTaxCollectionActive()
                    ? 'border-b text-blue-600 font-bold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Coins className="h-4 w-4" />
                  Tax Collection
                  <ChevronDown className={`h-4 w-4 transition-transform ${taxDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {taxDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {taxCollectionItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${isActive(item.path)
                            ? 'bg-blue-50 text-blue-600 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          onClick={() => setTaxDropdownOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Facebook Link + Mobile Menu */}
          <div className="flex items-center gap-2">
            <a
              href="https://about.bettergov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
            >
              <CircleQuestionMark className="h-4 w-4" />
              About BetterGov.ph
            </a>

            <a
              href="https://www.facebook.com/BetterGovPh"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
            >
              <Facebook className="h-4 w-4" />
              Follow us on Facebook
            </a>

            {/* Mobile/Tablet Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Home */}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive('/')
                ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Home className="h-5 w-5" />
              Home
            </Link>

            {/* Procurement Section */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Procurement
              </div>
              {procurementItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 pl-10 text-sm transition-colors ${active
                      ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* Tax Collection Section */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Tax Collection
              </div>
              {taxCollectionItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 pl-10 text-sm transition-colors ${active
                      ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* Budget Section */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <ChartBarStackedIcon className="h-4 w-4" />
                Budget
              </div>
              {budgetItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 pl-10 text-sm transition-colors ${active
                      ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* DPWH Section */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <HardHat className="h-4 w-4" />
                DPWH
              </div>
              {dpwhItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 pl-10 text-sm transition-colors ${active
                      ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>           
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
