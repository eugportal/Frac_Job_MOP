import { FracDataForm } from '@/pages/FracDataForm/FracDataForm';
import { LoginScreen } from '@/components/Auth/LoginScreen';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminLookup } from '@/pages/AdminLookup/AdminLookup';
import { AdminUsers } from '@/pages/AdminUsers/AdminUsers';
import { Submissions } from '@/pages/Submissions/Submissions';
import { PdfImport } from '@/pages/PdfImport/PdfImport';
import type { FracFormData } from '@/types/fracTypes';

function SuperuserWorkspace({ accessToken, onLogout }: { accessToken: string; onLogout: () => void }) {
  const [screen, setScreen] = useState<'home' | 'lookups' | 'users' | 'submissions'>('home');
  if (screen === 'lookups') return <AdminLookup accessToken={accessToken} onLogout={onLogout} />;
  if (screen === 'users') return <AdminUsers accessToken={accessToken} onBack={() => setScreen('home')} />;
  if (screen === 'submissions') return <Submissions accessToken={accessToken} title="All submitted frac jobs" onBack={() => setScreen('home')} />;
  return <main className="min-h-screen bg-ink-100 p-4 sm:p-8"><div className="mx-auto max-w-3xl"><header className="mb-6 flex justify-between"><div><h1 className="text-2xl font-bold text-ink-900">Superuser administration</h1><p className="text-sm text-ink-500">Manage lookups, users, and every company’s submissions.</p></div><button className="btn-ghost" onClick={onLogout}>Sign out</button></header><div className="grid gap-4 sm:grid-cols-3"><button className="card p-5 text-left font-semibold" onClick={() => setScreen('lookups')}>Lookup administration</button><button className="card p-5 text-left font-semibold" onClick={() => setScreen('users')}>Users & companies</button><button className="card p-5 text-left font-semibold" onClick={() => setScreen('submissions')}>All submissions</button></div></div></main>;
}

function CompanyWorkspace({ company, accessToken, onLogout, themeToggle }: { company: string; accessToken: string; onLogout: () => void; themeToggle: JSX.Element }) {
  const [screen, setScreen] = useState<'import' | 'form' | 'submissions'>('import');
  const [importedData, setImportedData] = useState<FracFormData | undefined>();
  if (screen === 'submissions') return <Submissions accessToken={accessToken} title="Company submissions" onBack={() => setScreen('form')} />;
  if (screen === 'import') return <PdfImport company={company} accessToken={accessToken} onLogout={onLogout} themeToggle={themeToggle} onContinue={(data) => { setImportedData(data); setScreen('form'); }} />;
  return <><div className="fixed bottom-4 right-4 z-50"><button className="btn-primary shadow-lg" onClick={() => setScreen('submissions')}>View submissions</button></div><FracDataForm company={company} accessToken={accessToken} onLogout={onLogout} themeToggle={themeToggle} initialData={importedData} /></>;
}

function App() {
  const { company, accessToken, isSuperuser, beginLogin, confirmOtp, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeToggle = <ThemeToggle theme={theme} onToggle={toggleTheme} />;
  return company
    ? isSuperuser
      ? <SuperuserWorkspace accessToken={accessToken!} onLogout={logout} />
      : <CompanyWorkspace company={company} accessToken={accessToken!} onLogout={logout} themeToggle={themeToggle} />
    : <LoginScreen onBeginLogin={beginLogin} onVerifyOtp={confirmOtp} themeToggle={themeToggle} />;
}

export default App;
import { useState } from 'react';
