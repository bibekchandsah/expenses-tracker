import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { CategoryProvider } from './context/CategoryContext';
import { BudgetProvider } from './context/BudgetContext';
import { BankProvider } from './context/BankContext';
import { LendProvider } from './context/LendContext';
import { ToastProvider } from './components/ui/Toast';
import PrivateRoute from './routes/PrivateRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy-load pages for code-splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Categories = lazy(() => import('./pages/Categories'));
const Budget = lazy(() => import('./pages/Budget'));
const Profile = lazy(() => import('./pages/Profile'));
const Bank = lazy(() => import('./pages/Bank'));
const Lend = lazy(() => import('./pages/Lend'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CategoryProvider>
              <ExpenseProvider>
                <BudgetProvider>
                  <BankProvider>
                  <LendProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route element={<PrivateRoute />}>
                        <Route element={<Layout />}>
                          <Route index element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/expenses" element={<Expenses />} />
                          <Route path="/categories" element={<Categories />} />
                          <Route path="/budget" element={<Budget />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/bank" element={<Bank />} />
                          <Route path="/lend" element={<Lend />} />
                        </Route>
                      </Route>
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Suspense>
                  </LendProvider>
                  </BankProvider>
                </BudgetProvider>
              </ExpenseProvider>
            </CategoryProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
