import { FracDataForm } from '@/pages/FracDataForm/FracDataForm';
import { LoginScreen } from '@/components/Auth/LoginScreen';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';

function App() {
  const { company, accessToken, beginLogin, confirmOtp, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeToggle = <ThemeToggle theme={theme} onToggle={toggleTheme} />;
  return company
    ? <FracDataForm company={company} accessToken={accessToken!} onLogout={logout} themeToggle={themeToggle} />
    : <LoginScreen onBeginLogin={beginLogin} onVerifyOtp={confirmOtp} themeToggle={themeToggle} />;
}

export default App;
