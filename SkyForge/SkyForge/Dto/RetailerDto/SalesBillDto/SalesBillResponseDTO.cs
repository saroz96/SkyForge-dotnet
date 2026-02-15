
using SkyForge.Dto.RetailerDto.SalesBillDto;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SkyForge.Models.Dto.RetailerDto.SalesBillDto
{
    public class SalesBillResponseDTO
    {
        public Guid Id { get; set; }

        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string PurchaseSalesType { get; set; } = string.Empty;
        public int OriginalCopies { get; set; }

        public Guid UserId { get; set; }
        public string? UserName { get; set; }

        public string BillNumber { get; set; } = string.Empty;

        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }

        public string? CashAccount { get; set; }
        public string? CashAccountAddress { get; set; }
        public string? CashAccountPan { get; set; }
        public string? CashAccountEmail { get; set; }
        public string? CashAccountPhone { get; set; }

        public Guid? SettingsId { get; set; }

        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }

        public List<SalesBillItemDTO> Items { get; set; } = new();

        public decimal SubTotal { get; set; }
        public decimal NonVatSales { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal RoundOffAmount { get; set; }
        public string? PaymentMode { get; set; }

        [JsonConverter(typeof(JsonDateTimeConverter))]
        public DateTime Date { get; set; }

        [JsonConverter(typeof(JsonDateTimeConverter))]
        public DateTime TransactionDate { get; set; }

        [JsonConverter(typeof(JsonDateTimeConverter))]
        public DateTime CreatedAt { get; set; }

        [JsonConverter(typeof(JsonDateTimeConverter))]
        public DateTime UpdatedAt { get; set; }
    }

    // Optional: Custom JSON DateTime Converter
    public class JsonDateTimeConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return DateTime.Parse(reader.GetString()!);
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString("yyyy-MM-ddTHH:mm:ssZ"));
        }
    }
}
