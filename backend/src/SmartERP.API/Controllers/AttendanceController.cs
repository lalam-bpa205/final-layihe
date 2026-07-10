using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize(Policy = "Module:Hr")]
public class AttendanceController(IAttendanceService attendanceService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AttendanceDto>>> GetByDate(
        [FromQuery] DateOnly? date, [FromQuery] int? departmentId, CancellationToken ct) =>
        Ok(await attendanceService.GetByDateAsync(
            date ?? DateOnly.FromDateTime(DateTime.Now), departmentId, ct));

    // Aylıq davamiyyət cədvəli
    [HttpGet("monthly")]
    public async Task<ActionResult<MonthlyAttendanceDto>> GetMonthly(
        [FromQuery] int year, [FromQuery] int month, [FromQuery] int? departmentId, CancellationToken ct) =>
        Ok(await attendanceService.GetMonthlyAsync(year, month, departmentId, ct));

    [HttpPost("check-in")]
    public async Task<ActionResult<AttendanceDto>> CheckIn(CheckInRequest request, CancellationToken ct) =>
        Ok(await attendanceService.CheckInAsync(request, ct));

    [HttpPost("check-out")]
    public async Task<ActionResult<AttendanceDto>> CheckOut(CheckOutRequest request, CancellationToken ct) =>
        Ok(await attendanceService.CheckOutAsync(request, ct));
}
