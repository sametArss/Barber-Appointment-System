using System.Linq.Expressions;
using System.Reflection;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Favorites;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Notifications;
using BarberBooking.Entities.Reviews;
using BarberBooking.Entities.Scheduling;
using BarberBooking.Entities.Services;
using Microsoft.EntityFrameworkCore;
using BarberBooking.Entities.Customers;
using BarberBooking.Entities.Subscriptions;

namespace BarberBooking.DataAccess.Context
{
    public class BarberBookingDbContext : DbContext
    {
        private readonly ICurrentTenantService? _tenantService;

        public Guid? CurrentTenantId => _tenantService?.BusinessId;
        public bool IsSuperAdmin => _tenantService?.IsSuperAdmin ?? false;
        public bool HasTenantService => _tenantService != null;

        public BarberBookingDbContext(
            DbContextOptions<BarberBookingDbContext> options,
            ICurrentTenantService? tenantService = null)
            : base(options)
        {
            _tenantService = tenantService;
        }

        // Identity
        public DbSet<User> Users => Set<User>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<UserRole> UserRoles => Set<UserRole>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        // Businesses & Branches & Staff
        public DbSet<Business> Businesses => Set<Business>();
        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<BusinessMember> BusinessMembers => Set<BusinessMember>();
        public DbSet<StaffProfile> StaffProfiles => Set<StaffProfile>();
        public DbSet<StaffBranchAssignment> StaffBranchAssignments => Set<StaffBranchAssignment>();

        // Services
        public DbSet<Service> Services => Set<Service>();
        public DbSet<BranchService> BranchServices => Set<BranchService>();
        public DbSet<StaffService> StaffServices => Set<StaffService>();

        // Scheduling
        public DbSet<BranchWorkingHour> BranchWorkingHours => Set<BranchWorkingHour>();
        public DbSet<BranchWorkingHourBreak> BranchWorkingHourBreaks => Set<BranchWorkingHourBreak>();
        public DbSet<BranchScheduleException> BranchScheduleExceptions => Set<BranchScheduleException>();
        public DbSet<StaffWorkingHour> StaffWorkingHours => Set<StaffWorkingHour>();
        public DbSet<StaffWorkingHourBreak> StaffWorkingHourBreaks => Set<StaffWorkingHourBreak>();
        public DbSet<StaffScheduleException> StaffScheduleExceptions => Set<StaffScheduleException>();

        // Appointments
        public DbSet<Appointment> Appointments => Set<Appointment>();
        public DbSet<AppointmentStatusHistory> AppointmentStatusHistories => Set<AppointmentStatusHistory>();

        // Social / Notifications
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<Favorite> Favorites => Set<Favorite>();
        public DbSet<Notification> Notifications => Set<Notification>();

        //CustomersPenalty
        public DbSet<CustomerPenalty> CustomerPenalties => Set<CustomerPenalty>();

        //Subscription
        public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
        public DbSet<BusinessSubscription> BusinessSubscriptions => Set<BusinessSubscription>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // PostgreSQL PostGIS ve btree_gist (Exclusion constraint için) eklentileri
            modelBuilder.HasPostgresExtension("postgis");
            modelBuilder.HasPostgresExtension("btree_gist");

            // Configurations klasöründeki tüm IEntityTypeConfiguration sınıflarını otomatik uygula
            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

            // Global Query Filters (Multi-Tenancy & Soft-Delete)
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                var clrType = entityType.ClrType;

                var isTenant = typeof(ITenantEntity).IsAssignableFrom(clrType);
                var isSoftDelete = typeof(ISoftDeletable).IsAssignableFrom(clrType);

