import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import HomePage from './components/HomePage'
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
import TreasuryOverview from './components/TreasuryOverview'
import TreasuryDashboard from './components/TreasuryDashboard'
import BudgetBrowser from './components/budget/BudgetBrowser'
import DepartmentsListPage from './components/budget/DepartmentsListPage'
import DepartmentPage from './components/budget/DepartmentPage'
import AgencyPage from './components/budget/AgencyPage'
import ObjectDetailPage from './components/budget/ObjectDetailPage'
import RegionalPage from './components/budget/RegionalPage'
import AllocationsPage from './components/budget/AllocationsPage'
import SearchPage from './components/budget/SearchPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<HomePage />} /> */}
        <Route path="/" element={<EnhancedSearchInterface />} />
        <Route path="/bir" element={<BIRDashboard />} />
        <Route path="/treasury" element={<TreasuryOverview />} />
        <Route path="/treasury/browser" element={<TreasuryDashboard />} />
        <Route path="/budget" element={<BudgetBrowser />} />
        <Route path="/budget/departments" element={<DepartmentsListPage />} />
        <Route path="/budget/departments/:slug" element={<DepartmentPage />} />
        <Route path="/budget/departments/:deptSlug/agencies/:agencySlug" element={<AgencyPage />} />
        <Route path="/budget/departments/:deptSlug/:agencySlug/objects/:objectSlug" element={<ObjectDetailPage />} />
        <Route path="/budget/regional" element={<RegionalPage />} />
        <Route path="/budget/allocations" element={<AllocationsPage />} />
        <Route path="/budget/search" element={<SearchPage />} />
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