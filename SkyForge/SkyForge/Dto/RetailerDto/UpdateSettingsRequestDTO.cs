namespace SkyForge.Dto.RetailerDto
{
    public class UpdateRoundOffSalesRequestDTO
    {
        public bool RoundOffSales { get; set; }
    }

    public class UpdateRoundOffSalesReturnRequestDTO
    {
        public bool RoundOffSalesReturn { get; set; }
    }

    public class UpdateRoundOffPurchaseRequestDTO
    {
        public bool RoundOffPurchase { get; set; }
    }

    public class UpdateRoundOffPurchaseReturnRequestDTO
    {
        public bool RoundOffPurchaseReturn { get; set; }
    }

    public class UpdateDisplayTransactionsRequestDTO
    {
        public bool DisplayTransactions { get; set; }
    }

    public class UpdateDisplayTransactionsForSalesReturnRequestDTO
    {
        public bool DisplayTransactionsForSalesReturn { get; set; }
    }

    public class UpdateDisplayTransactionsForPurchaseRequestDTO
    {
        public bool DisplayTransactionsForPurchase { get; set; }
    }

    public class UpdateDisplayTransactionsForPurchaseReturnRequestDTO
    {
        public bool DisplayTransactionsForPurchaseReturn { get; set; }
    }
}