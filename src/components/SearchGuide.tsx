import React from 'react'
import { HelpCircle, X } from 'lucide-react'

interface SearchGuideProps {
  isOpen: boolean
  onClose: () => void
}

const SearchGuide: React.FC<SearchGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="h-full bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6 sticky top-0 bg-white pb-4 border-b border-gray-200 z-10">
          <div className="flex items-center">
            <HelpCircle className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-blue-900">Search Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-blue-900 mb-3 text-base">🔍 Basic Search</h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• Type any keyword to search across all fields</li>
              <li>• Example: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">construction materials</code></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-blue-900 mb-3 text-base">📝 Exact Phrase Search</h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• Wrap text in quotes for exact matches</li>
              <li>• Example: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">"office supplies"</code></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-blue-900 mb-3 text-base">🎯 Field-Specific Search</h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">awardee:CompanyName</code> - Search by awardee</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">organization:"Department of Health"</code> - Search by organization</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">contract:2024-001</code> - Search by contract number</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">reference:REF-12345</code> - Search by reference ID</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">title:"Road Construction"</code> - Search by award title</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">category:Construction</code> - Search by business category</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">status:Awarded</code> - Search by award status</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-blue-900 mb-3 text-base">🔗 Combining Filters</h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• Multiple field filters are automatically combined with AND logic</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">awardee:"ABC Corp" status:Awarded</code> - Both conditions must match</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">category:Construction organization:DOH</code> - Combine any fields</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-blue-900 mb-3 text-base">💡 Pro Tips</h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• Use quotes around multi-word field values: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">awardee:"XYZ Corporation"</code></li>
              <li>• Combine multiple field searches (they work as AND): <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">awardee:ABC status:Awarded</code></li>
              <li>• Mix field filters with general search terms</li>
              <li>• Enable "Strict matching" for exact phrase search in the query</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 text-base">Example Queries:</h3>
            <ul className="space-y-2 text-gray-600 text-xs ml-4">
              <li>• <code className="bg-white px-2 py-1 rounded">awardee:"ABC Corporation" category:Construction</code></li>
              <li>• <code className="bg-white px-2 py-1 rounded">organization:"Department of Education"</code></li>
              <li>• <code className="bg-white px-2 py-1 rounded">status:Awarded office furniture</code> (filter + search)</li>
              <li>• <code className="bg-white px-2 py-1 rounded">contract:2024 awardee:ABC</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchGuide
