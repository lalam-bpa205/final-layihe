using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Ai;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize(Policy = "Module:Ai")]
public class AiController(IAiAssistantService aiAssistantService) : ControllerBase
{
    [HttpPost("ask")]
    public async Task<ActionResult<AiAnswerDto>> Ask(AskAiRequest request, CancellationToken ct) =>
        Ok(await aiAssistantService.AskAsync(request, ct));
}
