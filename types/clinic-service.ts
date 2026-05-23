/** خدمة عيادة — GET /api/clinic-services */
export interface ClinicService {
  id: number;
  name: string;
  treatAsFollowup: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface ClinicServicesResponse {
  services: ClinicService[];
  legacyVisitTypes?: string[];
}

export interface CreateClinicServicePayload {
  name: string;
  treatAsFollowup?: boolean;
  sortOrder?: number;
}

export interface UpdateClinicServicePayload {
  name?: string;
  treatAsFollowup?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}
