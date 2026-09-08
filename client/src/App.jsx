import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NavigationProvider, useLocation, useNavigate } from './context/NavigationContext.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import { WelcomePage } from './pages/WelcomePage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { VerifyEmailPage } from './pages/VerifyEmailPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { TodayPage } from './pages/TodayPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminMotivationsListPage from './pages/admin/AdminMotivationsListPage.jsx';
import AdminMotivationFormPage from './pages/admin/AdminMotivationFormPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminProfilePage from './pages/admin/AdminProfilePage.jsx';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import OnboardingTour from './components/OnboardingTour.jsx';
import { PushNotificationClient } from './services/pushNotificationService.js';
import ForegroundNotificationToast from './components/ForegroundNotificationToast.jsx';

function AppRouter() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [foregroundToast, setForegroundToast] = useState(null);

  useEffect(() => {
    if (user) {
      PushNotificationClient.registerAndSubscribe().catch((err) => {
        console.warn('[Push] Auto-subscribe notification notice:', err);
      });
    }
  }, [user]);

  // Listen for real-time push notification broadcasts from Service Worker while app is open
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
          const payload = event.data.payload || {};
          setForegroundToast(payload);

          // Auto-dismiss after 8 seconds if not interacted with
          setTimeout(() => {
            setForegroundToast((current) => (current === payload ? null : current));
          }, 8000);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Loading Daily Grace…
          </p>
        </div>
      </div>
    );
  }

  const shouldShowOnboarding = Boolean(
    user &&
    user.role !== 'admin' &&
    user.onboarding_completed === false &&
    !pathname.startsWith('/admin') &&
    pathname !== '/login' &&
    pathname !== '/register'
  );

  let content = null;

  // ── Admin Routes ──────────────────────────────────────────────
  if (pathname === '/admin') {
    content = <AdminRoute><AdminDashboardPage /></AdminRoute>;
  } else if (pathname === '/admin/motivations') {
    content = <AdminRoute><AdminMotivationsListPage /></AdminRoute>;
  } else if (pathname === '/admin/motivations/new') {
    content = <AdminRoute><AdminMotivationFormPage /></AdminRoute>;
  } else if (pathname.startsWith('/admin/motivations/') && pathname.endsWith('/edit')) {
    content = <AdminRoute><AdminMotivationFormPage /></AdminRoute>;
  } else if (pathname === '/admin/users') {
    content = <AdminRoute><AdminUsersPage /></AdminRoute>;
  } else if (pathname === '/admin/profile') {
    content = <AdminRoute><AdminProfilePage /></AdminRoute>;
  } else if (pathname === '/admin/settings') {
    content = <AdminRoute><AdminSettingsPage /></AdminRoute>;
  } else if (pathname === '/register') {
    // ── Public Routes ─────────────────────────────────────────────
    content = user ? <HomePage /> : <RegisterPage onNavigate={navigate} />;
  } else if (pathname === '/login') {
    content = user ? <HomePage /> : <LoginPage onNavigate={navigate} />;
  } else if (pathname === '/verify-email' || pathname.startsWith('/verify-email')) {
    content = <VerifyEmailPage onNavigate={navigate} />;
  } else if (pathname === '/today') {
    // ── Authenticated Routes ──────────────────────────────────────
    content = user ? <TodayPage /> : <LoginPage onNavigate={navigate} />;
  } else if (pathname === '/home') {
    content = user ? <HomePage /> : <LoginPage onNavigate={navigate} />;
  } else if (pathname === '/profile') {
    content = user ? <ProfilePage /> : <LoginPage onNavigate={navigate} />;
  } else if (pathname === '/settings') {
    content = user ? <SettingsPage onNavigate={navigate} /> : <LoginPage onNavigate={navigate} />;
  } else if (pathname === '/') {
    // ── Root & Fallback ───────────────────────────────────────────
    content = user ? <HomePage /> : <WelcomePage onNavigate={navigate} />;
  } else {
    content = user ? <HomePage /> : <WelcomePage onNavigate={navigate} />;
  }

  return (
    <>
      <ForegroundNotificationToast 
        notification={foregroundToast} 
        onDismiss={() => setForegroundToast(null)} 
      />
      {content}
      {shouldShowOnboarding && <OnboardingTour />}
    </>
  );
}


export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      {/* Render app underneath so it's ready when splash fades */}
      <AuthProvider>
        <NavigationProvider>
          <AppRouter />
        </NavigationProvider>
      </AuthProvider>
    </>
  );
}
