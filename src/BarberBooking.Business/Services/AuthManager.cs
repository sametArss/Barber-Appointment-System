using System.Security.Cryptography;
using System.Text;
using BarberBooking.Business.Security;
using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Identity;
using BarberBooking.Shared.DTOs.Auth;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class AuthManager : IAuthService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ITokenService _tokenService;

        public AuthManager(
            IUnitOfWork unitOfWork,
            IPasswordHasher passwordHasher,
            ITokenService tokenService)
        {
            _unitOfWork = unitOfWork;
            _passwordHasher = passwordHasher;
            _tokenService = tokenService;
        }

        public async Task<IDataResult<AuthResponseDto>> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default)
        {
            var userRepo = _unitOfWork.Repository<User>();

            var emailTrimmed = request.Email.Trim();
            var emailNormalized = emailTrimmed.ToUpperInvariant();

            var exists = await userRepo.AnyAsync(u => u.NormalizedEmail == emailNormalized, cancellationToken);
            if (exists)
            {
                return DataResult<AuthResponseDto>.Fail("Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.", 400);
            }

            var passwordHash = _passwordHasher.HashPassword(request.Password);

            var user = new User
            {
                Id = Guid.NewGuid(),
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Email = emailTrimmed,
                NormalizedEmail = emailNormalized,
                PhoneNumber = request.PhoneNumber.Trim(),
                PasswordHash = passwordHash,
                IsActive = true
            };

            await userRepo.AddAsync(user, cancellationToken);

            // Varsayılan Customer rolü
            var roleRepo = _unitOfWork.Repository<Role>();
            var customerRole = await roleRepo.FirstOrDefaultAsync(r => r.Name == "Customer", cancellationToken);
            if (customerRole == null)
            {
                customerRole = new Role { Id = Guid.NewGuid(), Name = "Customer" };
                await roleRepo.AddAsync(customerRole, cancellationToken);
            }

            var userRoleRepo = _unitOfWork.Repository<UserRole>();
            await userRoleRepo.AddAsync(new UserRole
            {
                UserId = user.Id,
                RoleId = customerRole.Id
            }, cancellationToken);

            var tokenResponse = _tokenService.CreateToken(user, new[] { customerRole.Name });

            // Refresh token veritabanında hash'lenerek saklanır
            var refreshTokenRepo = _unitOfWork.Repository<RefreshToken>();
            await refreshTokenRepo.AddAsync(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = HashToken(tokenResponse.RefreshToken),
                ExpiresAt = tokenResponse.RefreshTokenExpiresAt,
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return DataResult<AuthResponseDto>.Ok(tokenResponse, "Kayıt işlemi başarıyla tamamlandı.");
        }

        public async Task<IDataResult<AuthResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
        {
            var userRepo = _unitOfWork.Repository<User>();
            var emailNormalized = request.Email.Trim().ToUpperInvariant();

            var user = await userRepo.Query()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.NormalizedEmail == emailNormalized, cancellationToken);

            if (user == null || !user.IsActive)
            {
                return DataResult<AuthResponseDto>.Fail("Geçersiz e-posta veya şifre.", 401);
            }

            var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return DataResult<AuthResponseDto>.Fail("Geçersiz e-posta veya şifre.", 401);
            }

            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            // İşletme üyeliği kontrolü
            var memberRepo = _unitOfWork.Repository<BusinessMember>();
            var member = await memberRepo.FirstOrDefaultAsync(m => m.UserId == user.Id, cancellationToken);
            Guid? businessId = member?.BusinessId;

            var tokenResponse = _tokenService.CreateToken(user, roles, businessId);

            var refreshTokenRepo = _unitOfWork.Repository<RefreshToken>();
            await refreshTokenRepo.AddAsync(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = HashToken(tokenResponse.RefreshToken),
                ExpiresAt = tokenResponse.RefreshTokenExpiresAt,
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return DataResult<AuthResponseDto>.Ok(tokenResponse, "Giriş başarılı.");
        }

        public async Task<IDataResult<AuthResponseDto>> RefreshTokenAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken = default)
        {
            var incomingTokenHash = HashToken(request.RefreshToken);

            var refreshTokenRepo = _unitOfWork.Repository<RefreshToken>();
            var storedToken = await refreshTokenRepo.FirstOrDefaultAsync(
                rt => rt.TokenHash == incomingTokenHash,
                cancellationToken);

            if (storedToken == null || storedToken.ExpiresAt <= DateTime.UtcNow || storedToken.RevokedAt != null)
            {
                return DataResult<AuthResponseDto>.Fail("Geçersiz veya süresi dolmuş refresh token.", 401);
            }

            var userRepo = _unitOfWork.Repository<User>();
            var user = await userRepo.Query()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == storedToken.UserId, cancellationToken);

            if (user == null || !user.IsActive)
            {
                return DataResult<AuthResponseDto>.Fail("Kullanıcı bulunamadı veya pasif durumda.", 401);
            }

            // Eski token iptali (Token Rotation)
            storedToken.RevokedAt = DateTime.UtcNow;
            refreshTokenRepo.Update(storedToken);

            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            var memberRepo = _unitOfWork.Repository<BusinessMember>();
            var member = await memberRepo.FirstOrDefaultAsync(m => m.UserId == user.Id, cancellationToken);
            Guid? businessId = member?.BusinessId;

            var tokenResponse = _tokenService.CreateToken(user, roles, businessId);

            // Yeni token kaydı
            await refreshTokenRepo.AddAsync(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = HashToken(tokenResponse.RefreshToken),
                ExpiresAt = tokenResponse.RefreshTokenExpiresAt,
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return DataResult<AuthResponseDto>.Ok(tokenResponse, "Token başarıyla yenilendi.");
        }

        private static string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(bytes);
        }
    }
}