namespace SmartERP.Domain.Enums;

public enum TransactionType
{
    Income = 1,
    Expense = 2
}

public enum PaymentMethod
{
    Cash = 1,
    Card = 2,
    BankTransfer = 3
}

public enum InvoiceStatus
{
    Unpaid = 1,
    PartiallyPaid = 2,
    Paid = 3,
    Cancelled = 4
}
