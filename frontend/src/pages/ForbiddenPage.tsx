import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import type { Role } from '@/types/auth';

export interface ForbiddenPageProps {
  allowedRoles?: Role[];
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ allowedRoles }) => {
  const navigate = useNavigate();
  const { user, hasRole, logout } = useAuthStore();

  const isStaffOrOwner = hasRole(['BusinessOwner', 'BusinessManager', 'Employee']);
  const homePath = isStaffOrOwner ? '/admin/dashboard' : '/explore';
  const homeLabel = isStaffOrOwner ? 'Salon Paneline Dön' : 'Keşfet Sayfasına Dön';

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12">
      <Card accent className="w-full max-w-md border-rose-500/30">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <Badge variant="danger" className="mb-3">
            403 • Yetkisiz Erişim
          </Badge>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Bu Sayfaya Erişim Yetkiniz Yok
          </h1>

          <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400">
            Aktif rolünüz ({user?.roles?.join(', ') || 'Misafir'}) bu alanı görüntülemek
            için yeterli yetkiye sahip değil.
          </p>

          {allowedRoles && allowedRoles.length > 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Gerekli roller: {allowedRoles.join(', ')}
            </p>
          )}

          <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate(homePath, { replace: true })}
            >
              <ArrowLeft className="h-4 w-4" />
              {homeLabel}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate('/login', { replace: true, state: null });
              }}
            >
              Farklı Hesap
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

