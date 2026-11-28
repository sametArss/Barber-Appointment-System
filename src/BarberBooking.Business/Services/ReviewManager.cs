using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Reviews;
using BarberBooking.Shared.DTOs.Reviews;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class ReviewManager : IReviewService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;

        public ReviewManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
        }

        public async Task<IDataResult<ReviewResponseDto>> CreateReviewAsync(CreateReviewRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<ReviewResponseDto>.Fail("Yorum yapabilmek için oturum açmalısınız.", 401);
            }

            if (request.Rating < 1 || request.Rating > 5)
            {
                return DataResult<ReviewResponseDto>.Fail("Puan 1 ile 5 arasında olmalıdır.", 400);
            }

            var appointment = await _unitOfWork.Repository<Appointment>().Query()
                .Include(a => a.Branch)
                .Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember).ThenInclude(bm => bm.User)
                .Include(a => a.Customer)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken);

            if (appointment == null)
            {
                return DataResult<ReviewResponseDto>.Fail("Randevu bulunamadı.", 404);
            }

            // Randevunun sahibi mi?
            if (appointment.CustomerUserId != userId.Value)
            {
                return DataResult<ReviewResponseDto>.Fail("Yalnızca kendi randevularınız için yorum yapabilirsiniz.", 403);
            }

            // Sadece tamamlanmış randevular puanlanabilir
            if (appointment.Status != AppointmentStatus.Completed)
            {
                return DataResult<ReviewResponseDto>.Fail("Yalnızca tamamlanmış randevular için değerlendirme yapabilirsiniz.", 400);
            }

            // Salon sahibi / yöneticisi kendi işletmesine sahte değerlendirme yapamaz
            var isBusinessOwnerOrManager = await _unitOfWork.Repository<BusinessMember>().Query()
                .IgnoreQueryFilters()
                .AnyAsync(bm => bm.BusinessId == appointment.BusinessId &&
                                bm.UserId == userId.Value &&
                                bm.IsActive &&
                                (bm.Role == BusinessRole.Owner || bm.Role == BusinessRole.Manager),
                          cancellationToken);

            if (isBusinessOwnerOrManager || appointment.StaffProfile.BusinessMember.UserId == userId.Value)
            {
                return DataResult<ReviewResponseDto>.Fail("Kendi işletmeniz veya kendi verdiğiniz hizmet için değerlendirme yapamazsınız.", 403);
            }

            var reviewRepo = _unitOfWork.Repository<Review>();
            var alreadyReviewed = await reviewRepo.AnyAsync(r => r.AppointmentId == request.AppointmentId, cancellationToken);
            if (alreadyReviewed)
            {
                return DataResult<ReviewResponseDto>.Fail("Bu randevu için daha önce bir değerlendirme yapılmış.", 400);
            }

            var review = new Review
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                CustomerUserId = userId.Value,
                BusinessId = appointment.BusinessId,
                Rating = request.Rating,
                Comment = request.Comment?.Trim()
            };

            await reviewRepo.AddAsync(review, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var response = new ReviewResponseDto
            {
                Id = review.Id,
                AppointmentId = review.AppointmentId,
                CustomerUserId = review.CustomerUserId,
                CustomerFullName = $"{appointment.Customer.FirstName} {appointment.Customer.LastName}",
                BusinessId = review.BusinessId,
                BranchId = appointment.BranchId,
                BranchName = appointment.Branch.Name,
                StaffProfileId = appointment.StaffProfileId,
                StaffFullName = $"{appointment.StaffProfile.BusinessMember.User.FirstName} {appointment.StaffProfile.BusinessMember.User.LastName}",
                ServiceName = appointment.Service.Name,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedDate = review.CreatedAt
            };

            return DataResult<ReviewResponseDto>.Ok(response, "Değerlendirmeniz başarıyla kaydedildi.");
        }

        public async Task<IDataResult<IReadOnlyList<ReviewResponseDto>>> GetBranchReviewsAsync(Guid branchId, int skip = 0, int take = 30, CancellationToken cancellationToken = default)
        {
            var safeSkip = Math.Max(0, skip);
            var safeTake = Math.Clamp(take, 1, 100);

            var response = await _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => r.Appointment.BranchId == branchId)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(safeSkip)
                .Take(safeTake)
                .Select(r => new ReviewResponseDto
                {
                    Id = r.Id,
                    AppointmentId = r.AppointmentId,
                    CustomerUserId = r.CustomerUserId,
                    CustomerFullName = r.Customer.FirstName + " " + r.Customer.LastName,
                    BusinessId = r.BusinessId,
                    BranchId = r.Appointment.BranchId,
                    BranchName = r.Appointment.Branch.Name,
                    StaffProfileId = r.Appointment.StaffProfileId,
                    StaffFullName = r.Appointment.StaffProfile.BusinessMember.User.FirstName + " " + r.Appointment.StaffProfile.BusinessMember.User.LastName,
                    ServiceName = r.Appointment.Service.Name,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedDate = r.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return DataResult<IReadOnlyList<ReviewResponseDto>>.Ok(response);
        }

        public async Task<IDataResult<IReadOnlyList<ReviewResponseDto>>> GetStaffReviewsAsync(Guid staffProfileId, int skip = 0, int take = 30, CancellationToken cancellationToken = default)
        {
            var safeSkip = Math.Max(0, skip);
            var safeTake = Math.Clamp(take, 1, 100);

            var response = await _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => r.Appointment.StaffProfileId == staffProfileId)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(safeSkip)
                .Take(safeTake)
                .Select(r => new ReviewResponseDto
                {
                    Id = r.Id,
                    AppointmentId = r.AppointmentId,
                    CustomerUserId = r.CustomerUserId,
                    CustomerFullName = r.Customer.FirstName + " " + r.Customer.LastName,
                    BusinessId = r.BusinessId,
                    BranchId = r.Appointment.BranchId,
                    BranchName = r.Appointment.Branch.Name,
                    StaffProfileId = r.Appointment.StaffProfileId,
                    StaffFullName = r.Appointment.StaffProfile.BusinessMember.User.FirstName + " " + r.Appointment.StaffProfile.BusinessMember.User.LastName,
                    ServiceName = r.Appointment.Service.Name,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedDate = r.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return DataResult<IReadOnlyList<ReviewResponseDto>>.Ok(response);
        }

        public async Task<IDataResult<BusinessReviewSummaryDto>> GetBusinessReviewSummaryAsync(Guid businessId, CancellationToken cancellationToken = default)
        {
            var baseQuery = _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => r.BusinessId == businessId);

            // SQL-side ortalama & toplam sayı (RAM'e tüm yorumları çekmez)
            var stats = await baseQuery
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    Avg = g.Average(r => (double)r.Rating)
                })
                .FirstOrDefaultAsync(cancellationToken);

            var recentReviews = await baseQuery
                .OrderByDescending(r => r.CreatedAt)
                .Take(10)
                .Select(r => new ReviewResponseDto
                {
                    Id = r.Id,
                    AppointmentId = r.AppointmentId,
                    CustomerUserId = r.CustomerUserId,
                    CustomerFullName = r.Customer.FirstName + " " + r.Customer.LastName,
                    BusinessId = r.BusinessId,
                    BranchId = r.Appointment.BranchId,
                    BranchName = r.Appointment.Branch.Name,
                    StaffProfileId = r.Appointment.StaffProfileId,
                    StaffFullName = r.Appointment.StaffProfile.BusinessMember.User.FirstName + " " + r.Appointment.StaffProfile.BusinessMember.User.LastName,
                    ServiceName = r.Appointment.Service.Name,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedDate = r.CreatedAt
                })
                .ToListAsync(cancellationToken);

            var summary = new BusinessReviewSummaryDto
            {
                BusinessId = businessId,
                AverageRating = stats != null ? Math.Round(stats.Avg, 1) : 0.0,
                TotalReviewCount = stats?.Total ?? 0,
                RecentReviews = recentReviews
            };

            return DataResult<BusinessReviewSummaryDto>.Ok(summary);
        }
    }
}