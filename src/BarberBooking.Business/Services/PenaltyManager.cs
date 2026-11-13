using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Customers;
using BarberBooking.Shared.DTOs.Customers;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class PenaltyManager : IPenaltyService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private const int StrikeLimit = 3;
        private const int PenaltyValidityDays = 90;
        private const int BanDurationDays = 14;

        public PenaltyManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
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

        public async Task<IResult> ForgivePenaltyAsync(Guid penaltyId, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var penaltyRepo = _unitOfWork.Repository<CustomerPenalty>();
            var penalty = await penaltyRepo.FirstOrDefaultAsync(
                p => p.Id == penaltyId && p.BusinessId == businessId.Value,
                cancellationToken);

            if (penalty == null)
            {
                return Result.Fail("Ceza kaydı bulunamadı.", 404);
            }

            penalty.IsActive = false;
            penaltyRepo.Update(penalty);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Ceza kaydı işletme tarafından affedildi.");
        }
    }
}