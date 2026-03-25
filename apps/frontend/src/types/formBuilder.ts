export type FbFormSummary = {
  formTypeId: number;
  formName: string;
  formCode: string;
  pagesCount: number;
};

export type FbServiceRow = {
  id: number; // numeric PK from m_service for DataTable dataKey
  serviceId: string;
  serviceName: string | null;
  forms: FbFormSummary[];
};

export type FbPage = {
  id: number;
  service_id: string;
  page_name: string;
  name_in_hindi?: string | null;
  preference: number;
  form_id: number;
  form_code?: string | null;
  is_active: 'Y' | 'N';
};

export type FbPageCategory = {
  id: number;
  page_id: number;
  category_id: number;
  preference: number;
  help_text?: string | null;
  is_active: 'Y' | 'N';
};