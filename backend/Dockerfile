# ---------- Build mərhələsi ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Əvvəlcə yalnız proyekt faylları — asılılıqlar keş olunsun
COPY SmartERP.slnx ./
COPY src/SmartERP.Domain/*.csproj        src/SmartERP.Domain/
COPY src/SmartERP.Application/*.csproj   src/SmartERP.Application/
COPY src/SmartERP.Infrastructure/*.csproj src/SmartERP.Infrastructure/
COPY src/SmartERP.API/*.csproj           src/SmartERP.API/
RUN dotnet restore src/SmartERP.API/SmartERP.API.csproj

# Sonra bütün mənbə + publish
COPY src/ src/
RUN dotnet publish src/SmartERP.API/SmartERP.API.csproj -c Release -o /app/publish

# ---------- İşləmə mərhələsi ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Konteyner daxilində 8080-də dinləyir
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SmartERP.API.dll"]
