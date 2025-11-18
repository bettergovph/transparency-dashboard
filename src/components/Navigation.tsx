import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Building2, Grid3x3, MapPin, Menu, X, Facebook, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const Navigation = () => {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/contractors', label: 'Contractors', icon: Users },
    { path: '/organizations', label: 'Organizations', icon: Building2 },
    { path: '/locations', label: 'Locations', icon: MapPin },
    { path: '/categories', label: 'Categories', icon: Grid3x3 },
  ]

  const projectsDropdownItems = [
    { label: 'About BetterGov.ph', url: 'https://bettergov.ph/join-us' },
    { label: '2026 Budget', url: 'https://2026-budget.bettergov.ph' },
    { label: 'Budget', url: 'https://budget.bettergov.ph' },
    { label: 'Research', url: 'https://visualizations.bettergov.ph' },
    { label: 'Bisto Proyekto', url: 'https://bisto.ph' },
    { label: 'Flood Control Projects', url: 'https://bettergov.ph/flood-control-projects' },
    { label: 'SALN Tracker', url: 'https://saln.bettergov.ph' }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProjectsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-24">
          <div className="flex items-center gap-8">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 md:gap-8">
              <img
                src="https://bettergov.ph/logos/svg/BetterGov_Icon-Primary.svg"
                alt="BetterGov.ph Logo"
                className="h-8 w-8 md:h-12 md:w-12"
              />
              <Link to="/">
                <h1 className="text-sm md:text-lg font-bold text-black font-figtree">
                  Transparency Dashboard
                </h1>
                <p className="text-gray-600 text-xs hidden sm:block">by BetterGov.ph</p>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 md:px-3 lg:px-4 py-2 md:text-sm lg:text-md transition-colors ${active
                      ? 'border-b text-blue-600 font-bold'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
              
              {/* Our Projects Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}
                  className="flex items-center gap-2 md:px-3 lg:px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  Our Projects
                  <ChevronDown className={`h-4 w-4 transition-transform ${projectsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {projectsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {projectsDropdownItems.map((item) => (
                      <a
                        key={item.url}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setProjectsDropdownOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Facebook Link + Mobile Menu */}
          <div className="flex items-center gap-2">
            <a
              href="https://www.facebook.com/BetterGovPh"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
            >
              <Facebook className="h-4 w-4" />
              Follow us on Facebook
            </a>
            
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${active
                    ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
            
            {/* Our Projects Section in Mobile */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Our Projects
              </div>
              {projectsDropdownItems.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
