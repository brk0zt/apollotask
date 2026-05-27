export interface User {
  id: number;
  name: string;
  email: string;
  auth_token_count?: number;
  api_token_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  error?: string;
  message: string;
  errors?: Record<string, string[]>;
}
