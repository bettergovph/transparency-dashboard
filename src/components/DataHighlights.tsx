import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import Navigation from './Navigation'
import Footer from './Footer'

const DataHighlights = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const datasets = [
    {
      title: 'Procurement Records',
      count: '2.5 Million',
      description: 'Government contracts and awards from PhilGEPS',
      link: '/procurement',
      linkText: 'Search Records'
    },
    {
      title: 'Budget Line Items',
      count: '3.8 Million',
      description: 'GAA budget allocations (2020-2025)',
      link: '/budget',
      linkText: 'Browse Budget'
    },
    {
      title: 'Infrastructure Projects',
      count: '248,220',
      description: 'DPWH projects with live monitoring',
      link: '/dpwh/overview',
      linkText: 'View Projects'
    },
    {
      title: 'Tax Collection Data',
      count: '6,000+',
      description: 'BIR monthly collections by region',
      link: '/bir',
      linkText: 'View Dashboard'
    }
  ]

  const totalValue = {
    procurement: '₱2.5T+',
    budget: '₱31.4T',
    infrastructure: '₱6.4T',
    tax: '₱11.4T'
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to procurement search with query
      navigate(`/procurement?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <div className="flex-1 bg-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Transparency Through Data
            </h1>
            <p className="text-base text-gray-600 max-w-2xl mx-auto mb-8">
              Search and analyze millions of government records. From procurement contracts to infrastructure projects, 
              we make Philippine government data accessible and actionable.
            </p>
            
            {/* Search Box */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search procurement records, contracts, companies..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>
            </form>
          </div>

        {/* Data Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {datasets.map((dataset, index) => (
            <Link
              key={index}
              to={dataset.link}
              className="group bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <h3 className="text-xs font-semibold text-gray-500 mb-1">{dataset.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mb-2">{dataset.count}</p>
              <p className="text-sm text-gray-600 mb-3">{dataset.description}</p>
              <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                {dataset.linkText}
                <span className="ml-1 group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Value Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-10">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Total Value Tracked</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{totalValue.procurement}</div>
              <div className="text-xs text-gray-600">Procurement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{totalValue.budget}</div>
              <div className="text-xs text-gray-600">Budget</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">{totalValue.infrastructure}</div>
              <div className="text-xs text-gray-600">Infrastructure</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{totalValue.tax}</div>
              <div className="text-xs text-gray-600">Tax Collections</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            All data is sourced from official government agencies and updated regularly.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
            <span>PhilGEPS</span>
            <span>•</span>
            <span>DBM (GAA)</span>
            <span>•</span>
            <span>DPWH</span>
            <span>•</span>
            <span>BIR</span>
            <span>•</span>
            <span>Bureau of Treasury</span>
          </div>
        </div>

        {/* Data Disclaimer */}
        <div className="mt-12">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <p className="font-semibold text-yellow-800 mb-2">⚠️ Data Disclaimer:</p>
            <ul className="text-gray-700 space-y-1">
              <li>• Data coverage period: <strong>2000-2025</strong></li>
              <li>• Data is subject to change and may contain inaccuracies</li>
              <li>• Some contracts may have duplicates; we've done our best to clean the data</li>
              <li>• This is an unofficial community resource for transparency and research purposes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <Footer />
  </div>
  )
}

export default DataHighlights
