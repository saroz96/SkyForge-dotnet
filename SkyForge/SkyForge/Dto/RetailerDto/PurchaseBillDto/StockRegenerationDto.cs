using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class StockRegenerationRequestDto
    {
        public Guid PurchaseBillId { get; set; }
        public bool OverwriteExisting { get; set; } = true;
        public string? Remarks { get; set; }
    }

    public class StockRegenerationResponseDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public int EntriesRegenerated { get; set; }
        public List<RegeneratedStockEntryDto>? StockEntries { get; set; }
        public List<string>? Errors { get; set; }
        public PurchaseBillInfoDto? PurchaseBillInfo { get; set; }
    }

    public class RegeneratedStockEntryDto
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }
        public decimal Quantity { get; set; }
        public decimal PuPrice { get; set; }
        public string? Status { get; set; }
    }

    public class PurchaseBillInfoDto
    {
        public Guid Id { get; set; }
        public string? BillNumber { get; set; }
        public string? PartyBillNumber { get; set; }
        public DateTime Date { get; set; }
        public string? NepaliDate { get; set; }
        public string? AccountName { get; set; }
        public int ItemCount { get; set; }
        public decimal TotalAmount { get; set; }
    }
}