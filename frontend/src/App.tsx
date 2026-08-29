import { useState } from 'react';
import { FracDataForm } from '@/pages/FracDataForm/FracDataForm';
import { LoginScreen } from '@/components/Auth/LoginScreen';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminLookup } from '@/pages/AdminLookup/AdminLookup';
import { AdminUsers } from '@/pages/AdminUsers/AdminUsers';
import { Submissions } from '@/pages/Submissions/Submissions';
import { getSubmittedFracJob } from '@/services/fracDataService';
import type { FracFormData } from '@/types/fracTypes';

function SuperuserWorkspace({ accessToken, onLogout, onBack, onEdit }: { accessToken: string; onLogout: () => void; onBack: () => void; onEdit: (jobId: string) => void }) {
  const [screen, setScreen] = useState<'home' | 'lookups' | 'users' | 'submissions'>('home');
  if (screen === 'lookups') return <AdminLookup accessToken={accessToken} onLogout={onLogout} />;
  if (screen === 'users') return <AdminUsers accessToken={accessToken} onBack={() => setScreen('home')} />;
  if (screen === 'submissions') return <Submissions accessToken={accessToken} canEdit onEdit={onEdit} title="All submitted frac jobs" onBack={() => setScreen('home')} />;
  return <main className="min-h-screen bg-ink-100 p-4 sm:p-8"><div className="mx-auto max-w-3xl"><header className="mb-6 flex justify-between"><div><h1 className="text-2xl font-bold text-ink-900">Superuser administration</h1><p className="text-sm text-ink-500">Manage lookups, users, and every company’s submissions.</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={onBack}>Manual form</button><button className="btn-ghost" onClick={onLogout}>Sign out</button></div></header><div className="grid gap-4 sm:grid-cols-3"><button className="card p-5 text-left font-semibold" onClick={() => setScreen('lookups')}>Lookup administration</button><button className="card p-5 text-left font-semibold" onClick={() => setScreen('users')}>Users & companies</button><button className="card p-5 text-left font-semibold" onClick={() => setScreen('submissions')}>All submissions</button></div></div></main>;
}

function CompanyWorkspace({ company, accessToken, role, isSuperuser, onLogout, themeToggle }: { company: string; accessToken: string; role: 'admin' | 'editor' | 'viewer'; isSuperuser: boolean; onLogout: () => void; themeToggle: JSX.Element }) {
  const [screen, setScreen] = useState<'form' | 'submissions' | 'admin'>('form');
  const [editingData, setEditingData] = useState<FracFormData>();
  const canEdit = isSuperuser || role === 'admin';
  const openSubmission = async (jobId: string) => {
    try {
      setEditingData(await getSubmittedFracJob(accessToken, jobId));
      setScreen('form');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to load the submission.');
    }
  };
  if (screen === 'admin' && isSuperuser) return <SuperuserWorkspace accessToken={accessToken} onLogout={onLogout} onBack={() => setScreen('form')} onEdit={(jobId) => void openSubmission(jobId)} />;
  if (screen === 'submissions') return <Submissions accessToken={accessToken} canEdit={canEdit} onEdit={(jobId) => void openSubmission(jobId)} title={isSuperuser ? 'All submitted frac jobs' : 'Company submissions'} onBack={() => { setEditingData(undefined); setScreen('form'); }} />;
  return <><div className="fixed bottom-4 right-4 z-50 flex gap-2"><button className="btn-primary shadow-lg" onClick={() => setScreen('submissions')}>View submissions</button>{isSuperuser && <button className="btn-secondary shadow-lg" onClick={() => setScreen('admin')}>Administration</button>}</div><FracDataForm company={editingData?.company ?? company} accessToken={accessToken} onLogout={onLogout} themeToggle={themeToggle} initialData={editingData} submittedJobId={editingData?.formId} /></>;
}

function App() {
  const { company, accessToken, role, isSuperuser, beginLogin, confirmOtp, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeToggle = <ThemeToggle theme={theme} onToggle={toggleTheme} />;
  return company
    ? <CompanyWorkspace company={company} accessToken={accessToken!} role={role} isSuperuser={isSuperuser} onLogout={logout} themeToggle={themeToggle} />
    : <LoginScreen onBeginLogin={beginLogin} onVerifyOtp={confirmOtp} themeToggle={themeToggle} />;
}

export default App;
