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
    <nav className="bg-white border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20 gap-8">
          <div className="flex items-center gap-3">
            <img
              src="https://bettergov.ph/logos/svg/BetterGov_Icon-Primary.svg"
              alt="BetterGov.ph Logo"
              className="h-8 w-8"
            />
            <Link to="/">
              <h1 className="text-md font-bold text-black font-figtree">
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
                  className={`flex items-center gap-2 px-4 py-2 text-md font-medium transition-colors ${active
                    ? 'font-bold border-b'
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
