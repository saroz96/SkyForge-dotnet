using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.AccountDto
{
    public class CreateAccountDTO
    {
        [Required(ErrorMessage = "Account name is required")]
        [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        public string Address { get; set; } = string.Empty;

        public int? Ward { get; set; }

        [StringLength(20, ErrorMessage = "Phone cannot exceed 20 characters")]
        [RegularExpression(@"^$|^[0-9\+\-\s\(\)]+$", ErrorMessage = "Invalid phone number format")]
        public string? Phone { get; set; }

        // Make it nullable and remove the MinimumLength requirement
        [StringLength(9, ErrorMessage = "PAN cannot exceed 9 digits")]
        [RegularExpression(@"^$|^\d{9}$", ErrorMessage = "PAN must be either empty or exactly 9 digits")]
        public string? Pan { get; set; } // Make it nullable

        [StringLength(100, ErrorMessage = "Contact person name cannot exceed 100 characters")]
        public string ContactPerson { get; set; } = string.Empty;

        //[EmailAddress(ErrorMessage = "Invalid email format")]
        //[StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        //public string Email { get; set; } = string.Empty;
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        [RegularExpression(@"^$|^[^@\s]+@[^@\s]+\.[^@\s]+$", ErrorMessage = "Invalid email format")]
        public string? Email { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Credit limit cannot be negative")]
        public decimal? CreditLimit { get; set; }

        // Changed from int to Guid to match Account model
        [Required(ErrorMessage = "Account group is required")]
        public Guid AccountGroups { get; set; }

        // Opening Balance as a nested object
        public OpeningBalanceDTO OpeningBalance { get; set; } = new OpeningBalanceDTO();

    }

    public class UpdateAccountDTO
    {
        [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        public string Address { get; set; } = string.Empty;

        public int? Ward { get; set; }
        [StringLength(20, ErrorMessage = "Phone cannot exceed 20 characters")]
        [RegularExpression(@"^$|^[0-9\+\-\s\(\)]+$", ErrorMessage = "Invalid phone number format")]
        public string? Phone { get; set; }

        [StringLength(9, ErrorMessage = "PAN cannot exceed 9 digits")]
        [RegularExpression(@"^$|^\d{9}$", ErrorMessage = "PAN must be either empty or exactly 9 digits")]
        public string? Pan { get; set; } // Make it nullable

        [StringLength(100, ErrorMessage = "Contact person name cannot exceed 100 characters")]
        public string ContactPerson { get; set; } = string.Empty;

        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        [RegularExpression(@"^$|^[^@\s]+@[^@\s]+\.[^@\s]+$", ErrorMessage = "Invalid email format")]
        public string? Email { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Credit limit cannot be negative")]
        public decimal? CreditLimit { get; set; }

        public Guid? AccountGroups { get; set; }  // Changed from int? to Guid?
        public bool IsActive { get; set; } = true;

        public OpeningBalanceDTO OpeningBalance { get; set; } = new OpeningBalanceDTO();
    }

    public class AccountInfoDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? UniqueNumber { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? Pan { get; set; }
    public string ContactPerson { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public decimal? CreditLimit { get; set; }
}
public class AccountSearchDTO
    {
        public string? Search { get; set; }
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 25;
        public Guid? FiscalYear { get; set; }
    }

public class AccountSearchResultDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? UniqueNumber { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? Pan { get; set; }
    public string ContactPerson { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public decimal? CreditLimit { get; set; }
    public decimal Balance { get; set; }
    public string BalanceType { get; set; } = string.Empty;
    public decimal RawBalance { get; set; }
    public DateTime CreatedAt { get; set; }
}

   public class AccountSearchResponseDTO
{
    public bool Success { get; set; }
    public List<AccountSearchResultDTO> Accounts { get; set; } = new List<AccountSearchResultDTO>();
    public PaginationDTO Pagination { get; set; } = new PaginationDTO();
}

    public class PaginationDTO
    {
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
        public int TotalAccounts { get; set; }
        public int AccountsPerPage { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }
}