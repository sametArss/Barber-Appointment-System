import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  UserCircle2,
  Menu,
  Scissors,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { NotificationBell } from '@/components/common/NotificationBell';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const sidebarItems = [
  { to: '/admin/dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { to: '/admin/calendar', label: 'Randevu Takvimi', icon: CalendarDays },
  { to: '/admin/branches', label: 'Şubelerim', icon: Building2 },
  { to: '/admin/business', label: 'İşletme Profili', icon: Building2 },
  { to: '/admin/profile', label: 'Hesabım', icon: UserCircle2 },
  { to: '/admin/staff', label: 'Personel & Mesai', icon: Users },
  { to: '/admin/services', label: 'Hizmet Menüsü', icon: Sparkles },
  { to: '/admin/subscription', label: 'Paket & Abonelik', icon: CreditCard },
  { to: '/admin/reports', label: 'Gelir Raporları', icon: BarChart3 },
];

const employeeSidebarItems = [
  { to: '/admin/dashboard', label: 'Ana Sayfa', icon: LayoutDashboard },
  { to: '/admin/workplaces', label: 'Çalıştığım Yerler', icon: Building2 },
  { to: '/admin/appointments', label: 'Randevularım', icon: CalendarCheck2 },
  { to: '/admin/profile', label: 'Hesabım', icon: UserCircle2 },
];

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, hasRole } = useAuthStore();
  const navigate = useNavigate();
  const employeeOnly = hasRole('Employee') && !hasRole(['BusinessOwner', 'BusinessManager']);
  const navigationItems = employeeOnly ? employeeSidebarItems : sidebarItems;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: null });
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Collapsible Modern Dashboard Sidebar (250px) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white/85 dark:border-amber-500/15 dark:bg-[#0F172A]/90 backdrop-blur-2xl transition-all duration-200 lg:static shadow-sm',
          collapsed ? 'lg:w-20' : 'lg:w-[250px]',
          mobileMenuOpen ? 'w-[250px] translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200/70 dark:border-amber-500/15 px-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-[#D97706] dark:border-amber-400/40 dark:text-amber-400 shadow-sm dark:shadow-[0_0_16px_rgba(245,158,11,0.25)]">
              <Scissors className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="block font-serif text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  Salon<span className="text-[#D97706] dark:text-amber-400">Yönetim</span>
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                  {employeeOnly ? 'Çalışan Portalı' : 'İşletme Portalı'}
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 cursor-pointer"
            aria-label="Menüyü Daralt"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
            aria-label="Menüyü Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold transition-all duration-200',
                    collapsed && 'lg:justify-center lg:px-0',
                    isActive
                      ? 'bg-[#D97706] text-white shadow-md shadow-amber-600/25 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100',
                  )
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User Mini-Card & Customer Portal Switch */}
        <div className="space-y-2 border-t border-slate-200/70 p-3 dark:border-amber-500/15">
          {!collapsed && (
            <Link
              to="/admin/profile"
              className="flex items-center gap-2.5 rounded-[14px] border border-slate-200/80 bg-slate-50/80 p-2.5 transition-colors hover:border-amber-500/40 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-amber-400/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-serif text-sm font-bold text-[#D97706] dark:text-amber-400">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {user?.fullName ?? 'Kullanıcı'}
                </p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {employeeOnly ? 'Çalışan' : 'Salon Yöneticisi'}
                </p>
              </div>
            </Link>
          )}
          <Link
            to="/explore"
            className={cn(
              'flex items-center gap-2.5 rounded-[14px] border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-amber-500/40 hover:text-[#D97706] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-amber-400/40 dark:hover:text-amber-400 transition-colors',
              collapsed && 'lg:justify-center lg:px-0',
            )}
          >
            <Scissors className="h-4 w-4 shrink-0 text-[#D97706] dark:text-amber-400" />
            {!collapsed && <span>Müşteri Vitrinine Dön</span>}
          </Link>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Profile Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/75 dark:border-amber-500/15 dark:bg-[#0B1120]/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl border border-slate-200 dark:border-zinc-800 p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 lg:hidden"
              aria-label="Menüyü Aç"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D97706] dark:text-amber-400">
                {employeeOnly ? 'ÇALIŞAN PORTALI' : 'SALON YÖNETİM SİSTEMİ'}
              </p>
              <p className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                {employeeOnly ? 'Çalışma alanı ve randevular' : 'Kontrol & Takvim Merkezi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/80 px-3 py-1.5 shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                  {user?.fullName ?? 'Salon Yöneticisi'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">{user?.email}</p>
              </div>
              <Badge variant="amber" className="hidden md:inline-flex text-[10px] py-0">
                {employeeOnly ? 'Çalışan' : user?.roles?.includes('BusinessOwner') ? 'İşletme Sahibi' : 'Yönetici'}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
