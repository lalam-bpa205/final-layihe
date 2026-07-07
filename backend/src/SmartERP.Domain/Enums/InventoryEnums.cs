namespace SmartERP.Domain.Enums;

public enum StockMovementType
{
    /// <summary>Anbara giriş (alış, qaytarma və s.)</summary>
    In = 1,

    /// <summary>Anbardan çıxış (satış, silinmə və s.)</summary>
    Out = 2,

    /// <summary>Transfer nəticəsində qəbul edən anbara giriş</summary>
    TransferIn = 3,

    /// <summary>Transfer nəticəsində göndərən anbardan çıxış</summary>
    TransferOut = 4
}
