using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Finance;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Enums;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/finance")]
[Authorize(Policy = "Module:Finance")]
public class FinanceController(
    ITransactionCategoryService categoryService,
    IFinanceTransactionService transactionService,
    IBudgetService budgetService,
    IFinanceOverviewService overviewService) : ControllerBase
{
    // ---------- İcmal / Analitika ----------
    [HttpGet("overview")]
    public async Task<ActionResult<FinanceOverviewDto>> GetOverview(CancellationToken ct) =>
        Ok(await overviewService.GetOverviewAsync(ct));

    // ---------- Kateqoriyalar ----------
    [HttpGet("categories")]
    public async Task<ActionResult<List<TransactionCategoryDto>>> GetCategories(
        [FromQuery] TransactionType? type, CancellationToken ct) =>
        Ok(await categoryService.GetAllAsync(type, ct));

    [HttpPost("categories")]
    public async Task<ActionResult<TransactionCategoryDto>> CreateCategory(
        SaveTransactionCategoryRequest request, CancellationToken ct) =>
        Ok(await categoryService.CreateAsync(request, ct));

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken ct)
    {
        await categoryService.DeleteAsync(id, ct);
        return NoContent();
    }

    // ---------- Əməliyyatlar ----------
    [HttpGet("transactions")]
    public async Task<ActionResult<PagedResult<FinanceTransactionDto>>> GetTransactions(
        [FromQuery] FinanceTransactionFilter filter, CancellationToken ct) =>
        Ok(await transactionService.GetPagedAsync(filter, ct));

    [HttpPost("transactions")]
    public async Task<ActionResult<FinanceTransactionDto>> CreateTransaction(
        SaveFinanceTransactionRequest request, CancellationToken ct) =>
        Ok(await transactionService.CreateAsync(request, ct));

    [HttpDelete("transactions/{id:int}")]
    public async Task<IActionResult> DeleteTransaction(int id, CancellationToken ct)
    {
        await transactionService.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<ActionResult<FinanceSummaryDto>> GetSummary(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct) =>
        Ok(await transactionService.GetSummaryAsync(from, to, ct));

    // ---------- Büdcə ----------
    [HttpGet("budgets")]
    public async Task<ActionResult<List<BudgetDto>>> GetBudgets(
        [FromQuery] int year, [FromQuery] int month, CancellationToken ct) =>
        Ok(await budgetService.GetForMonthAsync(year, month, ct));

    [HttpPost("budgets")]
    public async Task<ActionResult<BudgetDto>> SaveBudget(SaveBudgetRequest request, CancellationToken ct) =>
        Ok(await budgetService.SaveAsync(request, ct));

    [HttpDelete("budgets/{id:int}")]
    public async Task<IActionResult> DeleteBudget(int id, CancellationToken ct)
    {
        await budgetService.DeleteAsync(id, ct);
        return NoContent();
    }
}
