export interface BudgetDocument {
  id: string;
  year: number;
  agency: string;
  uacs_dpt_dsc: string; // department
  uacs_agy_dsc: string; // agency
  dsc: string; // description
  amt: number; // amount
  uacs_oper_dsc: string; // operating_unit
  uacs_fundsubcat_dsc: string; // sub_category
  uacs_exp_cd: string; // expense code
  uacs_exp_dsc: string; // exp
  uacs_sobj_cd: string; // object code
  uacs_sobj_dsc: string; // object
  uacs_div_dsc: string; // division
}

export interface BudgetFilters {
  year?: number;
  agency?: string;
  department?: string;
  operating_unit?: string;
  sub_category?: string;
  exp?: string;
  object?: string;
  division?: string;
  amount_min?: number;
  amount_max?: number;
}
