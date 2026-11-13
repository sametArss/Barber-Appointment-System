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

            var branches = await _unitOfWork.Repository<Branch>().Query()
                .Include(b => b.Business)
                .Where(b => b.IsActive && b.Business.IsActive && b.Location != null)
                .Select(b => new
                {
                    Branch = b,
                    BusinessName = b.Business.Name,
                    BusinessPhone = b.Business.PhoneNumber
                })
                .ToListAsync(cancellationToken);

            var allBranchIds = branches.Select(b => b.Branch.Id).ToList();
            var branchServices = await _unitOfWork.Repository<BranchService>().Query()
                .Include(bs => bs.Service)
                .Include(bs => bs.Branch)
                .Where(bs => allBranchIds.Contains(bs.BranchId) &&
                             bs.IsActive &&
                             bs.Service.IsActive &&
                             bs.Service.BusinessId == bs.Branch.BusinessId)
                .Select(bs => new { bs.BranchId, ServiceName = bs.Service.Name })
                .ToListAsync(cancellationToken);

            var servicesByBranchId = branchServices
                .GroupBy(bs => bs.BranchId)
                .ToDictionary(g => g.Key, g => g.Select(s => s.ServiceName).ToList());

            var filteredBranches = branches.AsEnumerable();

            // Şehir filtresi (Türkçe karakter duyarsız)
            if (!string.IsNullOrWhiteSpace(query.City))
            {
                var cityNorm = NormalizeSearchText(query.City);
                filteredBranches = filteredBranches.Where(x =>
                    NormalizeSearchText(x.Branch.City).Contains(cityNorm));
            }

            // İlçe filtresi (Türkçe karakter duyarsız)
            if (!string.IsNullOrWhiteSpace(query.District))
            {
                var distNorm = NormalizeSearchText(query.District);
                filteredBranches = filteredBranches.Where(x =>
                    NormalizeSearchText(x.Branch.District).Contains(distNorm));
            }

            // Metin araması (İşletme adı, şube adı veya yalnızca o şubeye atanmış hizmet adına göre)
            if (!string.IsNullOrWhiteSpace(query.QueryText))
            {
                var termNorm = NormalizeSearchText(query.QueryText);
                filteredBranches = filteredBranches.Where(x =>
                {
                    var branchMatch = NormalizeSearchText(x.Branch.Name).Contains(termNorm);
                    var bizMatch = NormalizeSearchText(x.BusinessName).Contains(termNorm);
                    var srvMatch = servicesByBranchId.TryGetValue(x.Branch.Id, out var sList) &&
                                   sList.Any(s => NormalizeSearchText(s).Contains(termNorm));
                    return branchMatch || bizMatch || srvMatch;
                });
            }

            // Metre cinsinden Haversine / Geodesic mesafe hesabı ve filtreleme
            var areaSearch = !string.IsNullOrWhiteSpace(query.City) || !string.IsNullOrWhiteSpace(query.District);
            var nearbyCandidates = filteredBranches
                .Select(x => new
                {
                    x.Branch,
                    x.BusinessName,
                    x.BusinessPhone,
                    DistanceMeters = CalculateDistanceMeters(query.Latitude, query.Longitude, x.Branch.Location!.Y, x.Branch.Location!.X)
                })
                // Explicit city/district searches work independently of browser location.
                .Where(x => areaSearch || x.DistanceMeters <= radiusMeters)
                .OrderBy(x => x.DistanceMeters)
                .Skip((query.PageNumber - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToList();

            if (nearbyCandidates.Count == 0)
            {
                return DataResult<IReadOnlyList<NearbyBranchResponseDto>>.Ok(new List<NearbyBranchResponseDto>());
            }

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
                Longitude = x.Branch.Location!.X,
                Latitude = x.Branch.Location!.Y,
                DistanceMeters = Math.Round(x.DistanceMeters, 1),
                OfferedServices = servicesByBranchId.TryGetValue(x.Branch.Id, out var sList) ? sList : new List<string>()
            }).ToList();

            return DataResult<IReadOnlyList<NearbyBranchResponseDto>>.Ok(results);
        }

        public async Task<IDataResult<NearbyBranchResponseDto>> GetBranchAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var branch = await _unitOfWork.Repository<Branch>().Query()
                .Include(b => b.Business)
                .FirstOrDefaultAsync(b => b.Id == branchId && b.IsActive && b.Business.IsActive && b.Location != null, cancellationToken);

            if (branch == null)
                return DataResult<NearbyBranchResponseDto>.Fail("Şube bulunamadı.", 404);

            var services = await _unitOfWork.Repository<BranchService>().Query()
                .Include(bs => bs.Service)
                .Where(bs => bs.BranchId == branchId && bs.IsActive && bs.Service.IsActive && bs.Service.BusinessId == branch.BusinessId)
                .Select(bs => bs.Service.Name)
                .ToListAsync(cancellationToken);

            return DataResult<NearbyBranchResponseDto>.Ok(new NearbyBranchResponseDto
            {
                BranchId = branch.Id,
                BusinessId = branch.BusinessId,
                BusinessName = branch.Business.Name,
                BranchName = branch.Name,
                Address = branch.Address,
                City = branch.City,
                District = branch.District,
                PhoneNumber = branch.Business.PhoneNumber,
                Longitude = branch.Location!.X,
                Latitude = branch.Location!.Y,
                OfferedServices = services
            });
        }

        private static string NormalizeSearchText(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            return input.Trim()
                .Replace('İ', 'i')
                .Replace('I', 'i')
                .Replace('ı', 'i')
                .Replace('Ş', 's')
                .Replace('ş', 's')
                .Replace('Ğ', 'g')
                .Replace('ğ', 'g')
                .Replace('Ü', 'u')
                .Replace('ü', 'u')
                .Replace('Ö', 'o')
                .Replace('ö', 'o')
                .Replace('Ç', 'c')
                .Replace('ç', 'c')
                .ToLowerInvariant();
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