                if (isTenant || isSoftDelete)
                {
                    var parameter = Expression.Parameter(clrType, "e");
                    Expression? filterBody = null;

                    if (isSoftDelete)
                    {
                        var isDeletedProp = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
                        filterBody = Expression.Equal(isDeletedProp, Expression.Constant(false));
                    }

                    if (isTenant)
                    {
                        var businessIdProp = Expression.Property(parameter, nameof(ITenantEntity.BusinessId));

                        var dbContextExpr = Expression.Constant(this);
                        var hasTenantServiceExpr = Expression.Property(dbContextExpr, nameof(HasTenantService));
                        var isSuperAdminExpr = Expression.Property(dbContextExpr, nameof(IsSuperAdmin));
                        var currentTenantIdExpr = Expression.Property(dbContextExpr, nameof(CurrentTenantId));

                        var tenantNullCheck = Expression.IsFalse(hasTenantServiceExpr);
                        var superAdminCheck = Expression.IsTrue(isSuperAdminExpr);
                        var tenantIdEquals = Expression.Equal(
                            businessIdProp,
                            Expression.Coalesce(currentTenantIdExpr, Expression.Constant(Guid.Empty))
                        );

                        var tenantFilter = Expression.OrElse(tenantNullCheck, Expression.OrElse(superAdminCheck, tenantIdEquals));

                        filterBody = filterBody == null
                            ? tenantFilter
                            : Expression.AndAlso(filterBody, tenantFilter);
                    }

                    if (filterBody != null)
                    {
                        var lambda = Expression.Lambda(filterBody, parameter);
                        modelBuilder.Entity(clrType).HasQueryFilter(lambda);
                    }
                }
            }
            var starterPlanId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var proPlanId = Guid.Parse("22222222-2222-2222-2222-222222222222");
            var staticSeedDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

            modelBuilder.Entity<SubscriptionPlan>().HasData(
                new SubscriptionPlan
                {
                    Id = starterPlanId,
                    Name = "Starter",
                    Description = "Tek şubeli butik kuaförler için ideal başlangıç paketi",
                    MonthlyPrice = 499.00m,
                    AnnualPrice = 4990.00m,
                    MaxBranchCount = 1,
                    MaxStaffPerBranch = 3,
                    MaxMonthlyAppointments = 300,
                    HasSmsNotification = false,
                    HasAdvancedReporting = false,
                    IsActive = true,
                    CreatedAt = staticSeedDate
                },
                new SubscriptionPlan
                {
                    Id = proPlanId,
                    Name = "Pro",
                    Description = "Büyüyen ve birden fazla şubesi olan salonlar için profesyonel paket",
                    MonthlyPrice = 999.00m,
                    AnnualPrice = 9990.00m,
                    MaxBranchCount = 3,
                    MaxStaffPerBranch = 10,
                    MaxMonthlyAppointments = 2000,
                    HasSmsNotification = true,
                    HasAdvancedReporting = true,
                    IsActive = true,
                    CreatedAt = staticSeedDate
                }
            );

        }



        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            foreach (var entry in ChangeTracker.Entries())
            {
                // Soft delete yönetimi
                if (entry.Entity is ISoftDeletable softDeletable && entry.State == EntityState.Deleted)
                {
                    entry.State = EntityState.Modified;
                    softDeletable.IsDeleted = true;
                    softDeletable.DeletedAt = DateTimeOffset.UtcNow;
                }

                // Otomatik Audit (BaseEntity'deki alanlara göre)
                if (entry.Entity is BaseEntity baseEntity)
                {
                    if (entry.State == EntityState.Added)
                    {
                        baseEntity.CreatedAt = DateTime.UtcNow;
                    }
                    else if (entry.State == EntityState.Modified)
                    {
                        baseEntity.UpdatedAt = DateTime.UtcNow;
                    }
                }

                // Otomatik TenantId Enjeksiyonu
                if (entry.Entity is ITenantEntity tenantEntity && entry.State == EntityState.Added)
                {
                    if (tenantEntity.BusinessId == Guid.Empty && _tenantService?.BusinessId.HasValue == true)
                    {
                        tenantEntity.BusinessId = _tenantService.BusinessId.Value;
                    }
                }
            }

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}