using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
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

            if (query.RadiusKm <= 0)
            {
                query.RadiusKm = 10.0;
            }

            var radiusMeters = query.RadiusKm * 1000.0;

            var branchQuery = _unitOfWork.Repository<Branch>().Query()
                .Include(b => b.Business)
                .Where(b => b.IsActive && b.Business.IsActive && b.Location != null);

            // Şehir & İlçe filtreleri
            if (!string.IsNullOrWhiteSpace(query.City))
            {
                var cityTrim = query.City.Trim().ToUpperInvariant();
                branchQuery = branchQuery.Where(b => b.City.ToUpper() == cityTrim);
            }

            if (!string.IsNullOrWhiteSpace(query.District))
            {
                var distTrim = query.District.Trim().ToUpperInvariant();
                branchQuery = branchQuery.Where(b => b.District.ToUpper() == distTrim);
            }

            // Metin araması (İşletme adı, şube adı veya hizmet adına göre)
            if (!string.IsNullOrWhiteSpace(query.QueryText))
            {
                var term = query.QueryText.Trim().ToUpperInvariant();

                var matchingBranchIdsFromServices = await _unitOfWork.Repository<BranchService>().Query()
                    .Include(bs => bs.Service)
                    .Where(bs => bs.IsActive && bs.Service.IsActive && bs.Service.Name.ToUpper().Contains(term))
                    .Select(bs => bs.BranchId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                branchQuery = branchQuery.Where(b =>
                    b.Name.ToUpper().Contains(term) ||
                    b.Business.Name.ToUpper().Contains(term) ||
                    matchingBranchIdsFromServices.Contains(b.Id));
            }

            // Temel şube bilgilerini çek
            var branches = await branchQuery
                .Select(b => new
                {
                    Branch = b,
                    BusinessName = b.Business.Name,
                    BusinessPhone = b.Business.PhoneNumber
                })
                .ToListAsync(cancellationToken);

            // Metre cinsinden Haversine / Geodesic mesafe hesabı ve filtreleme
            var nearbyCandidates = branches
                .Select(x => new
                {
                    x.Branch,
                    x.BusinessName,
                    x.BusinessPhone,
                    DistanceMeters = CalculateDistanceMeters(query.Latitude, query.Longitude, x.Branch.Location.Y, x.Branch.Location.X)
                })
                .Where(x => x.DistanceMeters <= radiusMeters)
                .OrderBy(x => x.DistanceMeters)
                .Skip((query.PageNumber - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToList();

            if (nearbyCandidates.Count == 0)
            {
                return DataResult<IReadOnlyList<NearbyBranchResponseDto>>.Ok(new List<NearbyBranchResponseDto>());
            }

            // Yalnızca sayfaya giren şubelerin aktif hizmetlerini çek
            var pagedBranchIds = nearbyCandidates.Select(c => c.Branch.Id).ToList();
            var branchServices = await _unitOfWork.Repository<BranchService>().Query()
                .Include(bs => bs.Service)
                .Where(bs => pagedBranchIds.Contains(bs.BranchId) && bs.IsActive && bs.Service.IsActive)
                .Select(bs => new { bs.BranchId, ServiceName = bs.Service.Name })
                .ToListAsync(cancellationToken);

            var servicesByBranchId = branchServices
                .GroupBy(bs => bs.BranchId)
                .ToDictionary(g => g.Key, g => g.Select(s => s.ServiceName).ToList());

            var results = nearbyCandidates.Select(x => new NearbyBranchResponseDto
            {
                BranchId = x.Branch.Id,
                BusinessId = x.Branch.BusinessId,
                BusinessName = x.BusinessName,
                BranchName = x.Branch.Name,
                Address = x.Branch.Address,
                City = x.Branch.City,
                District = x.Branch.District,
                PhoneNumber = x.BusinessPhone,
                Longitude = x.Branch.Location.X,
                Latitude = x.Branch.Location.Y,
                DistanceMeters = Math.Round(x.DistanceMeters, 1),
                OfferedServices = servicesByBranchId.TryGetValue(x.Branch.Id, out var sList) ? sList : new List<string>()
            }).ToList();

            return DataResult<IReadOnlyList<NearbyBranchResponseDto>>.Ok(results);
        }

        private static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
        {
            const double r = 6371000.0; // Dünya yarıçapı metre
            var dLat = (lat2 - lat1) * Math.PI / 180.0;
            var dLon = (lon2 - lon1) * Math.PI / 180.0;

            var a = Math.Sin(dLat / 2.0) * Math.Sin(dLat / 2.0) +
                    Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                    Math.Sin(dLon / 2.0) * Math.Sin(dLon / 2.0);

            var c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
            return r * c;
        }
    }
}