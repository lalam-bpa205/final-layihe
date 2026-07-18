using SmartERP.Application.Features.Finance.Dtos;

namespace SmartERP.Application.Features.Finance;

/// <summary>Fakturadan çap-hazır PDF sənədi yaradır.</summary>
public interface IInvoicePdfService
{
    byte[] Generate(InvoiceDto invoice);
}
