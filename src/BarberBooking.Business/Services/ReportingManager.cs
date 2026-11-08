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

            var startUtc = query.StartDate?.ToUniversalTime() ?? DateTimeOffset.UtcNow.AddDays(-30);
            var endUtc = query.EndDate?.ToUniversalTime() ?? DateTimeOffset.UtcNow;

            var appointmentsQuery = _unitOfWork.Repository<Appointment>().Query()
                .Include(a => a.Service)
                .Include(a => a.StaffProfile)
                    .ThenInclude(sp => sp.BusinessMember)
                        .ThenInclude(bm => bm.User)
                .Where(a => a.BusinessId == businessId.Value && a.StartAt >= startUtc && a.StartAt <= endUtc);

            if (query.BranchId.HasValue)
            {
                appointmentsQuery = appointmentsQuery.Where(a => a.BranchId == query.BranchId.Value);
            }

            var appointments = await appointmentsQuery.ToListAsync(cancellationToken);

            int total = appointments.Count;
            int completed = appointments.Count(a => a.Status == AppointmentStatus.Completed);
            int cancelled = appointments.Count(a => a.Status == AppointmentStatus.Cancelled);
            int noShow = appointments.Count(a => a.Status == AppointmentStatus.NoShow);

            decimal totalRevenue = appointments
                .Where(a => a.Status == AppointmentStatus.Completed)
                .Sum(a => a.PriceSnapshot);

            double cancellationRate = total > 0 ? Math.Round((double)(cancelled + noShow) / total * 100.0, 1) : 0.0;

            // En çok tercih edilen hizmetler
            var topServices = appointments
                .Where(a => a.Status == AppointmentStatus.Completed)
                .GroupBy(a => new { a.ServiceId, a.Service.Name })
                .Select(g => new TopServiceReportDto
                {
                    ServiceId = g.Key.ServiceId,
                    ServiceName = g.Key.Name,
                    AppointmentCount = g.Count(),
                    TotalRevenue = g.Sum(x => x.PriceSnapshot)
                })
                .OrderByDescending(x => x.AppointmentCount)
                .Take(5)
                .ToList();

            // İncelemeler / Puanlar
            var reviews = await _unitOfWork.Repository<Review>().Query()
                .Where(r => r.BusinessId == businessId.Value)
                .Select(r => new { r.Rating, r.Appointment.StaffProfileId })
                .ToListAsync(cancellationToken);

            double businessAvgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0.0;

            // Personel Performansı
            var staffPerformances = appointments
                .GroupBy(a => new
                {
                    a.StaffProfileId,
                    FullName = $"{a.StaffProfile.BusinessMember.User.FirstName} {a.StaffProfile.BusinessMember.User.LastName}"
                })
                .Select(g =>
                {
                    var staffReviews = reviews.Where(r => r.StaffProfileId == g.Key.StaffProfileId).ToList();
                    double staffAvg = staffReviews.Count > 0 ? Math.Round(staffReviews.Average(r => r.Rating), 1) : 0.0;

                    return new StaffPerformanceReportDto
                    {
                        StaffProfileId = g.Key.StaffProfileId,
                        StaffFullName = g.Key.FullName,
                        CompletedAppointments = g.Count(x => x.Status == AppointmentStatus.Completed),
                        TotalRevenue = g.Where(x => x.Status == AppointmentStatus.Completed).Sum(x => x.PriceSnapshot),
                        AverageRating = staffAvg
                    };
                })
                .OrderByDescending(x => x.TotalRevenue)
                .ToList();

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