# Backend API Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000
EXPOSE 5001

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["backend/Backend.Api/Backend.Api.csproj", "backend/Backend.Api/"]
COPY ["backend/Backend.Models/Backend.Models.csproj", "backend/Backend.Models/"]
COPY ["backend/Backend.Services/Backend.Services.csproj", "backend/Backend.Services/"]
COPY ["backend/Backend.Infrastructure/Backend.Infrastructure.csproj", "backend/Backend.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "backend/Backend.Api/Backend.Api.csproj"

# Copy everything else and build
COPY backend/ .
WORKDIR "/src/backend/Backend.Api"
RUN dotnet build "Backend.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Backend.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create data directory for SQLite
RUN mkdir -p /data

ENTRYPOINT ["dotnet", "Backend.Api.dll"]
