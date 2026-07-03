// ─── Entidades ────────────────────────────────────────────────────────────────

export type ModulePreference = 'PERSONAL' | 'BUSINESS' | 'BOTH';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO' | 'EMPRESA';
  isStaff: boolean;
  onboardingCompletedAt: string | null;
  modulePreference: ModulePreference;
  primaryCurrency: string;
}

// ─── Payloads de peticiones ───────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  name?: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Respuestas de la API ─────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// ─── Estado del contexto ──────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  loading: boolean;          // true mientras se verifica la sesión al cargar
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  completeOnboarding: (payload: {
    name?: string;
    modulePreference: ModulePreference;
    primaryCurrency: string;
  }) => Promise<void>;
  updatePreferences: (payload: {
    name?: string;
    modulePreference?: ModulePreference;
    primaryCurrency?: string;
  }) => Promise<void>;
  logout: () => void;
}
