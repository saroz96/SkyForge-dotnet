//using Microsoft.AspNetCore.Mvc;
//using SkyForge.Models.FiscalYearModel;
//using SkyForge.Models.Shared;
//using SkyForge.Services;
//using SkyForge.Services;
//using System.Threading.Tasks;

//namespace SkyForge.Controllers
//{
//    [ApiController]
//    [Route("api/[controller]")]
//    public class FiscalYearsController : ControllerBase
//    {
//        private readonly IFiscalYearService _fiscalYearService;

//        public FiscalYearsController(IFiscalYearService fiscalYearService)
//        {
//            _fiscalYearService = fiscalYearService;
//        }

//        [HttpPost]
//        public async Task<IActionResult> CreateFiscalYear([FromBody] CreateFiscalYearRequest request)
//        {
//            try
//            {
//                var fiscalYear = new FiscalYear
//                {
//                    Name = request.Name,
//                    StartDate = request.StartDate,
//                    EndDate = request.EndDate,
//                    DateFormat = request.DateFormat,
//                    CompanyId = request.CompanyId,
//                    BillPrefixes = request.BillPrefixes
//                };

//                var createdFiscalYear = await _fiscalYearService.CreateFiscalYearAsync(fiscalYear);
//                return Ok(createdFiscalYear);
//            }
//            catch (Exception ex)
//            {
//                return BadRequest(new { error = ex.Message });
//            }
//        }

//        [HttpGet("company/{companyId}/active")]
//        public async Task<IActionResult> GetActiveFiscalYear(int companyId)
//        {
//            var fiscalYear = await _fiscalYearService.GetActiveFiscalYearAsync(companyId);
//            if (fiscalYear == null)
//                return NotFound(new { message = "No active fiscal year found" });

//            return Ok(fiscalYear);
//        }

//        [HttpGet("company/{companyId}")]
//        public async Task<IActionResult> GetCompanyFiscalYears(int companyId)
//        {
//            var fiscalYears = await _fiscalYearService.GetCompanyFiscalYearsAsync(companyId);
//            return Ok(fiscalYears);
//        }

//        [HttpPost("{id}/activate")]
//        public async Task<IActionResult> ActivateFiscalYear(int id, [FromQuery] int companyId)
//        {
//            try
//            {
//                var result = await _fiscalYearService.ActivateFiscalYearAsync(id, companyId);
//                if (!result)
//                    return BadRequest("Failed to activate fiscal year");

//                return Ok(new { message = "Fiscal year activated successfully" });
//            }
//            catch (Exception ex)
//            {
//                return BadRequest(new { error = ex.Message });
//            }
//        }
//    }

//    public class CreateFiscalYearRequest
//    {
//        public string Name { get; set; }
//        public DateTime StartDate { get; set; }
//        public DateTime EndDate { get; set; }
//        public DateFormatEnum? DateFormat { get; set; } = DateFormatEnum.English;
//        public int CompanyId { get; set; }
//        public BillPrefixes BillPrefixes { get; set; }
//    }
//}

using Microsoft.AspNetCore.Mvc;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using SkyForge.Services;
using System;
using System.Threading.Tasks;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FiscalYearsController : ControllerBase
    {
        private readonly IFiscalYearService _fiscalYearService;

        public FiscalYearsController(IFiscalYearService fiscalYearService)
        {
            _fiscalYearService = fiscalYearService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateFiscalYear([FromBody] CreateFiscalYearRequest request)
        {
            try
            {
                // Generate new Guid for the fiscal year
                var fiscalYear = new FiscalYear
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    StartDateNepali = request.StartDateNepali,
                    EndDateNepali = request.EndDateNepali,
                    DateFormat = request.DateFormat,
                    CompanyId = request.CompanyId,
                    BillPrefixes = request.BillPrefixes ?? new BillPrefixes(),
                    CreatedAt = DateTime.UtcNow
                };

                var createdFiscalYear = await _fiscalYearService.CreateFiscalYearAsync(fiscalYear);
                return Ok(createdFiscalYear);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("company/{companyId}/active")]
        public async Task<IActionResult> GetActiveFiscalYear(Guid companyId)
        {
            var fiscalYear = await _fiscalYearService.GetActiveFiscalYearAsync(companyId);
            if (fiscalYear == null)
                return NotFound(new { message = "No active fiscal year found" });

            return Ok(fiscalYear);
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetCompanyFiscalYears(Guid companyId)
        {
            var fiscalYears = await _fiscalYearService.GetCompanyFiscalYearsAsync(companyId);
            return Ok(fiscalYears);
        }

        [HttpPost("{id}/activate")]
        public async Task<IActionResult> ActivateFiscalYear(Guid id, [FromQuery] Guid companyId)
        {
            try
            {
                var result = await _fiscalYearService.ActivateFiscalYearAsync(id, companyId);
                if (!result)
                    return BadRequest("Failed to activate fiscal year");

                return Ok(new { message = "Fiscal year activated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class CreateFiscalYearRequest
    {
        public string Name { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? StartDateNepali { get; set; }
        public string? EndDateNepali { get; set; }
        public DateFormatEnum? DateFormat { get; set; } = DateFormatEnum.English;
        public Guid CompanyId { get; set; }
        public BillPrefixes BillPrefixes { get; set; }
    }
}