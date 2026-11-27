using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Reviews;
using BarberBooking.Entities.Services;
using BarberBooking.Shared.DTOs.Search;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace BarberBooking.Business.Services
{
    public class SearchManager : ISearchService
    {
        private readonly IUnitOfWork _unitOfWork;

        public SearchManager(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IDataResult<IReadOnlyList<NearbyBranchResponseDto>>> SearchNearbyBranchesAsync(NearbyBranchesQueryDto query, CancellationToken cancellationToken = default)
        {
            if (query.Latitude < -90 || query.Latitude > 90 || query.Longitude < -180 || query.Longitude > 180)
            {
                return DataResult<IReadOnlyList<NearbyBranchResponseDto>>.Fail("Geçersiz koordinat değerleri.", 400);
            }

            var pageNumber = query.PageNumber < 1 ? 1 : query.PageNumber;
            var pageSize = query.PageSize is < 1 or > 50 ? 20 : query.PageSize;
            var hasRadiusLimit = query.RadiusKm.HasValue && query.RadiusKm.Value > 0;
            var radiusMeters = hasRadiusLimit ? query.RadiusKm!.Value * 1000.0 : double.MaxValue;
            var areaSearch = !string.IsNullOrWhiteSpace(query.City) || !string.IsNullOrWhiteSpace(query.District);

            var userPoint = new Point(query.Longitude, query.Latitude) { SRID = 4326 };

            // SQL-side filtering + AsNoTracking: tüm DB'yi RAM'e çekmez!
            var branchesQuery = _unitOfWork.Repository<Branch>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(b => b.IsActive && b.Business.IsActive && b.Location != null);

            if (!string.IsNullOrWhiteSpace(query.City))
            {
                var cityPattern = $"%{query.City.Trim()}%";
                branchesQuery = branchesQuery.Where(b => EF.Functions.ILike(b.City, cityPattern));
            }

            if (!string.IsNullOrWhiteSpace(query.District))
            {
                var distPattern = $"%{query.District.Trim()}%";
                branchesQuery = branchesQuery.Where(b => EF.Functions.ILike(b.District, distPattern));
            }

            if (!string.IsNullOrWhiteSpace(query.QueryText))
            {
                var termPattern = $"%{query.QueryText.Trim()}%";
                var matchingServiceBranchIds = _unitOfWork.Repository<BranchService>().QueryAsNoTracking()
                    .IgnoreQueryFilters()
                    .Where(bs => bs.IsActive &&
                                 bs.Service.IsActive &&
                                 bs.Service.BusinessId == bs.Branch.BusinessId &&
                                 EF.Functions.ILike(bs.Service.Name, termPattern))
                    .Select(bs => bs.BranchId);

                branchesQuery = branchesQuery.Where(b =>
                    EF.Functions.ILike(b.Name, termPattern) ||
                    EF.Functions.ILike(b.Business.Name, termPattern) ||
                    matchingServiceBranchIds.Contains(b.Id));
            }

            // Radius limiti varsa SQL'de PostGIS / derece sınırı ile ön-filtre uygula (1 derece ~ 111 km)
            if (!areaSearch && hasRadiusLimit)
            {
                var maxDeg = (query.RadiusKm!.Value / 111.0) * 1.35; // Güvenlik payı (kesin Haversine aşağıda kontrol edilir)
                branchesQuery = branchesQuery.Where(b => b.Location!.IsWithinDistance(userPoint, maxDeg));
            }

            // SQL'de mesafeye göre sırala ve yalnızca bu sayfanın şubelerini çek
            var pagedBranches = await branchesQuery
                .OrderBy(b => b.Location!.Distance(userPoint))
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.BusinessId,
                    BusinessName = b.Business.Name,
                    BusinessDescription = b.Business.Description,
                    BusinessPhone = b.Business.PhoneNumber,
                    b.Name,
                    b.Address,
                    b.City,
                    b.District,
                    Longitude = b.Location!.X,
                    Latitude = b.Location!.Y
                })
                .ToListAsync(cancellationToken);

            // Kesin Haversine mesafesi hesapla ve radius dışındaki kenar adayları ele
            var nearbyCandidates = pagedBranches
                .Select(x => new
                {
                    x.Id,
                    x.BusinessId,
                    x.BusinessName,
                    x.BusinessDescription,
                    x.BusinessPhone,
                    x.Name,
                    x.Address,
                    x.City,
                    x.District,
                    x.Longitude,
                    x.Latitude,
                    DistanceMeters = CalculateDistanceMeters(query.Latitude, query.Longitude, x.Latitude, x.Longitude)
                })
                .Where(x => areaSearch || !hasRadiusLimit || x.DistanceMeters <= radiusMeters)
                .OrderBy(x => x.DistanceMeters)
                .ToList();

            if (nearbyCandidates.Count == 0)
            {
                return DataResult<IReadOnlyList<NearbyBranchResponseDto>>.Ok(new List<NearbyBranchResponseDto>());
            }

            // Hizmet ve yorum özetlerini YALNIZCA bu sayfadaki (en fazla 50) şube için çek!
            var pageBranchIds = nearbyCandidates.Select(b => b.Id).ToList();

            var branchServices = await _unitOfWork.Repository<BranchService>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(bs => pageBranchIds.Contains(bs.BranchId) &&
                             bs.IsActive &&
                             bs.Service.IsActive &&
                             bs.Service.BusinessId == bs.Branch.BusinessId)
                .Select(bs => new { bs.BranchId, ServiceName = bs.Service.Name })
                .ToListAsync(cancellationToken);

            var servicesByBranchId = branchServices
                .GroupBy(bs => bs.BranchId)
                .ToDictionary(g => g.Key, g => g.Select(s => s.ServiceName).ToList());

            var reviewStatsByBranchId = await _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => pageBranchIds.Contains(r.Appointment.BranchId))
                .GroupBy(r => r.Appointment.BranchId)
                .Select(g => new
                {
                    BranchId = g.Key,
                    AverageRating = g.Average(r => (double)r.Rating),
                    TotalReviewCount = g.Count()
                })
                .ToDictionaryAsync(x => x.BranchId, cancellationToken);

            var results = nearbyCandidates.Select(x =>
            {
                var hasStats = reviewStatsByBranchId.TryGetValue(x.Id, out var stats);
                return new NearbyBranchResponseDto
                {
                    BranchId = x.Id,
                    BusinessId = x.BusinessId,
                    BusinessName = x.BusinessName,
                    BusinessDescription = x.BusinessDescription,
                    BranchName = x.Name,
                    Address = x.Address,
                    City = x.City,
                    District = x.District,
                    PhoneNumber = x.BusinessPhone,
                    Longitude = x.Longitude,
                    Latitude = x.Latitude,
                    DistanceMeters = Math.Round(x.DistanceMeters, 1),
                    AverageRating = hasStats && stats != null ? Math.Round(stats.AverageRating, 1) : 0.0,
                    TotalReviewCount = hasStats && stats != null ? stats.TotalReviewCount : 0,
                    OfferedServices = servicesByBranchId.TryGetValue(x.Id, out var sList) ? sList : new List<string>()
                };
            }).ToList();

            return DataResult<IReadOnlyList<NearbyBranchResponseDto>>.Ok(results);
        }

        public async Task<IDataResult<NearbyBranchResponseDto>> GetBranchAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var branch = await _unitOfWork.Repository<Branch>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(b => b.Id == branchId && b.IsActive && b.Business.IsActive && b.Location != null)
                .Select(b => new
                {
                    b.Id,
                    b.BusinessId,
                    BusinessName = b.Business.Name,
                    BusinessDescription = b.Business.Description,
                    BusinessPhone = b.Business.PhoneNumber,
                    b.Name,
                    b.Address,
                    b.City,
                    b.District,
                    Longitude = b.Location!.X,
                    Latitude = b.Location!.Y
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (branch == null)
                return DataResult<NearbyBranchResponseDto>.Fail("Şube bulunamadı.", 404);

            var services = await _unitOfWork.Repository<BranchService>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(bs => bs.BranchId == branchId && bs.IsActive && bs.Service.IsActive && bs.Service.BusinessId == branch.BusinessId)
                .Select(bs => bs.Service.Name)
                .ToListAsync(cancellationToken);

            var reviewStats = await _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => r.Appointment.BranchId == branchId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Average = g.Average(r => (double)r.Rating),
                    Count = g.Count()
                })
                .FirstOrDefaultAsync(cancellationToken);

            return DataResult<NearbyBranchResponseDto>.Ok(new NearbyBranchResponseDto
            {
                BranchId = branch.Id,
                BusinessId = branch.BusinessId,
                BusinessName = branch.BusinessName,
                BusinessDescription = branch.BusinessDescription,
                BranchName = branch.Name,
                Address = branch.Address,
                City = branch.City,
                District = branch.District,
                PhoneNumber = branch.BusinessPhone,
                Longitude = branch.Longitude,
                Latitude = branch.Latitude,
                AverageRating = reviewStats != null ? Math.Round(reviewStats.Average, 1) : 0.0,
                TotalReviewCount = reviewStats?.Count ?? 0,
                OfferedServices = services
            });
        }

        private static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000.0; // Dünya yarıçapı (metre)
            var dLat = (lat2 - lat1) * Math.PI / 180.0;
            var dLon = (lon2 - lon1) * Math.PI / 180.0;

            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }
    }
}
