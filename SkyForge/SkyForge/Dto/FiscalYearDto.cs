using SkyForge.Dto.RetailerDto;
using SkyForge.Models.Shared;
using System;
using System.Collections.Generic;

namespace SkyForge.Dto
{
    public class SwitchFiscalYearRequestDto
    {
        public Guid FiscalYearId { get; set; }
    }

    public class SwitchFiscalYearResponseDto
    {
        public bool Success { get; set; }
        public SwitchFiscalYearDataDto Data { get; set; }
        public string Error { get; set; }
        public string Message { get; set; }
    }

    public class SwitchFiscalYearDataDto
    {
        public CompanyInfoDTO Company { get; set; }
        public string CurrentFiscalYear { get; set; }
        public FiscalYearDTO InitialCurrentFiscalYear { get; set; }
        public List<FiscalYearDTO> FiscalYears { get; set; }
        public string CurrentCompanyName { get; set; }
        public UserInfoForFiscalYearDto User { get; set; }
    }

    public class UserInfoForFiscalYearDto
    {
        public Guid Id { get; set; }
        public UserPreferencesDto Preferences { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UserPreferencesDto
    {
        public string Theme { get; set; } = "light";
    }



    public class ChangeFiscalYearResponseDto
    {
        public bool Success { get; set; }
        public ChangeFiscalYearDataDto Data { get; set; }
        public string Error { get; set; }
        public string Message { get; set; }
    }

    public class ChangeFiscalYearDataDto
    {
        public CompanyChangeInfoDto Company { get; set; }
        public string NextFiscalYearStartDate { get; set; }
        public string NextFiscalYearStartDateNepali { get; set; }
        public string NextFiscalYearEndDateNepali { get; set; }
        public FiscalYearChangeDto CurrentFiscalYear { get; set; }
        public string CurrentCompanyName { get; set; }
        public string NepaliDate { get; set; }
        public string CompanyDateFormat { get; set; }
        public UserChangeInfoDto User { get; set; }
        public string Theme { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class CompanyChangeInfoDto
    {
        public Guid Id { get; set; }
        public string RenewalDate { get; set; }
        public string DateFormat { get; set; }
        public FiscalYearChangeDto FiscalYear { get; set; }
    }

    public class FiscalYearChangeDto
    {
        public Guid Id { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? StartDateNepali { get; set; }  // Add this
        public string? EndDateNepali { get; set; }
        public string Name { get; set; }
        public string DateFormat { get; set; }
        public bool IsActive { get; set; }
    }

    public class UserChangeInfoDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public bool IsAdmin { get; set; }
        public string Role { get; set; }
        public UserPreferencesDto Preferences { get; set; }
    }

    public class FiscalYearCreationQueryDto
    {
        public string StartDateEnglish { get; set; }
        public string EndDateEnglish { get; set; }
        public string StartDateNepali { get; set; }
        public string EndDateNepali { get; set; }
        public string DateFormat { get; set; }
    }

    public class SseEventDto
    {
        public string Type { get; set; }
        public string Message { get; set; }
        public double? Value { get; set; }
        public object Data { get; set; }
    }
}