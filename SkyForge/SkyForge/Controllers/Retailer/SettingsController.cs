//using Microsoft.AspNetCore.Mvc;
//using SkyForge.Models.Retailer;
//using SkyForge.Services.Retailer.SettingsServices;
//using System.Threading.Tasks;
//using SkyForge.Models;
//using SkyForge.Services;
//using SkyForge.Models.Retailer.SettingsModel;

//namespace SkyForge.Controllers.Retailer
//{
//    [ApiController]
//    [Route("api/[controller]")]
//    public class SettingsController : ControllerBase
//    {
//        private readonly ISettingsService _settingsService;

//        public SettingsController(ISettingsService settingsService)
//        {
//            _settingsService = settingsService;
//        }

//        [HttpGet("company/{companyId}")]
//        public async Task<IActionResult> GetCompanySettings(int companyId)
//        {
//            var settings = await _settingsService.GetCompanySettingsAsync(companyId);
//            if (settings == null)
//                return NotFound(new { message = "Settings not found" });

//            return Ok(settings);
//        }

//        [HttpGet("company/{companyId}/user/{userId}")]
//        public async Task<IActionResult> GetUserSettings(int companyId, int userId, [FromQuery] int? fiscalYearId)
//        {
//            var settings = await _settingsService.GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);
//            if (settings == null)
//                return NotFound(new { message = "Settings not found" });

//            return Ok(settings);
//        }

//        [HttpPost]
//        public async Task<IActionResult> CreateOrUpdateSettings([FromBody] SettingsRequest request)
//        {
//            try
//            {
//                var settings = new Settings
//                {
//                    CompanyId = request.CompanyId,
//                    UserId = request.UserId,
//                    RoundOffSales = request.RoundOffSales,
//                    RoundOffPurchase = request.RoundOffPurchase,
//                    RoundOffSalesReturn = request.RoundOffSalesReturn,
//                    RoundOffPurchaseReturn = request.RoundOffPurchaseReturn,
//                    DisplayTransactions = request.DisplayTransactions,
//                    DisplayTransactionsForPurchase = request.DisplayTransactionsForPurchase,
//                    DisplayTransactionsForSalesReturn = request.DisplayTransactionsForSalesReturn,
//                    DisplayTransactionsForPurchaseReturn = request.DisplayTransactionsForPurchaseReturn,
//                    StoreManagement = request.StoreManagement,
//                    Value = request.Value,
//                    FiscalYearId = request.FiscalYearId
//                };

//                var result = await _settingsService.CreateOrUpdateSettingsAsync(settings);
//                return Ok(result);
//            }
//            catch (Exception ex)
//            {
//                return BadRequest(new { error = ex.Message });
//            }
//        }

//        [HttpGet("company/{companyId}/value/{key}")]
//        public async Task<IActionResult> GetValue(int companyId, string key)
//        {
//            try
//            {
//                var value = await _settingsService.GetValueAsync<object>(companyId, key);
//                return Ok(new { key, value });
//            }
//            catch (Exception ex)
//            {
//                return BadRequest(new { error = ex.Message });
//            }
//        }

//        [HttpPost("company/{companyId}/value/{key}")]
//        public async Task<IActionResult> SetValue(int companyId, string key, [FromBody] object value)
//        {
//            try
//            {
//                await _settingsService.SetValueAsync(companyId, key, value);
//                return Ok(new { message = "Value set successfully" });
//            }
//            catch (Exception ex)
//            {
//                return BadRequest(new { error = ex.Message });
//            }
//        }
//    }

//    public class SettingsRequest
//    {
//        public int CompanyId { get; set; }
//        public int UserId { get; set; }
//        public bool RoundOffSales { get; set; } = false;
//        public bool RoundOffPurchase { get; set; } = false;
//        public bool RoundOffSalesReturn { get; set; } = false;
//        public bool RoundOffPurchaseReturn { get; set; } = false;
//        public bool DisplayTransactions { get; set; } = false;
//        public bool DisplayTransactionsForPurchase { get; set; } = false;
//        public bool DisplayTransactionsForSalesReturn { get; set; } = false;
//        public bool DisplayTransactionsForPurchaseReturn { get; set; } = false;
//        public bool StoreManagement { get; set; } = false;
//        public string Value { get; set; }
//        public int? FiscalYearId { get; set; }
//    }
//}

using Microsoft.AspNetCore.Mvc;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Services.Retailer.SettingsServices;
using System;
using System.Threading.Tasks;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ISettingsService _settingsService;

        public SettingsController(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetCompanySettings(Guid companyId)
        {
            var settings = await _settingsService.GetCompanySettingsAsync(companyId);
            if (settings == null)
                return NotFound(new { message = "Settings not found" });

            return Ok(settings);
        }

        [HttpGet("company/{companyId}/user/{userId}")]
        public async Task<IActionResult> GetUserSettings(Guid companyId, Guid userId, [FromQuery] Guid? fiscalYearId)
        {
            var settings = await _settingsService.GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);
            if (settings == null)
                return NotFound(new { message = "Settings not found" });

            return Ok(settings);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrUpdateSettings([FromBody] SettingsRequest request)
        {
            try
            {
                var settings = new Settings
                {
                    Id = Guid.NewGuid(),
                    CompanyId = request.CompanyId,
                    UserId = request.UserId,
                    RoundOffSales = request.RoundOffSales,
                    RoundOffPurchase = request.RoundOffPurchase,
                    RoundOffSalesReturn = request.RoundOffSalesReturn,
                    RoundOffPurchaseReturn = request.RoundOffPurchaseReturn,
                    DisplayTransactions = request.DisplayTransactions,
                    DisplayTransactionsForPurchase = request.DisplayTransactionsForPurchase,
                    DisplayTransactionsForSalesReturn = request.DisplayTransactionsForSalesReturn,
                    DisplayTransactionsForPurchaseReturn = request.DisplayTransactionsForPurchaseReturn,
                    StoreManagement = request.StoreManagement,
                    Value = request.Value ?? string.Empty,
                    FiscalYearId = request.FiscalYearId,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await _settingsService.CreateOrUpdateSettingsAsync(settings);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("company/{companyId}/value/{key}")]
        public async Task<IActionResult> GetValue(Guid companyId, string key)
        {
            try
            {
                var value = await _settingsService.GetValueAsync<object>(companyId, key);
                return Ok(new { key, value });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("company/{companyId}/value/{key}")]
        public async Task<IActionResult> SetValue(Guid companyId, string key, [FromBody] object value)
        {
            try
            {
                await _settingsService.SetValueAsync(companyId, key, value);
                return Ok(new { message = "Value set successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class SettingsRequest
    {
        public Guid CompanyId { get; set; }
        public Guid UserId { get; set; }
        public bool RoundOffSales { get; set; } = false;
        public bool RoundOffPurchase { get; set; } = false;
        public bool RoundOffSalesReturn { get; set; } = false;
        public bool RoundOffPurchaseReturn { get; set; } = false;
        public bool DisplayTransactions { get; set; } = false;
        public bool DisplayTransactionsForPurchase { get; set; } = false;
        public bool DisplayTransactionsForSalesReturn { get; set; } = false;
        public bool DisplayTransactionsForPurchaseReturn { get; set; } = false;
        public bool StoreManagement { get; set; } = false;
        public string? Value { get; set; }
        public Guid? FiscalYearId { get; set; }
    }
}