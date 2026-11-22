import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Compass,
  Home,
  LogIn,
  LogOut,
  Scissors,
  UserCircle2,
} from 'lucide-react';
import { NotificationBell } from '@/components/common/NotificationBell';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const desktopLinks = [
  { to: '/explore', label: 'Salonları Keşfet', icon: Compass },
  { to: '/my-appointments', label: 'Randevularım', icon: CalendarCheck },
  { to: '/profile', label: 'Profilim', icon: UserCircle2 },
];

const mobileLinks = [
  { to: '/', label: 'Vitrin', icon: Home },
  { to: '/explore', label: 'Keşfet', icon: Compass },
  { to: '/my-appointments', label: 'Randevular', icon: CalendarCheck },
  { to: '/profile', label: 'Profil', icon: UserCircle2 },
];

export const CustomerLayout: React.FC = () => {
  const { isAuthenticated, user, hasRole, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isStaffOrOwner = hasRole(['BusinessOwner', 'BusinessManager', 'Employee']);
  const canUseCustomerBookings = hasRole('Customer') && !isStaffOrOwner;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: null });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0 transition-colors duration-300">
      {/* Ambient Dark Mode Warm Amber Glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 hidden h-[520px] bg-[radial-gradient(ellipse_65%_45%_at_50%_-10%,rgba(245,158,11,0.14),transparent_70%)] dark:block" />

      {/* Glassmorphism Sticky Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-amber-500/15 dark:bg-[#0B1120]/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 shadow-sm transition-all duration-200 group-hover:scale-105 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-400 dark:shadow-[0_0_18px_rgba(245,158,11,0.28)]">
              <Scissors className="h-4.5 w-4.5" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Barber<span className="text-amber-600 dark:text-amber-400">Booking</span>
            </span>
          </Link>

          {/* Center Navigation Links with Hover Pill & Dark Mode Amber Glow */}
          <nav className="hidden md:flex items-center gap-1.5">
            {desktopLinks.filter((item) => canUseCustomerBookings || item.to !== '/my-appointments').map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200 dark:hover:shadow-[0_0_16px_rgba(245,158,11,0.18)]',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="customer-navbar-active"
                      className="absolute inset-0 -z-10 rounded-full border border-amber-500/30 bg-amber-500/10 dark:border-amber-400/35 dark:bg-amber-500/15 dark:shadow-[0_0_18px_rgba(245,158,11,0.22)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </NavLink>
              );
            })}
            {isStaffOrOwner && (
              <NavLink
                to="/admin/dashboard"
                className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-500/20 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 dark:hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]"
              >
                Salon Yönetim Paneli
              </NavLink>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/80 px-3 py-1.5 shadow-sm transition-colors hover:border-amber-500/40 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-amber-400/40"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                    {user?.fullName?.charAt(0)?.toUpperCase() ?? 'M'}
                  </div>
                  <span className="max-w-28 truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {user?.fullName}
                  </span>
                  <Badge variant="amber" className="hidden lg:inline-flex py-0 text-[10px]">
                    {hasRole(['BusinessOwner', 'BusinessManager'])
                      ? 'İşletmeci'
                      : hasRole('Employee')
                        ? 'Personel'
                        : 'Müşteri'}
                  </Badge>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Güvenli Çıkış"
                  aria-label="Güvenli Çıkış"
                >
                  <LogOut className="h-4 w-4 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate('/login')}
                className="rounded-full bg-amber-500 px-4 font-semibold text-white shadow-sm shadow-amber-500/25 hover:bg-amber-600 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.4)] dark:hover:bg-amber-400"
              >
                <LogIn className="h-4 w-4" />
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobil Gezinme"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-amber-500/15 dark:bg-[#0B1120]/90 md:hidden shadow-[0_-8px_28px_rgba(15,23,42,0.08)]"
      >
        <div className={cn('grid gap-1 px-2 py-1.5', canUseCustomerBookings ? 'grid-cols-4' : 'grid-cols-3')}>
          {mobileLinks.filter((item) => canUseCustomerBookings || item.to !== '/my-appointments').map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-colors',
                  isActive
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200',
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-navbar-active"
                    className="absolute inset-0 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
