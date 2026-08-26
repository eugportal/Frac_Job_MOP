import { useState, type FormEvent, type ReactNode } from 'react';
import { Droplets, LockKeyhole, MailCheck } from 'lucide-react';
import type { AuthMethod, OtpChallenge } from '@/services/authApi';

interface LoginScreenProps {
  onBeginLogin: (authMethod: AuthMethod, username: string, password: string) => Promise<OtpChallenge>;
  onVerifyOtp: (challengeId: string, otp: string) => Promise<void>;
  themeToggle: ReactNode;
}

export function LoginScreen({ onBeginLogin, onVerifyOtp, themeToggle }: LoginScreenProps) {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [authMethod] = useState<AuthMethod>('normal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCredentials = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setIsSubmitting(true);
    try { setChallenge(await onBeginLogin(authMethod, username, password)); setStep('otp'); setPassword(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.'); }
    finally { setIsSubmitting(false); }
  };
  const submitOtp = async (event: FormEvent) => {
    event.preventDefault(); if (!challenge) return; setError(''); setIsSubmitting(true);
    try { await onVerifyOtp(challenge.challengeId, otp); setOtp(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to verify the code.'); }
    finally { setIsSubmitting(false); }
  };

  return <main className="relative flex min-h-screen items-center justify-center bg-ink-100 px-4">
    <div className="absolute right-4 top-4">{themeToggle}</div>
    <form onSubmit={step === 'credentials' ? submitCredentials : submitOtp} className="card w-full max-w-md p-8">
      <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white"><Droplets size={24} /></div><div><h1 className="text-lg font-bold text-ink-900">Frac Data Management</h1><p className="text-sm text-ink-500">{step === 'otp' ? 'Verify your email code' : 'Sign in to continue'}</p></div></div>
      <div className="flex flex-col gap-4">
        {step === 'credentials' ? <><label className="field-label" htmlFor="username">Username</label><input id="username" className="field-input" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /><label className="field-label" htmlFor="password">Password</label><input id="password" className="field-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></> : <><p className="text-sm text-ink-600">A six-digit code was sent to your registered email address.</p><label className="field-label" htmlFor="otp">Verification code</label><input id="otp" className="field-input tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} required /></>}
        {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}
        <button className="btn-danger mt-2 w-full justify-center" type="submit" disabled={isSubmitting}>{step === 'otp' ? <MailCheck size={16} /> : <LockKeyhole size={16} />}{isSubmitting ? 'Please wait…' : step === 'otp' ? 'Verify code' : 'Sign in'}</button>
        {step === 'otp' && <button className="text-sm text-brand-700" type="button" onClick={() => { setStep('credentials'); setChallenge(null); setError(''); }}>Use a different account</button>}
      </div>
    </form>
  </main>;
}
