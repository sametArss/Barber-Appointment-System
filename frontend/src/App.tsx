import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAuthStore } from '@/store/useAuthStore';

// Lazy-loaded pages for route-level code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const ExplorePage = lazy(() =>
  import('@/pages/ExplorePage').then((m) => ({ default: m.ExplorePage })),
);
const BranchDetailPage = lazy(() =>
  import('@/pages/BranchDetailPage').then((m) => ({ default: m.BranchDetailPage })),
);
const BookingPage = lazy(() =>
  import('@/pages/BookingPage').then((m) => ({ default: m.BookingPage })),
);
const MyAppointmentsPage = lazy(() =>
  import('@/pages/MyAppointmentsPage').then((m) => ({ default: m.MyAppointmentsPage })),
);
const CustomerProfilePage = lazy(() =>
  import('@/pages/CustomerProfilePage').then((m) => ({ default: m.CustomerProfilePage })),
);
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForbiddenPage = lazy(() =>
  import('@/pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })),
);

// Admin pages
const AdminDashboardPage = lazy(() =>
  import('@/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminCalendarPage = lazy(() =>
  import('@/pages/AdminCalendarPage').then((m) => ({ default: m.AdminCalendarPage })),
);
const AdminBranchesPage = lazy(() =>
  import('@/pages/admin/AdminBranchesPage').then((m) => ({ default: m.AdminBranchesPage })),
);
const AdminBusinessProfilePage = lazy(() =>
  import('@/pages/admin/AdminBusinessProfilePage').then((m) => ({
    default: m.AdminBusinessProfilePage,
  })),
);
const AdminStaffPage = lazy(() =>
  import('@/pages/admin/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage })),
);
const AdminServicesPage = lazy(() =>
  import('@/pages/admin/AdminServicesPage').then((m) => ({ default: m.AdminServicesPage })),
);
const AdminPenaltiesPage = lazy(() =>
  import('@/pages/admin/AdminPenaltiesPage').then((m) => ({ default: m.AdminPenaltiesPage })),
);
const AdminSubscriptionPage = lazy(() =>
  import('@/pages/admin/AdminSubscriptionPage').then((m) => ({
    default: m.AdminSubscriptionPage,
  })),
);
const AdminReportsPage = lazy(() =>
  import('@/pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
);

// Employee pages
const EmployeeDashboardPage = lazy(() =>
  import('@/pages/employee/EmployeeDashboardPage').then((m) => ({
    default: m.EmployeeDashboardPage,
  })),
);
const EmployeeWorkplacesPage = lazy(() =>
  import('@/pages/employee/EmployeeWorkplacesPage').then((m) => ({
    default: m.EmployeeWorkplacesPage,
  })),
);
const EmployeeAppointmentsPage = lazy(() =>
  import('@/pages/employee/EmployeeAppointmentsPage').then((m) => ({
    default: m.EmployeeAppointmentsPage,
  })),
);

const PageLoader: React.FC = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500/25 border-t-[#D97706] dark:border-amber-400/25 dark:border-t-amber-400" />
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Yükleniyor...</span>
    </div>
  </div>
);

const AdminHomePage: React.FC = () => {
  const { hasRole } = useAuthStore();
  const employeeOnly = hasRole('Employee') && !hasRole(['BusinessOwner', 'BusinessManager']);
  return employeeOnly ? <EmployeeDashboardPage /> : <AdminDashboardPage />;
};

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth & Error Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Customer Portal Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/branch/:id" element={<BranchDetailPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleGuard allowedRoles={['Customer']} />}>
                <Route path="/book/:branchId" element={<BookingPage />} />
                <Route path="/my-appointments" element={<MyAppointmentsPage />} />
              </Route>
              <Route
                element={
                  <RoleGuard
                    allowedRoles={['Customer', 'BusinessOwner', 'BusinessManager', 'Employee']}
                  />
                }
              >
                <Route path="/profile" element={<CustomerProfilePage />} />
              </Route>
            </Route>
          </Route>

          {/* Admin / Salon Portal Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <RoleGuard allowedRoles={['BusinessOwner', 'BusinessManager', 'Employee']} />
              }
            >
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="profile" element={<CustomerProfilePage />} />
                <Route path="dashboard" element={<AdminHomePage />} />
                <Route element={<RoleGuard allowedRoles={['BusinessOwner', 'BusinessManager']} />}>
                  <Route path="calendar" element={<AdminCalendarPage />} />
                  <Route path="branches" element={<AdminBranchesPage />} />
                  <Route path="business" element={<AdminBusinessProfilePage />} />
                  <Route path="staff" element={<AdminStaffPage />} />
                  <Route path="services" element={<AdminServicesPage />} />
                  <Route path="penalties" element={<AdminPenaltiesPage />} />
                  <Route path="subscription" element={<AdminSubscriptionPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                </Route>
                <Route element={<RoleGuard allowedRoles={['Employee']} />}>
                  <Route path="workplaces" element={<EmployeeWorkplacesPage />} />
                  <Route path="appointments" element={<EmployeeAppointmentsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
