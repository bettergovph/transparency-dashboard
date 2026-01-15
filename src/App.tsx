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
import TreasuryByYear from './components/TreasuryByYear'
import BudgetBrowser from './components/budget/BudgetBrowser'
import DepartmentsListPage from './components/budget/DepartmentsListPage'
import DepartmentPage from './components/budget/DepartmentPage'
import AgencyPage from './components/budget/AgencyPage'
import ObjectDetailPage from './components/budget/ObjectDetailPage'
import RegionalPage from './components/budget/RegionalPage'
import AllocationsPage from './components/budget/AllocationsPage'
import SearchPage from './components/budget/SearchPage'
import DPWHBrowser from './components/dpwh/DPWHBrowser'
import DPWHOverview from './components/dpwh/DPWHOverview'
import DPWHCategoriesPage from './components/dpwh/DPWHCategoriesPage'
import DPWHRegionsPage from './components/dpwh/DPWHRegionsPage'
import DPWHProvincesPage from './components/dpwh/DPWHProvincesPage'
import DPWHCategoryPage from './components/dpwh/DPWHCategoryPage'
import DPWHRegionPage from './components/dpwh/DPWHRegionPage'
import DPWHProvincePage from './components/dpwh/DPWHProvincePage'
import DPWHContractorsPage from './components/dpwh/DPWHContractorsPage'
import DPWHContractorPage from './components/dpwh/DPWHContractorPage'
import DPWHContractorProjectsPage from './components/dpwh/DPWHContractorProjectsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<HomePage />} /> */}
        <Route path="/" element={<EnhancedSearchInterface />} />
        <Route path="/bir" element={<BIRDashboard />} />
        <Route path="/treasury" element={<TreasuryOverview />} />
        <Route path="/treasury/year/:year" element={<TreasuryByYear />} />
        <Route path="/budget" element={<BudgetBrowser />} />
        <Route path="/budget/departments" element={<DepartmentsListPage />} />
        <Route path="/budget/departments/:slug" element={<DepartmentPage />} />
        <Route path="/budget/departments/:deptSlug/agencies/:agencySlug" element={<AgencyPage />} />
        <Route path="/budget/departments/:deptSlug/:agencySlug/objects/:objectSlug" element={<ObjectDetailPage />} />
        <Route path="/budget/regional" element={<RegionalPage />} />
        <Route path="/budget/allocations" element={<AllocationsPage />} />
        <Route path="/budget/search" element={<SearchPage />} />
        <Route path="/dpwh" element={<DPWHBrowser />} />
        <Route path="/dpwh/overview" element={<DPWHOverview />} />
        <Route path="/dpwh/categories" element={<DPWHCategoriesPage />} />
        <Route path="/dpwh/categories/:slug" element={<DPWHCategoryPage />} />
        <Route path="/dpwh/regions" element={<DPWHRegionsPage />} />
        <Route path="/dpwh/regions/:slug" element={<DPWHRegionPage />} />
        <Route path="/dpwh/provinces" element={<DPWHProvincesPage />} />
        <Route path="/dpwh/provinces/:slug" element={<DPWHProvincePage />} />
        <Route path="/dpwh/contractors" element={<DPWHContractorsPage />} />
        <Route path="/dpwh/contractors/:slug" element={<DPWHContractorPage />} />
        <Route path="/dpwh/contractors/:slug/projects" element={<DPWHContractorProjectsPage />} />
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