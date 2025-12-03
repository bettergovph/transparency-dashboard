import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EnhancedSearchInterface from './components/EnhancedSearchInterface'
import AwardeePage from './components/AwardeePage'
import OrganizationPage from './components/OrganizationPage'
import LocationPage from './components/LocationPage'
import CategoryPage from './components/CategoryPage'
import ContractorsPage from './components/ContractorsPage'
import OrganizationsListPage from './components/OrganizationsListPage'
import LocationsListPage from './components/LocationsListPage'
import CategoriesListPage from './components/CategoriesListPage'
import BIRDashboard from './components/BIRDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EnhancedSearchInterface />} />
        <Route path="/bir" element={<BIRDashboard />} />
        <Route path="/contractors" element={<ContractorsPage />} />
        <Route path="/organizations" element={<OrganizationsListPage />} />
        <Route path="/locations" element={<LocationsListPage />} />
        <Route path="/categories" element={<CategoriesListPage />} />
        <Route path="/awardees/:slug" element={<AwardeePage />} />
        <Route path="/organizations/:slug" element={<OrganizationPage />} />
        <Route path="/locations/:slug" element={<LocationPage />} />
        <Route path="/categories/:slug" element={<CategoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App