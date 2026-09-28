import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource-variable/nunito';
import '@fontsource-variable/oswald';
import '@fontsource/bebas-neue';
import './styles.css';
import App from './App';
import { AppStoreProvider } from './store/AppStore';
import { ToastProvider } from './store/Toasts';
import { AuthProvider, useAuth } from './store/Auth';
import { AuthPage } from './components/AuthPage';

/** Shows the sign-in page until someone is signed in, then that person's workspace. */
function Gate() {
  const { user } = useAuth();
  if (!user) return <AuthPage />;
  return (
    <AppStoreProvider key={user.id} userId={user.id}>
      <App />
    </AppStoreProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
