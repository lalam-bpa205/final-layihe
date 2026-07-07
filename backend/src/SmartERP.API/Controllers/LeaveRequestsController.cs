using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/leave-requests")]
[Authorize(Policy = "Module:Hr")]
public class LeaveRequestsController(ILeaveRequestService leaveRequestService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<LeaveRequestDto>>> GetPaged([FromQuery] LeaveFilter filter, CancellationToken ct) =>
        Ok(await leaveRequestService.GetPagedAsync(filter, ct));

    [HttpPost]
    public async Task<ActionResult<LeaveRequestDto>> Create(CreateLeaveRequest request, CancellationToken ct) =>
        Ok(await leaveRequestService.CreateAsync(request, ct));

    [HttpPost("{id:int}/decide")]
    public async Task<ActionResult<LeaveRequestDto>> Decide(int id, DecideLeaveRequest request, CancellationToken ct) =>
        Ok(await leaveRequestService.DecideAsync(id, request, ct));
}
