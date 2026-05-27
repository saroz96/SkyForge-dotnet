namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class ReorderItemResponseDTO
    {
        public string Name { get; set; } = string.Empty;
        public decimal CurrentStock { get; set; }
        public decimal ReorderLevel { get; set; }
        public decimal MaxStock { get; set; }
        public decimal NeededStock { get; set; }
        public decimal OverStock { get; set; }
        public string Unit { get; set; } = "N/A";
        public Guid FiscalYearId { get; set; }
    }

    public class ReorderItemsResponseDTO
    {
        public bool Success { get; set; }
        public ReorderDataDTO Data { get; set; } = new();
    }

    public class ReorderDataDTO
    {
        public object Company { get; set; } = new();
        public List<ReorderItemResponseDTO> Items { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public object CurrentFiscalYear { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }
}