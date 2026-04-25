namespace SkyForge.Dto.RetailerDto
{
    public class SettingsResponseDTO
    {
        public bool Success { get; set; }
        public SettingsDataDTO Data { get; set; }
    }

    public class SettingsDataDTO
    {
        public CompanyInfoDTO Company { get; set; }
        public FiscalYearDTO CurrentFiscalYear { get; set; }
        public UserInfoDTO Settings { get; set; }
        public string CurrentCompanyName { get; set; }
        public UserInfoDTO User { get; set; }
        public string Theme { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UpdateRoundOffSalesRequest
    {
        public object RoundOffSales { get; set; }
    }

    public class UpdateRoundOffSalesReturnRequest
    {
        public object RoundOffSalesReturn { get; set; }
    }
    public class SalesReturnSettingsResponseDTO
    {
        public bool Success { get; set; }
        public SalesReturnSettingsDataDTO Data { get; set; }
    }

    public class SalesReturnSettingsDataDTO
    {
        public object SettingsForSalesReturn { get; set; }
        public string CurrentCompanyName { get; set; }
        public UserInfoDTO User { get; set; }
        public UserPreferencesDTO Preferences { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UpdateRoundOffPurchaseRequest
    {
        public object RoundOffPurchase { get; set; }
    }

    public class PurchaseSettingsResponseDTO
    {
        public bool Success { get; set; }
        public PurchaseSettingsDataDTO Data { get; set; }
    }

    public class PurchaseSettingsDataDTO
    {
        public object SettingsForPurchase { get; set; }
        public string CurrentCompanyName { get; set; }
        public UserInfoDTO User { get; set; }
        public string Theme { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UpdateRoundOffPurchaseReturnRequest
    {
        public object RoundOffPurchaseReturn { get; set; }
    }
    public class PurchaseReturnSettingsResponseDTO
    {
        public bool Success { get; set; }
        public PurchaseReturnSettingsDataDTO Data { get; set; }
    }
    public class PurchaseReturnSettingsDataDTO
    {
        public object SettingsForPurchaseReturn { get; set; }
        public string CurrentCompanyName { get; set; }
        public UserInfoDTO User { get; set; }
        public UserPreferencesDTO Preferences { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UpdatePurchaseReturnResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public UpdatePurchaseReturnDataDTO Data { get; set; }
    }

    public class UpdatePurchaseReturnDataDTO
    {
        public bool RoundOffPurchaseReturn { get; set; }
        public object UpdatedSettings { get; set; }
    }

    public class DisplaySalesTransactionsResponseDTO
    {
        public bool Success { get; set; }
        public DisplaySalesTransactionsDataDTO Data { get; set; }
    }

    public class DisplaySalesTransactionsDataDTO
    {
        public bool DisplayTransactions { get; set; }
        public string CurrentCompanyName { get; set; }
        public Guid Company { get; set; }
        public UserInfoDTO User { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UpdateDisplayTransactionsRequest
    {
        public object DisplayTransactions { get; set; }
    }
    public class UpdateDisplayTransactionsResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public UpdateDisplayTransactionsDataDTO Data { get; set; }
    }

    public class UpdateDisplayTransactionsDataDTO
    {
        public bool DisplayTransactions { get; set; }
        public object UpdatedSettings { get; set; }
    }

    public class DisplaySalesReturnTransactionsResponseDTO
    {
        public bool Success { get; set; }
        public DisplaySalesReturnTransactionsDataDTO Data { get; set; }
    }

    public class DisplaySalesReturnTransactionsDataDTO
    {
        public bool DisplayTransactionsForSalesReturn { get; set; }
        public string CurrentCompanyName { get; set; }
        public Guid Company { get; set; }
        public UserInfoDTO User { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    // Add request DTO for updating display transactions for sales return
    public class UpdateDisplayTransactionsForSalesReturnRequest
    {
        public object DisplayTransactionsForSalesReturn { get; set; }
    }

    // Add response DTO for update
    public class UpdateDisplayTransactionsForSalesReturnResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public UpdateDisplayTransactionsForSalesReturnDataDTO Data { get; set; }
    }

    public class UpdateDisplayTransactionsForSalesReturnDataDTO
    {
        public bool DisplayTransactionsForSalesReturn { get; set; }
        public Guid SettingsId { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class DisplayPurchaseTransactionsResponseDTO
    {
        public bool Success { get; set; }
        public DisplayPurchaseTransactionsDataDTO Data { get; set; }
    }

    public class DisplayPurchaseTransactionsDataDTO
    {
        public bool DisplayTransactionsForPurchase { get; set; }
        public string CurrentCompanyName { get; set; }
        public Guid Company { get; set; }
        public FiscalYearDTO FiscalYear { get; set; }
        public UserInfoDTO User { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    // Add request DTO for updating display transactions for purchase
    public class UpdateDisplayTransactionsForPurchaseRequest
    {
        public object DisplayTransactionsForPurchase { get; set; }
    }

    // Add response DTO for update
    public class UpdateDisplayTransactionsForPurchaseResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public UpdateDisplayTransactionsForPurchaseDataDTO Data { get; set; }
    }

    public class UpdateDisplayTransactionsForPurchaseDataDTO
    {
        public bool DisplayTransactionsForPurchase { get; set; }
        public Guid SettingsId { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public FiscalYearDTO FiscalYear { get; set; }
    }


    public class DisplayPurchaseReturnTransactionsResponseDTO
    {
        public bool Success { get; set; }
        public DisplayPurchaseReturnTransactionsDataDTO Data { get; set; }
    }

    public class DisplayPurchaseReturnTransactionsDataDTO
    {
        public bool DisplayTransactionsForPurchaseReturn { get; set; }
        public string CurrentCompanyName { get; set; }
        public Guid Company { get; set; }
        public FiscalYearDTO FiscalYear { get; set; }
        public UserInfoDTO User { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    // Add request DTO for updating display transactions for purchase return
    public class UpdateDisplayTransactionsForPurchaseReturnRequest
    {
        public object DisplayTransactionsForPurchaseReturn { get; set; }
    }

    // Add response DTO for update
    public class UpdateDisplayTransactionsForPurchaseReturnResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public UpdateDisplayTransactionsForPurchaseReturnDataDTO Data { get; set; }
    }

    public class UpdateDisplayTransactionsForPurchaseReturnDataDTO
    {
        public bool DisplayTransactionsForPurchaseReturn { get; set; }
        public Guid SettingsId { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public FiscalYearDTO FiscalYear { get; set; }
    }
    public class UpdateDatePreferenceRequest
    {
        public bool UseVoucherLastDate { get; set; }
    }

    public class DatePreferenceResponseDTO
    {
        public bool UseVoucherLastDate { get; set; }
        public Guid? SettingsId { get; set; }
        public DateTime? LastUpdated { get; set; }
    }

    public class UpdateDatePreferenceRequestDTO
    {
        public bool UseVoucherLastDate { get; set; }
    }

    public class DatePreferenceApiResponseDTO
    {
        public bool Success { get; set; }
        public DatePreferenceResponseDTO Data { get; set; }
        public string Message { get; set; }
    }

}