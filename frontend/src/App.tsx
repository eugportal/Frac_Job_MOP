import { FracDataForm } from '@/pages/FracDataForm/FracDataForm';
import { LoginScreen } from '@/components/Auth/LoginScreen';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminLookup } from '@/pages/AdminLookup/AdminLookup';

function App() {
  const { company, accessToken, isSuperuser, beginLogin, confirmOtp, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeToggle = <ThemeToggle theme={theme} onToggle={toggleTheme} />;
  return company
    ? isSuperuser
      ? <AdminLookup accessToken={accessToken!} onLogout={logout} />
      : <FracDataForm company={company} accessToken={accessToken!} onLogout={logout} themeToggle={themeToggle} />
    : <LoginScreen onBeginLogin={beginLogin} onVerifyOtp={confirmOtp} themeToggle={themeToggle} />;
}

export default App;
