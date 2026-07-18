namespace SmartERP.Application.Features.Dashboard;

/// <summary>İdarəetmə panelinin məlumatlarından çap-hazır PDF hesabat yaradır.</summary>
public interface IDashboardPdfService
{
    byte[] Generate(DashboardDto data, string generatedBy);
}
