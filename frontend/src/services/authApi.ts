const apiUrl = (import.meta.env.VITE_API_URL ?? '/api/frac').replace(/\/$/, '');
// const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export interface OtpChallenge {
  challengeId: string;
  expiresInSeconds: number;
}

export type AuthMethod = 'normal';

interface TokenResponse {
  accessToken: string;
  expiresInSeconds: number;
  company: string;
  isSuperuser: boolean;
}

async function request<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(payload.message ?? 'Unable to contact the authentication service.');
  return payload;
}

export function requestOtp(authMethod: AuthMethod, username: string, password: string) {
  return request<OtpChallenge>('/api/auth/login', { authMethod, username, password });
}

export function verifyOtp(challengeId: string, otp: string) {
  return request<TokenResponse>('/api/auth/verify-otp', { challengeId, otp });
}
