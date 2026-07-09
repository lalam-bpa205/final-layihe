namespace SmartERP.Application.Features.Ai;

public record AskAiRequest(string Question);
public record AiAnswerDto(string Answer);

public interface IAiAssistantService
{
    /// <summary>
    /// İstifadəçinin sualına ERP-nin cari məlumatları əsasında cavab verir.
    /// </summary>
    Task<AiAnswerDto> AskAsync(AskAiRequest request, CancellationToken ct = default);
}
