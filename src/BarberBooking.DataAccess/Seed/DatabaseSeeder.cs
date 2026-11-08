using BarberBooking.DataAccess.Context;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Scheduling;
using BarberBooking.Entities.Services;
using BarberBooking.Entities.Subscriptions;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace BarberBooking.DataAccess.Seed
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(BarberBookingDbContext context)
        {
            await context.Database.MigrateAsync();

            // 1. Roller
            var roles = new[] { "SystemAdmin", "BusinessOwner", "BusinessManager", "Employee", "Customer" };
            foreach (var roleName in roles)
            {
                if (!await context.Roles.AnyAsync(r => r.Name == roleName))
                {
                    await context.Roles.AddAsync(new Role
                    {
                        Id = Guid.NewGuid(),
                        Name = roleName
                    });
                }
            }
            await context.SaveChangesAsync();

            // Şifre: 123456 (PasswordHasher formatı: SaltBase64.HashBase64 - PBKDF2 SHA512 100.000 iterasyon)
            const string defaultPasswordHash = "u9c4vYqT3f8L1xXz0wKmJQ==.R2DCgtTdKQYdsd0/y0xH/v+aWi+Mo7Ic8h5P/ZZdm58=";

            // Eğer zaten kullanıcı varsa devam etme
            if (await context.Users.AnyAsync()) return;

            // 2. Kullanıcılar
            var ownerUser = new User
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                FirstName = "Ahmet",
                LastName = "Usta",
                Email = "ahmet@makas.com",
                NormalizedEmail = "AHMET@MAKAS.COM",
                PhoneNumber = "05551112233",
                PasswordHash = defaultPasswordHash,
                IsActive = true
            };

            var staffUser = new User
            {
                Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                FirstName = "Mehmet",
                LastName = "Kalfa",
                Email = "mehmet@makas.com",
                NormalizedEmail = "MEHMET@MAKAS.COM",
                PhoneNumber = "05552223344",
                PasswordHash = defaultPasswordHash,
                IsActive = true
            };

            var customerUser = new User
            {
                Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                FirstName = "Samet",
                LastName = "Müşteri",
                Email = "samet@musteri.com",
                NormalizedEmail = "SAMET@MUSTERI.COM",
                PhoneNumber = "05553334455",
                PasswordHash = defaultPasswordHash,
                IsActive = true
            };

            await context.Users.AddRangeAsync(ownerUser, staffUser, customerUser);

            // Rol atamaları
            var ownerRole = await context.Roles.FirstAsync(r => r.Name == "BusinessOwner");
            var staffRole = await context.Roles.FirstAsync(r => r.Name == "Employee");
            var customerRole = await context.Roles.FirstAsync(r => r.Name == "Customer");

            await context.UserRoles.AddRangeAsync(
                new UserRole { UserId = ownerUser.Id, RoleId = ownerRole.Id },
                new UserRole { UserId = staffUser.Id, RoleId = staffRole.Id },
                new UserRole { UserId = customerUser.Id, RoleId = customerRole.Id }
            );

            // 3. İşletme
            var business = new Business
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000001"),
                Name = "Makas Sanat Berber & Salon",
                PhoneNumber = "02123334455",
                Email = "info@makassanat.com",
                Description = "Modern saç ve sakal tasarımı merkezi.",
                IsActive = true
            };
            await context.Businesses.AddAsync(business);

            // İşletme Üyeleri (BusinessMember)
            var ownerMember = new BusinessMember
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                UserId = ownerUser.Id,
                Role = BusinessRole.Owner,
                IsActive = true
            };

            var staffMember = new BusinessMember
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                UserId = staffUser.Id,
                Role = BusinessRole.Staff,
                IsActive = true
            };
            await context.BusinessMembers.AddRangeAsync(ownerMember, staffMember);

            // 4. Şube (Kadıköy / Moda WGS84 Point)
            var branch = new Branch
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
                BusinessId = business.Id,
                Name = "Moda Merkez Şubesi",
                City = "İstanbul",
                District = "Kadıköy",
                Address = "Moda Caddesi No:42/A",
                Location = new Point(29.0268, 40.9856) { SRID = 4326 },
                TimeZoneId = "Europe/Istanbul",
                IsActive = true
            };
            await context.Branches.AddAsync(branch);

            // 5. Hizmetler (Kategori olmadan doğrudan Business'a bağlı)
            var serviceHair = new Service
            {
                Id = Guid.Parse("30000000-0000-0000-0000-000000000001"),
                BusinessId = business.Id,
                Name = "Modern Saç Kesimi",
                DurationMinutes = 45,
                BasePrice = 350.00m,
                IsActive = true
            };

            var serviceBeard = new Service
            {
                Id = Guid.Parse("30000000-0000-0000-0000-000000000002"),
                BusinessId = business.Id,
                Name = "Sakal Şekillendirme & Sıcak Havlu",
                DurationMinutes = 30,
                BasePrice = 200.00m,
                IsActive = true
            };
            await context.Services.AddRangeAsync(serviceHair, serviceBeard);

            // Şube Hizmet Eşleşmesi
            await context.BranchServices.AddRangeAsync(
                new BranchService { Id = Guid.NewGuid(), BranchId = branch.Id, ServiceId = serviceHair.Id, IsActive = true },
                new BranchService { Id = Guid.NewGuid(), BranchId = branch.Id, ServiceId = serviceBeard.Id, IsActive = true }
            );

            // 6. Personel Profili & Şube Ataması
            var staffProfile = new StaffProfile
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000001"),
                BusinessMemberId = staffMember.Id,
                IsBookable = true
            };
            await context.StaffProfiles.AddAsync(staffProfile);

            await context.StaffBranchAssignments.AddAsync(new StaffBranchAssignment
            {
                StaffProfileId = staffProfile.Id,
                BranchId = branch.Id
            });

            // Personel Çalışma Saatleri ve Molalar
            var workingDays = new[]
            {
                DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday
            };

            foreach (var day in workingDays)
            {
                var swh = new StaffWorkingHour
                {
                    Id = Guid.NewGuid(),
                    StaffProfileId = staffProfile.Id,
                    BranchId = branch.Id,
                    DayOfWeek = day,
                    StartTime = new TimeOnly(9, 0),
                    EndTime = new TimeOnly(19, 0)
                };
                await context.StaffWorkingHours.AddAsync(swh);

                await context.StaffWorkingHourBreaks.AddAsync(new StaffWorkingHourBreak
                {
                    Id = Guid.NewGuid(),
                    StaffWorkingHourId = swh.Id,
                    StartTime = new TimeOnly(13, 0),
                    EndTime = new TimeOnly(14, 0)
                });
            }

            // 7. İşletme Aboneliği (Pro Paket)
            var proPlan = await context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Name == "Pro");
            if (proPlan != null)
            {
                await context.BusinessSubscriptions.AddAsync(new BusinessSubscription
                {
                    Id = Guid.NewGuid(),
                    BusinessId = business.Id,
                    PlanId = proPlan.Id,
                    Status = SubscriptionStatus.Active,
                    BillingCycle = SubscriptionBillingCycle.Monthly,
                    StartDate = DateTimeOffset.UtcNow,
                    EndDate = DateTimeOffset.UtcNow.AddMonths(1),
                    AutoRenew = true
                });
            }

            await context.SaveChangesAsync();
        }
    }
}