// Dto/RetailerDto/ItemDto/ItemImportDto.cs
using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class ItemImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Hscode { get; set; }
        public string? CategoryName { get; set; }
        public string? ItemsCompanyName { get; set; }
        public decimal? Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal? MainUnitPuPrice { get; set; }
        public string? MainUnitName { get; set; }
        public decimal? WsUnit { get; set; }
        public string? UnitName { get; set; }
        public string? VatStatus { get; set; }
        public decimal? OpeningStock { get; set; }
        public decimal? MinStock { get; set; }
        public decimal? MaxStock { get; set; }
        public decimal? ReorderLevel { get; set; }
        public string? Status { get; set; }
    }

    public class ItemImportResponseDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? Warning { get; set; }
        public string? Code { get; set; }
        public ItemImportResultData? Data { get; set; }
    }

    public class ItemImportResultData
    {
        public List<ItemImportResult> Results { get; set; } = new();
        public int TotalProcessed { get; set; }
        public int SuccessCount { get; set; }
        public int FailedCount { get; set; }
        public int SkippedCount { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class ItemImportResult
    {
        public int RowNumber { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "Success", "Failed", "Skipped"
        public string? ErrorMessage { get; set; }
        public string? ItemId { get; set; }
    }
}