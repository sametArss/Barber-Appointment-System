using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Subscriptions;
using BarberBooking.Shared.DTOs.Subscriptions;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class SubscriptionManager : ISubscriptionService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;

        public SubscriptionManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
        }

        public async Task<IDataResult<IReadOnlyList<SubscriptionPlanDto>>> GetActivePlansAsync(CancellationToken cancellationToken = default)
        {
            var plans = await _unitOfWork.Repository<SubscriptionPlan>().GetAsync(p => p.IsActive, cancellationToken);
            var response = plans.Select(p => new SubscriptionPlanDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                MonthlyPrice = p.MonthlyPrice,
                AnnualPrice = p.AnnualPrice,
                MaxBranchCount = p.MaxBranchCount,
                MaxStaffPerBranch = p.MaxStaffPerBranch,
                MaxMonthlyAppointments = p.MaxMonthlyAppointments,
                HasSmsNotification = p.HasSmsNotification,
                HasAdvancedReporting = p.HasAdvancedReporting,
                IsActive = p.IsActive
            }).ToList();

            return DataResult<IReadOnlyList<SubscriptionPlanDto>>.Ok(response);
        }

        public async Task<IDataResult<BusinessSubscriptionDetailsDto>> GetCurrentSubscriptionAsync(CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<BusinessSubscriptionDetailsDto>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var subscription = await _unitOfWork.Repository<BusinessSubscription>().Query()
                .Include(s => s.Plan)
                .Where(s => s.BusinessId == businessId.Value && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (subscription == null)
            {
                return DataResult<BusinessSubscriptionDetailsDto>.Fail("Aktif bir abonelik planınız bulunamadı.", 404);
            }

            var branchCount = await _unitOfWork.Repository<Branch>()
                .CountAsync(b => b.BusinessId == businessId.Value && b.IsActive, cancellationToken);

            var staffCount = await _unitOfWork.Repository<StaffProfile>().Query()
                .CountAsync(sp => sp.BusinessMember.BusinessId == businessId.Value && sp.IsBookable, cancellationToken);

            var details = new BusinessSubscriptionDetailsDto
            {
                SubscriptionId = subscription.Id,
                BusinessId = subscription.BusinessId,
                PlanId = subscription.PlanId,
                PlanName = subscription.Plan.Name,
                Status = (int)subscription.Status,
                StatusName = subscription.Status.ToString(),
                BillingCycle = (int)subscription.BillingCycle,
                StartDate = subscription.StartDate,
                EndDate = subscription.EndDate,
                AutoRenew = subscription.AutoRenew,
                MaxBranchCount = subscription.Plan.MaxBranchCount,
                MaxStaffPerBranch = subscription.Plan.MaxStaffPerBranch,
                MaxMonthlyAppointments = subscription.Plan.MaxMonthlyAppointments,
                CurrentBranchCount = branchCount,
                CurrentStaffCount = staffCount
            };

            return DataResult<BusinessSubscriptionDetailsDto>.Ok(details);
        }

        public async Task<IResult> SubscribeAsync(SubscribeRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var plan = await _unitOfWork.Repository<SubscriptionPlan>().GetByIdAsync(request.PlanId, cancellationToken);
            if (plan == null || !plan.IsActive)
            {
                return Result.Fail("Abonelik planı bulunamadı veya aktif değil.", 404);
            }

            var now = DateTimeOffset.UtcNow;
            var cycle = (SubscriptionBillingCycle)request.BillingCycle;
            var endDate = cycle == SubscriptionBillingCycle.Annual ? now.AddYears(1) : now.AddMonths(1);

            // Önceki aktif abonelikleri sonlandır
            var existingSubs = await _unitOfWork.Repository<BusinessSubscription>().GetAsync(
                s => s.BusinessId == businessId.Value && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial),
                cancellationToken);

            foreach (var sub in existingSubs)
            {
                sub.Status = SubscriptionStatus.Cancelled;
                sub.CancelledAt = now;
                sub.CancellationReason = "Yeni plana geçiş yapıldı.";
            }

            var newSub = new BusinessSubscription
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId.Value,
                PlanId = plan.Id,
                Status = SubscriptionStatus.Active,
                BillingCycle = cycle,
                StartDate = now,
                EndDate = endDate,
                AutoRenew = true
            };

            await _unitOfWork.Repository<BusinessSubscription>().AddAsync(newSub, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Abonelik başarıyla başlatıldı.");
        }

        public async Task<IResult> CancelSubscriptionAsync(string reason, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var sub = await _unitOfWork.Repository<BusinessSubscription>().Query()
                .FirstOrDefaultAsync(s => s.BusinessId == businessId.Value && s.Status == SubscriptionStatus.Active, cancellationToken);

            if (sub == null)
            {
                return Result.Fail("İptal edilecek aktif bir abonelik bulunamadı.", 404);
            }

            sub.AutoRenew = false;
            sub.CancelledAt = DateTimeOffset.UtcNow;
            sub.CancellationReason = reason.Trim();
            sub.Status = SubscriptionStatus.Cancelled;

            _unitOfWork.Repository<BusinessSubscription>().Update(sub);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Aboneliğiniz iptal edildi.");
        }

        public async Task<IResult> CheckBranchLimitAsync(Guid businessId, CancellationToken cancellationToken = default)
        {
            var sub = await _unitOfWork.Repository<BusinessSubscription>().Query()
                .Include(s => s.Plan)
                .Where(s => s.BusinessId == businessId && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (sub == null)
            {
                return Result.Fail("İşletmenizin aktif bir abonelik paketi bulunmuyor.", 403);
            }

            var currentCount = await _unitOfWork.Repository<Branch>()
                .CountAsync(b => b.BusinessId == businessId && b.IsActive, cancellationToken);

            if (currentCount >= sub.Plan.MaxBranchCount)
            {
                return Result.Fail($"Paketinizin maksimum şube limitine ({sub.Plan.MaxBranchCount}) ulaştınız. Lütfen paketinizi yükseltiniz.", 403);
            }

            return Result.Ok();
        }

        public async Task<IResult> CheckStaffLimitAsync(Guid businessId, Guid branchId, CancellationToken cancellationToken = default)
        {
            var sub = await _unitOfWork.Repository<BusinessSubscription>().Query()
                .Include(s => s.Plan)
                .Where(s => s.BusinessId == businessId && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (sub == null)
            {
                return Result.Fail("İşletmenizin aktif bir abonelik paketi bulunmuyor.", 403);
            }

            var currentStaffInBranch = await _unitOfWork.Repository<StaffBranchAssignment>()
                .CountAsync(a => a.BranchId == branchId && a.StaffProfile.IsBookable, cancellationToken);

            if (currentStaffInBranch >= sub.Plan.MaxStaffPerBranch)
            {
                return Result.Fail($"Bu şube için maksimum çalışan limitine ({sub.Plan.MaxStaffPerBranch}) ulaştınız. Lütfen paketinizi yükseltiniz.", 403);
            }

            return Result.Ok();
        }
    }
}