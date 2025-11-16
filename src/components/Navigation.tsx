import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Building2, Grid3x3 } from 'lucide-react'

const Navigation = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/contractors', label: 'Contractors', icon: Users },
    { path: '/organizations', label: 'Organizations', icon: Building2 },
    { path: '/categories', label: 'Categories', icon: Grid3x3 },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 md:h-24 gap-8">
          <div className="flex items-center gap-8">
            <img
              src="https://bettergov.ph/logos/svg/BetterGov_Icon-Primary.svg"
              alt="BetterGov.ph Logo"
              className="h-12 w-12"
            />
            <Link to="/">
              <h1 className="text-lg font-bold text-black font-figtree">
                Philgeps Contract Browser
              </h1>
              <p className="text-gray-600 text-xs">by BetterGov.ph</p>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 text-md transition-colors ${active
                    ? 'border-b text-blue-600 font-bold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
