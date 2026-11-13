import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminCalendarPage } from '@/pages/AdminCalendarPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import {
  AdminBranchesPage,
  AdminReportsPage,
  AdminServicesPage,
  AdminStaffPage,
  AdminSubscriptionPage,
} from '@/pages/AdminPages';
import { BookingPage } from '@/pages/BookingPage';
import { BranchDetailPage } from '@/pages/BranchDetailPage';
import { CustomerProfilePage } from '@/pages/CustomerProfilePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { MyAppointmentsPage } from '@/pages/MyAppointmentsPage';
import { RegisterPage } from '@/pages/RegisterPage';

export function App() {
  return (
    <BrowserRouter>
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
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="calendar" element={<AdminCalendarPage />} />
              <Route path="branches" element={<AdminBranchesPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="subscription" element={<AdminSubscriptionPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
