export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  status: HealthStatus;
  service: string;
}

export type UserRole = "Owner" | "Admin" | "Trainer" | "Manager" | "Learner";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  industry: string;
  companySize: string;
  country: string;
  timezone: string;
  logoUrl: string | null;
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  organization: OrganizationSummary | null;
  role: UserRole | null;
}

export interface DashboardActivity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  actorName: string;
}

export interface DashboardResponse {
  organization: OrganizationSummary;
  role: UserRole;
  kpis: {
    users: number;
    knowledgeBases: number;
    simulations: number;
    assessments: number;
  };
  recentActivity: DashboardActivity[];
}

export interface CreateOrganizationInput {
  name: string;
  industry: string;
  companySize: string;
  country: string;
  timezone: string;
  logoUrl?: string;
}
