// Add to SkyForge/Dto/AccountDto/AccountBalanceDto.cs
using System;

namespace SkyForge.Dto.AccountDto
{
    public class AccountBalanceResponseDTO
    {
        public bool Success { get; set; }
        public AccountBalanceDataDTO Data { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public class AccountBalanceDataDTO
    {
        public decimal Balance { get; set; }
        public string BalanceType { get; set; } = string.Empty; // "Dr" or "Cr"
        public decimal RawBalance { get; set; }
    }
}