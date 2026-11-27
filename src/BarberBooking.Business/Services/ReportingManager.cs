using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Reviews;
using BarberBooking.Shared.DTOs.Reporting;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class ReportingManager : IReportingService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;

        public ReportingManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
        }

        public async Task<IDataResult<DashboardSummaryResponseDto>> GetDashboardSummaryAsync(DashboardSummaryQueryDto query, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<DashboardSummaryResponseDto>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var appointmentsQuery = _unitOfWork.Repository<Appointment>().QueryAsNoTracking()
                .Where(a => a.BusinessId == businessId.Value);

            if (query.StartDate.HasValue)
            {
                var startUtc = query.StartDate.Value.ToUniversalTime();
                appointmentsQuery = appointmentsQuery.Where(a => a.StartAt >= startUtc);
            }

            if (query.EndDate.HasValue)
            {
                var endUtc = query.EndDate.Value.ToUniversalTime();
                appointmentsQuery = appointmentsQuery.Where(a => a.StartAt <= endUtc);
            }

            if (query.BranchId.HasValue)
            {
                appointmentsQuery = appointmentsQuery.Where(a => a.BranchId == query.BranchId.Value);
            }

            // 1) SQL-side durum özeti (RAM'e en fazla 5 satır gelir)
            var statusAggs = await appointmentsQuery
                .GroupBy(a => a.Status)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count(),
                    Revenue = g.Sum(x => x.PriceSnapshot)
                })
                .ToListAsync(cancellationToken);

            var total = statusAggs.Sum(x => x.Count);
            var completed = statusAggs.FirstOrDefault(x => x.Status == AppointmentStatus.Completed)?.Count ?? 0;
            var cancelled = statusAggs.FirstOrDefault(x => x.Status == AppointmentStatus.Cancelled)?.Count ?? 0;
            var noShow = statusAggs.FirstOrDefault(x => x.Status == AppointmentStatus.NoShow)?.Count ?? 0;
            var totalRevenue = statusAggs.FirstOrDefault(x => x.Status == AppointmentStatus.Completed)?.Revenue ?? 0m;
            var cancellationRate = total > 0 ? Math.Round((double)(cancelled + noShow) / total * 100.0, 1) : 0.0;

            // 2) SQL-side en çok tercih edilen 5 hizmet
            var topServices = await appointmentsQuery
                .Where(a => a.Status == AppointmentStatus.Completed)
                .GroupBy(a => new { a.ServiceId, ServiceName = a.Service.Name })
                .Select(g => new TopServiceReportDto
                {
                    ServiceId = g.Key.ServiceId,
                    ServiceName = g.Key.ServiceName,
                    AppointmentCount = g.Count(),
                    TotalRevenue = g.Sum(x => x.PriceSnapshot)
                })
                .OrderByDescending(x => x.AppointmentCount)
                .Take(5)
                .ToListAsync(cancellationToken);

            // 3) SQL-side işletme ortalama puanı + personel puanları
            var reviewsQuery = _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .Where(r => r.BusinessId == businessId.Value);

            if (query.BranchId.HasValue)
            {
                reviewsQuery = reviewsQuery.Where(r => r.Appointment.BranchId == query.BranchId.Value);
            }

            var overallReviewStats = await reviewsQuery
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Avg = g.Average(r => (double)r.Rating),
                    Count = g.Count()
                })
                .FirstOrDefaultAsync(cancellationToken);

            var businessAvgRating = overallReviewStats != null ? Math.Round(overallReviewStats.Avg, 1) : 0.0;

            var staffRatingMap = await reviewsQuery
                .GroupBy(r => r.Appointment.StaffProfileId)
                .Select(g => new
                {
                    StaffProfileId = g.Key,
                    Avg = g.Average(r => (double)r.Rating)
                })
                .ToDictionaryAsync(x => x.StaffProfileId, x => Math.Round(x.Avg, 1), cancellationToken);

            // 4) SQL-side personel performansı (RAM'e sadece personel sayısı kadar satır gelir)
            var staffAggs = await appointmentsQuery
                .GroupBy(a => new
                {
                    a.StaffProfileId,
                    FirstName = a.StaffProfile.BusinessMember.User.FirstName,
                    LastName = a.StaffProfile.BusinessMember.User.LastName
                })
                .Select(g => new
                {
                    g.Key.StaffProfileId,
                    g.Key.FirstName,
                    g.Key.LastName,
                    CompletedAppointments = g.Count(x => x.Status == AppointmentStatus.Completed),
                    TotalRevenue = g.Where(x => x.Status == AppointmentStatus.Completed).Sum(x => x.PriceSnapshot)
                })
                .OrderByDescending(x => x.TotalRevenue)
                .ToListAsync(cancellationToken);

            var staffPerformances = staffAggs.Select(s => new StaffPerformanceReportDto
            {
                StaffProfileId = s.StaffProfileId,
                StaffFullName = $"{s.FirstName} {s.LastName}".Trim(),
                CompletedAppointments = s.CompletedAppointments,
                TotalRevenue = s.TotalRevenue,
                AverageRating = staffRatingMap.TryGetValue(s.StaffProfileId, out var avg) ? avg : 0.0
            }).ToList();

            var response = new DashboardSummaryResponseDto
            {
                TotalRevenue = totalRevenue,
                TotalAppointments = total,
                CompletedAppointments = completed,
                CancelledAppointments = cancelled,
                NoShowAppointments = noShow,
                CancellationRate = cancellationRate,
                AverageRating = businessAvgRating,
                TopServices = topServices,
                StaffPerformances = staffPerformances
            };

            return DataResult<DashboardSummaryResponseDto>.Ok(response);
        }
    }
}
