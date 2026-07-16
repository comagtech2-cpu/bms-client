import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Sales = lazy(() => import('./pages/Sales'));
const Products = lazy(() => import('./pages/Products'));
const Categories = lazy(() => import('./pages/Categories'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const CreditTracking = lazy(() => import('./pages/CreditTracking'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user?.role === 'OWNER' ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route
            path="/login"
            element={<ErrorBoundary>{isAuthenticated ? <Navigate to="/" replace /> : <Login />}</ErrorBoundary>}
          />
          <Route
            path="/register"
            element={<ErrorBoundary>{isAuthenticated ? <Navigate to="/" replace /> : <Register />}</ErrorBoundary>}
          />
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <PrivateRoute>
                  <AppLayout />
                </PrivateRoute>
              </ErrorBoundary>
            }
          >
            <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
            <Route path="products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
            <Route path="categories" element={<ErrorBoundary><Categories /></ErrorBoundary>} />
            <Route path="inventory" element={<ErrorBoundary><Inventory /></ErrorBoundary>} />
            <Route path="customers" element={<ErrorBoundary><Customers /></ErrorBoundary>} />
            <Route path="credit" element={<ErrorBoundary><CreditTracking /></ErrorBoundary>} />
            <Route path="transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
            <Route path="reports" element={<ErrorBoundary><OwnerRoute><Reports /></OwnerRoute></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><OwnerRoute><Settings /></OwnerRoute></ErrorBoundary>} />
          </Route>
          <Route path="*" element={<ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
