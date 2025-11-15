export interface SearchDocument {
  id: string;
  reference_id: string;
  contract_no: string;
  award_title: string;
  notice_title: string;
  awardee_name: string;
  organization_name: string;
  area_of_delivery: string;
  business_category: string;
  contract_amount: number;
  award_date: string;
  award_status: string;
}

export interface SearchFilters {
  reference_id?: string;
  contract_no?: string;
  award_title?: string;
  notice_title?: string;
  awardee_name?: string;
  organization_name?: string;
  area_of_delivery?: string;
  business_category?: string;
  contract_amount_min?: number;
  contract_amount_max?: number;
  award_date_from?: string;
  award_date_to?: string;
  award_status?: string;
}