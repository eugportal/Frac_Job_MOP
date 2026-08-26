import { useState } from 'react';
import { requestOtp, verifyOtp, type AuthMethod, type OtpChallenge } from '@/services/authApi';

const SESSION_KEY = 'frac-data-session-v2';

interface AuthSession {
  company: string;
  accessToken: string;
  isSuperuser: boolean;
}

function loadSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<AuthSession>;
    return typeof session.accessToken === 'string' && typeof session.company === 'string' && session.company.trim().length > 0
      ? { company: session.company, accessToken: session.accessToken, isSuperuser: session.isSuperuser === true }
      : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(loadSession);

  const beginLogin = (authMethod: AuthMethod, username: string, password: string): Promise<OtpChallenge> => requestOtp(authMethod, username, password);

  const confirmOtp = async (challengeId: string, otp: string) => {
    const { accessToken, company, isSuperuser } = await verifyOtp(challengeId, otp);
    const nextSession = { company, accessToken, isSuperuser };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return { company: session?.company ?? null, accessToken: session?.accessToken ?? null, isSuperuser: session?.isSuperuser === true, beginLogin, confirmOtp, logout };
}
