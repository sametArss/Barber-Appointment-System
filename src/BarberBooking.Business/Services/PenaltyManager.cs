using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Customers;
using BarberBooking.Entities.Notifications;
using BarberBooking.Shared.DTOs.Customers;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class PenaltyManager : IPenaltyService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private readonly INotificationService _notificationService;
        private const int StrikeLimit = 3;
        private const int PenaltyValidityDays = 90;
        private const int BanDurationDays = 14;

        public PenaltyManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _notificationService = notificationService;
        }

        public async Task<IResult> AddPenaltyAsync(CreatePenaltyRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            if (!Enum.IsDefined(typeof(PenaltyReason), request.Reason))
            {
                return Result.Fail("Geçersiz ceza nedeni.", 400);
            }

            if (request.AppointmentId.HasValue)
            {
                var alreadyExists = await _unitOfWork.Repository<CustomerPenalty>().Query()
                    .IgnoreQueryFilters()
                    .AnyAsync(p => p.AppointmentId == request.AppointmentId.Value && p.IsActive, cancellationToken);

                if (alreadyExists)
                {
                    return Result.Ok("Müşteri ceza kaydı başarıyla eklendi.");
                }
            }

            var penalty = new CustomerPenalty
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId.Value,
                CustomerUserId = request.CustomerUserId,
                AppointmentId = request.AppointmentId,
                Reason = (PenaltyReason)request.Reason,
                Note = request.Note?.Trim(),
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(PenaltyValidityDays),
                IsActive = true
            };

            await _unitOfWork.Repository<CustomerPenalty>().AddAsync(penalty, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Müşteri ceza kaydı başarıyla eklendi.");
        }

        public async Task<IDataResult<CustomerPenaltyStatusDto>> CheckCustomerRestrictionAsync(Guid customerUserId, Guid businessId, CancellationToken cancellationToken = default)
        {
            var now = DateTimeOffset.UtcNow;

            var activePenalties = await _unitOfWork.Repository<CustomerPenalty>().Query()
                .IgnoreQueryFilters()
                .Where(p => p.CustomerUserId == customerUserId &&
                            (businessId == Guid.Empty || p.BusinessId == businessId) &&
                            p.IsActive &&
                            p.ExpiresAt > now)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync(cancellationToken);

            int count = activePenalties.Count;
            bool isRestricted = count >= StrikeLimit;
            DateTimeOffset? restrictionExpires = null;
            string? message = null;

            if (isRestricted)
            {
                var latestPenalty = activePenalties.First();
                restrictionExpires = latestPenalty.CreatedAt.AddDays(BanDurationDays);

                if (restrictionExpires > now)
                {
                    message = $"Son dönemdeki no-show / geç iptal ihlalleri nedeniyle {restrictionExpires:dd.MM.yyyy HH:mm} tarihine kadar bu işletmeden yeni randevu alamazsınız.";
                }
                else
                {
                    // Ban süresi dolduysa kısıtlama kalkar
                    isRestricted = false;
                }
            }

            var response = new CustomerPenaltyStatusDto
            {
                CustomerUserId = customerUserId,
                ActivePenaltyCount = count,
                IsRestricted = isRestricted,
                RestrictionExpiresAt = isRestricted ? restrictionExpires : null,
                RestrictionMessage = message,
                Penalties = activePenalties.Select(p => new PenaltyItemDto
                {
                    Id = p.Id,
                    BusinessId = p.BusinessId,
                    AppointmentId = p.AppointmentId,
                    ReasonName = p.Reason.ToString(),
                    Note = p.Note,
                    CreatedDate = p.CreatedAt,
                    ExpiresAt = p.ExpiresAt
                }).ToList()
            };

            return DataResult<CustomerPenaltyStatusDto>.Ok(response);
        }

        public async Task<IDataResult<CustomerPenaltyStatusDto>> GetMyPenaltyStatusAsync(Guid businessId, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<CustomerPenaltyStatusDto>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            return await CheckCustomerRestrictionAsync(userId.Value, businessId, cancellationToken);
        }

        public async Task<IDataResult<IReadOnlyList<BusinessPenaltyItemDto>>> GetBusinessPenaltiesAsync(int skip = 0, int take = 50, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<IReadOnlyList<BusinessPenaltyItemDto>>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var safeSkip = Math.Max(0, skip);
            var safeTake = Math.Clamp(take, 1, 100);
            var now = DateTimeOffset.UtcNow;

            var penalties = await _unitOfWork.Repository<CustomerPenalty>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(p => p.Customer)
                .Include(p => p.Appointment).ThenInclude(a => a!.Branch)
                .Include(p => p.Appointment).ThenInclude(a => a!.Service)
                .Where(p => p.BusinessId == businessId.Value)
                .OrderByDescending(p => p.IsActive && p.ExpiresAt > now)
                .ThenByDescending(p => p.CreatedAt)
                .Skip(safeSkip)
                .Take(safeTake)
                .ToListAsync(cancellationToken);

            var customerIds = penalties.Select(p => p.CustomerUserId).Distinct().ToList();
            var activeCounts = customerIds.Count == 0
                ? new Dictionary<Guid, int>()
                : await _unitOfWork.Repository<CustomerPenalty>().QueryAsNoTracking()
                    .IgnoreQueryFilters()
                    .Where(p => p.BusinessId == businessId.Value &&
                                customerIds.Contains(p.CustomerUserId) &&
                                p.IsActive &&
                                p.ExpiresAt > now)
                    .GroupBy(p => p.CustomerUserId)
                    .Select(g => new { CustomerUserId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.CustomerUserId, x => x.Count, cancellationToken);

            var result = penalties.Select(p => new BusinessPenaltyItemDto
            {
                Id = p.Id,
                CustomerUserId = p.CustomerUserId,
                CustomerFullName = $"{p.Customer.FirstName} {p.Customer.LastName}".Trim(),
                CustomerEmail = p.Customer.Email,
                CustomerPhoneNumber = p.Customer.PhoneNumber ?? string.Empty,
                AppointmentId = p.AppointmentId,
                BranchName = p.Appointment?.Branch?.Name,
                ServiceName = p.Appointment?.Service?.Name,
                AppointmentStartAt = p.Appointment?.StartAt,
                ReasonName = p.Reason.ToString(),
                Note = p.Note,
                IsActive = p.IsActive,
                IsExpired = p.ExpiresAt <= now,
                CreatedDate = p.CreatedAt,
                ExpiresAt = p.ExpiresAt,
                CustomerActivePenaltyCount = activeCounts.TryGetValue(p.CustomerUserId, out var cnt) ? cnt : 0
            }).ToList();

            return DataResult<IReadOnlyList<BusinessPenaltyItemDto>>.Ok(result);
        }

        public async Task<IResult> ForgivePenaltyAsync(Guid penaltyId, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var penaltyRepo = _unitOfWork.Repository<CustomerPenalty>();
            var penalty = await penaltyRepo.Query()
                .IgnoreQueryFilters()
                .Include(p => p.Business)
                .FirstOrDefaultAsync(p => p.Id == penaltyId && p.BusinessId == businessId.Value, cancellationToken);

            if (penalty == null)
            {
                return Result.Fail("Ceza kaydı bulunamadı.", 404);
            }

            penalty.IsActive = false;
            penaltyRepo.Update(penalty);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            try
            {
                await _notificationService.SendNotificationAsync(
                    penalty.CustomerUserId,
                    NotificationType.General,
                    "Ceza Kaydınız Affedildi",
                    $"{penalty.Business?.Name ?? "Salon"} işletmesindeki ceza kaydınız işletme yöneticisi tarafından kaldırıldı.",
                    penalty.AppointmentId ?? penalty.Id,
                    cancellationToken);
            }
            catch
            {
                // Bildirim hatası ceza affını engellememeli
            }

            return Result.Ok("Ceza kaydı işletme tarafından affedildi.");
        }
    }
}