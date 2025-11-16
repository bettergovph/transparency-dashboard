import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EnhancedSearchInterface from './components/EnhancedSearchInterface'
import AwardeePage from './components/AwardeePage'
import OrganizationPage from './components/OrganizationPage'
import LocationPage from './components/LocationPage'
import CategoryPage from './components/CategoryPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<EnhancedSearchInterface />} />
          <Route path="/awardees/:slug" element={<AwardeePage />} />
          <Route path="/organizations/:slug" element={<OrganizationPage />} />
          <Route path="/locations/:slug" element={<LocationPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App