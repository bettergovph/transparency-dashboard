import type { SearchDocument } from '@/types/search'

export const sampleData: SearchDocument[] = [
  {
    id: '1',
    reference_id: 'REF-2024-001',
    contract_no: 'CON-2024-001',
    award_title: 'Supply and Delivery of Office Equipment',
    notice_title: 'Invitation to Bid - Office Equipment',
    awardee_name: 'ABC Office Supplies Corp.',
    organization_name: 'Department of Education',
    area_of_delivery: 'Metro Manila',
    business_category: 'Office Supplies',
    contract_amount: 2500000,
    award_date: '2024-01-15',
    award_status: 'Awarded'
  },
  {
    id: '2',
    reference_id: 'REF-2024-002',
    contract_no: 'CON-2024-002',
    award_title: 'Construction of Rural Health Center',
    notice_title: 'Public Bidding - Health Center Construction',
    awardee_name: 'XYZ Construction Inc.',
    organization_name: 'Department of Health',
    area_of_delivery: 'Cebu Province',
    business_category: 'Construction',
    contract_amount: 15000000,
    award_date: '2024-02-01',
    award_status: 'Awarded'
  },
  {
    id: '3',
    reference_id: 'REF-2024-003',
    contract_no: 'CON-2024-003',
    award_title: 'IT Equipment and Software Procurement',
    notice_title: 'Request for Proposal - IT Systems',
    awardee_name: 'Tech Solutions Ltd.',
    organization_name: 'Bureau of Internal Revenue',
    area_of_delivery: 'Quezon City',
    business_category: 'Information Technology',
    contract_amount: 8500000,
    award_date: '2024-02-15',
    award_status: 'Awarded'
  },
  {
    id: '4',
    reference_id: 'REF-2024-004',
    contract_no: 'CON-2024-004',
    award_title: 'Vehicle Procurement for Government Use',
    notice_title: 'Invitation to Bid - Government Vehicles',
    awardee_name: 'Premium Motors Corp.',
    organization_name: 'Department of Transportation',
    area_of_delivery: 'Nationwide',
    business_category: 'Automotive',
    contract_amount: 12000000,
    award_date: '2024-03-01',
    award_status: 'Awarded'
  },
  {
    id: '5',
    reference_id: 'REF-2024-005',
    contract_no: 'CON-2024-005',
    award_title: 'Medical Equipment Supply and Installation',
    notice_title: 'Public Bidding - Hospital Equipment',
    awardee_name: 'MediTech Philippines Inc.',
    organization_name: 'Philippine General Hospital',
    area_of_delivery: 'Manila',
    business_category: 'Medical Equipment',
    contract_amount: 18500000,
    award_date: '2024-03-15',
    award_status: 'Awarded'
  }
]