# 1. Base Runtime Image (.NET 10 ASP.NET Core)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080

# 2. Build Image (.NET 10 SDK)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Sadece csproj dosyalarını kopyalayarak restore cache'ini optimize ediyoruz
COPY ["src/BarberBooking.API/BarberBooking.API.csproj", "src/BarberBooking.API/"]
COPY ["src/BarberBooking.Business/BarberBooking.Business.csproj", "src/BarberBooking.Business/"]
COPY ["src/BarberBooking.DataAccess/BarberBooking.DataAccess.csproj", "src/BarberBooking.DataAccess/"]
COPY ["src/BarberBooking.Entities/BarberBooking.Entities.csproj", "src/BarberBooking.Entities/"]
COPY ["src/BarberBooking.Shared/BarberBooking.Shared.csproj", "src/BarberBooking.Shared/"]

RUN dotnet restore "src/BarberBooking.API/BarberBooking.API.csproj"

# Tüm kaynak kodları kopyala ve Release derle
COPY . .
WORKDIR "/src/src/BarberBooking.API"
RUN dotnet build "BarberBooking.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

# 3. Publish Image
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "BarberBooking.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# 4. Final Image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BarberBooking.API.dll"]