// DPWH Project Document (from Meilisearch dpwh index)
export interface DPWHProject {
  contractId: string
  description: string
  category: string
  status: string
  region: string
  province: string
  municipality: string
  barangay: string
  contractor: string
  programName: string
  budget: number
  amountPaid: number
  progress: number
  isLive: boolean
  year: number
  reportCount: number
  dateContractSigning?: string
  dateContractApproval?: string
  dateNoticeOfAward?: string
  dateNoticeOfProceed?: string
  dateStartOfConstruction?: string
  dateTargetCompletion?: string
  dateActualCompletion?: string
  latitude?: number
  longitude?: number
}

// Aggregate data structures
export interface DPWHCategoryAggregate {
  category: string
  project_count: number
  total_budget: number
  total_paid: number
  avg_budget: number
  avg_progress: number
  statuses: Record<string, number>
}

export interface DPWHRegionAggregate {
  region: string
  province_count: number
  project_count: number
  total_budget: number
  total_paid: number
  avg_budget: number
  avg_progress: number
  top_categories: Array<{
    category: string
    count: number
  }>
}

export interface DPWHProvinceAggregate {
  province: string
  region: string
  project_count: number
  total_budget: number
  total_paid: number
  avg_budget: number
  avg_progress: number
  top_categories: Array<{
    category: string
    count: number
  }>
}

export interface DPWHContractorAggregate {
  contractor: string
  project_count: number
  total_budget: number
  total_paid: number
  avg_budget: number
  avg_progress: number
}

export interface DPWHProgramAggregate {
  program: string
  project_count: number
  total_budget: number
  total_paid: number
  avg_budget: number
  avg_progress: number
}

export interface DPWHYearAggregate {
  year: number
  project_count: number
  total_budget: number
  total_paid: number
  avg_budget: number
  avg_progress: number
}

export interface DPWHStatusAggregate {
  status: string
  project_count: number
  total_budget: number
  total_paid: number
  avg_budget: number
  avg_progress: number
}

// Metadata structure for aggregate JSON files
export interface DPWHAggregateMetadata {
  title: string
  source: string
  generated_at: string
  total_items: number
  total_projects: number
  total_budget: number
  total_paid: number
  avg_progress: number
}

// Generic aggregate response
export interface DPWHAggregateResponse<T> {
  metadata: DPWHAggregateMetadata
  data: T[]
}
