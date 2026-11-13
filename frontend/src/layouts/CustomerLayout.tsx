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
  const canUseCustomerBookings = hasRole('Customer');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: null });
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-slate-900 dark:bg-[#11110F] dark:text-zinc-100 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0 transition-colors duration-250">
      {/* Translucent Premium Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-[#09090B]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-500 dark:text-amber-400 transition-transform duration-200 group-hover:scale-105 shadow-sm">
              <Scissors className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Barber<span className="text-amber-500 dark:text-amber-400">Booking</span>
            </span>
          </Link>

          {/* Desktop Navigation with Animated Indicator */}
          <nav className="hidden md:flex items-center gap-1">
            {desktopLinks.filter((item) => canUseCustomerBookings || item.to !== '/my-appointments').map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="customer-navbar-active"
                      className="absolute inset-0 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </NavLink>
              );
            })}
            {isStaffOrOwner && (
              <NavLink
                to="/admin/dashboard"
                className="ml-2 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25 transition-all shadow-sm"
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
                  className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-zinc-700 shadow-sm"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
                    {user?.fullName?.charAt(0)?.toUpperCase() ?? 'M'}
                  </div>
                  <span className="max-w-28 truncate text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    {user?.fullName}
                  </span>
                  <Badge variant="amber" className="hidden lg:inline-flex py-0 text-[10px]">
                    {user?.roles?.[0] === 'BusinessOwner' ? 'İşletmeci' : 'Müşteri'}
                  </Badge>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Güvenli Çıkış"
                  aria-label="Güvenli Çıkış"
                >
                  <LogOut className="h-4 w-4 text-slate-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400" />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => navigate('/login')}>
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] dark:border-zinc-800/90 dark:bg-[#11110F]/95 backdrop-blur-xl md:hidden shadow-[0_-8px_28px_rgba(32,28,22,0.08)]"
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
