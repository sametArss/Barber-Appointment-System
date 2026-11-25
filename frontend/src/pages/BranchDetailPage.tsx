import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BranchHeroSection,
  BranchReviewsSection,
  BranchServicesSection,
  BranchStaffSection,
} from '@/components/branch';
import { getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { reviewService } from '@/services/reviewService';
import { searchService } from '@/services/searchService';
import { useAuthStore } from '@/store/useAuthStore';
import {
  AppointmentStatus,
  type AppointmentResponse,
  type BranchSearchResponse,
  type BranchServiceResponse,
  type StaffResponse,
} from '@/types/booking';
import type { ReviewResponse } from '@/types/review';

interface BranchDetailLocationState {
  branch?: BranchSearchResponse;
}

export const BranchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as BranchDetailLocationState | null;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasRole = useAuthStore((s) => s.hasRole);
  const isCustomer = isAuthenticated && hasRole('Customer');

  const [branch, setBranch] = useState<BranchSearchResponse | undefined>(routeState?.branch);
  const [services, setServices] = useState<BranchServiceResponse[]>([]);
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [myAppointments, setMyAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBranchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [branchRes, srvRes, staffRes, revRes, myApptRes] = await Promise.all([
        searchService.getBranch(id),
        bookingService.getBranchServices(id),
        bookingService.getBranchStaff(id),
        reviewService.getBranchReviews(id),
        isCustomer ? bookingService.getMyAppointments().catch(() => null) : Promise.resolve(null),
      ]);

      if (branchRes.data) {
        setBranch((prev) => ({
          ...branchRes.data!,
          distanceMeters: prev?.distanceMeters ?? branchRes.data!.distanceMeters,
          distanceKm: prev?.distanceKm ?? branchRes.data!.distanceKm,
        }));
      }
      setServices((srvRes.data ?? []).filter((s) => s.isActive));
      setStaff((staffRes.data ?? []).filter((s) => s.isBookable));
      setReviews(revRes.data ?? []);
      if (myApptRes?.success && myApptRes.data) {
        setMyAppointments(myApptRes.data);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Şube detayları alınamadı.'));
    } finally {
      setLoading(false);
    }
  }, [id, isCustomer]);

  useEffect(() => {
    void loadBranchDetails();
  }, [loadBranchDetails]);

  const minPrice = useMemo(() => {
    if (services.length === 0) return null;
    return Math.min(...services.map((s) => s.finalPrice));
  }, [services]);

  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    }
    if (branch?.totalReviewCount && branch.totalReviewCount > 0 && branch.averageRating) {
      return branch.averageRating;
    }
    return null;
  }, [reviews, branch?.averageRating, branch?.totalReviewCount]);

  const reviewCount = reviews.length > 0 ? reviews.length : (branch?.totalReviewCount ?? 0);

  const eligibleAppointments = useMemo(() => {
    if (!id || !isCustomer) return [];
    const reviewedAppointmentIds = new Set(reviews.map((r) => r.appointmentId));
    return myAppointments.filter(
      (a) =>
        a.branchId === id &&
        a.status === AppointmentStatus.Completed &&
        !reviewedAppointmentIds.has(a.id),
    );
  }, [id, isCustomer, myAppointments, reviews]);

  if (!id) return null;

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({
        title: branch?.branchName || 'BarberBooking Salonu',
        url: window.location.href,
      });
    } else {
      void navigator.clipboard.writeText(window.location.href);
      toast.success('Salon bağlantısı kopyalandı!');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <BranchHeroSection
        branch={branch}
        loading={loading}
        serviceCount={services.length}
        staffCount={staff.length}
        minPrice={minPrice}
        averageRating={averageRating}
        reviewCount={reviewCount}
        onBack={() => navigate(-1)}
        onShare={handleShare}
        onBook={() => navigate(`/book/${id}`, { state: { branch } })}
      />

      {/* Services & Staff Grid */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <BranchServicesSection
            services={services}
            staff={staff}
            loading={loading}
            onSelectService={(serviceId) =>
              navigate(`/book/${id}`, {
                state: { branch, preselectedServiceId: serviceId },
              })
            }
          />
        </div>

        <div className="lg:col-span-5">
          <BranchStaffSection staff={staff} reviews={reviews} loading={loading} />
        </div>
      </div>

      {/* Real DB Reviews & Rating Breakdown */}
      <BranchReviewsSection
        reviews={reviews}
        loading={loading}
        eligibleAppointments={eligibleAppointments}
        onReviewCreated={loadBranchDetails}
      />
    </div>
  );
};
