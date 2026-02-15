//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using SkyForge.Data;
//using SkyForge.Models.Retailer.StoreModel;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Threading.Tasks;

//namespace SkyForge.Controllers
//{
//    [ApiController]
//    [Route("api/[controller]")]
//    [Authorize]
//    public class StoreController : ControllerBase
//    {
//        private readonly ApplicationDbContext _context;
//        private readonly ILogger<StoreController> _logger;

//        public StoreController(ApplicationDbContext context, ILogger<StoreController> logger)
//        {
//            _context = context;
//            _logger = logger;
//        }

//        [HttpGet("company/{companyId}")]
//        public async Task<IActionResult> GetStoresByCompany(int companyId, [FromQuery] bool? activeOnly = true)
//        {
//            try
//            {
//                var query = _context.Stores
//                    .Where(s => s.CompanyId == companyId)
//                    .Include(s => s.Racks)
//                    .AsQueryable();

//                if (activeOnly == true)
//                {
//                    query = query.Where(s => s.IsActive);
//                }

//                var stores = await query
//                    .OrderBy(s => s.Name)
//                    .Select(s => new StoreDTO
//                    {
//                        Id = s.Id,
//                        Name = s.Name,
//                        Description = s.Description,
//                        CompanyId = s.CompanyId,
//                        IsActive = s.IsActive,
//                        CreatedAt = s.CreatedAt,
//                        UpdatedAt = s.UpdatedAt,
//                        RackCount = s.Racks.Count(r => r.IsActive)
//                    })
//                    .ToListAsync();

//                return Ok(stores);
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error fetching stores for company {CompanyId}", companyId);
//                return StatusCode(500, new { error = "Failed to fetch stores" });
//            }
//        }

//        [HttpPost]
//        public async Task<IActionResult> CreateStore([FromBody] CreateStoreDTO dto)
//        {
//            try
//            {
//                // Check if store with same name already exists for this company
//                var existingStore = await _context.Stores
//                    .FirstOrDefaultAsync(s => s.Name == dto.Name && s.CompanyId == dto.CompanyId);

//                if (existingStore != null)
//                {
//                    return Conflict(new { error = $"Store '{dto.Name}' already exists for this company" });
//                }

//                var store = new Store
//                {
//                    Name = dto.Name,
//                    Description = dto.Description,
//                    CompanyId = dto.CompanyId,
//                    IsActive = dto.IsActive,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _context.Stores.Add(store);
//                await _context.SaveChangesAsync();

//                return Ok(new StoreDTO
//                {
//                    Id = store.Id,
//                    Name = store.Name,
//                    Description = store.Description,
//                    CompanyId = store.CompanyId,
//                    IsActive = store.IsActive,
//                    CreatedAt = store.CreatedAt
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error creating store");
//                return StatusCode(500, new { error = "Failed to create store" });
//            }
//        }

//        [HttpPut("{id}")]
//        public async Task<IActionResult> UpdateStore(int id, [FromBody] UpdateStoreDTO dto)
//        {
//            try
//            {
//                var store = await _context.Stores.FindAsync(id);
//                if (store == null)
//                {
//                    return NotFound(new { error = "Store not found" });
//                }

//                // If name is being changed, check for uniqueness
//                if (!string.IsNullOrEmpty(dto.Name) && dto.Name != store.Name)
//                {
//                    var existingStore = await _context.Stores
//                        .FirstOrDefaultAsync(s => s.Name == dto.Name &&
//                                                  s.CompanyId == store.CompanyId &&
//                                                  s.Id != id);

//                    if (existingStore != null)
//                    {
//                        return Conflict(new { error = $"Store '{dto.Name}' already exists for this company" });
//                    }

//                    store.Name = dto.Name;
//                }

//                if (dto.Description != null)
//                    store.Description = dto.Description;

//                if (dto.IsActive.HasValue)
//                    store.IsActive = dto.IsActive.Value;

//                store.UpdatedAt = DateTime.UtcNow;
//                await _context.SaveChangesAsync();

//                return Ok(new StoreDTO
//                {
//                    Id = store.Id,
//                    Name = store.Name,
//                    Description = store.Description,
//                    CompanyId = store.CompanyId,
//                    IsActive = store.IsActive,
//                    CreatedAt = store.CreatedAt,
//                    UpdatedAt = store.UpdatedAt
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error updating store {StoreId}", id);
//                return StatusCode(500, new { error = "Failed to update store" });
//            }
//        }
//    }
//}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Retailer.StoreModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StoreController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StoreController> _logger;

        public StoreController(ApplicationDbContext context, ILogger<StoreController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetStoresByCompany(Guid companyId, [FromQuery] bool? activeOnly = true)
        {
            try
            {
                var query = _context.Stores
                    .Where(s => s.CompanyId == companyId)
                    .Include(s => s.Racks)
                    .Include(s => s.Company)
                    .AsQueryable();

                if (activeOnly == true)
                {
                    query = query.Where(s => s.IsActive);
                }

                var stores = await query
                    .OrderBy(s => s.Name)
                    .Select(s => new StoreDTO
                    {
                        Id = s.Id,
                        Name = s.Name,
                        Description = s.Description,
                        CompanyId = s.CompanyId,
                        CompanyName = s.Company!.Name,
                        IsActive = s.IsActive,
                        CreatedAt = s.CreatedAt,
                        UpdatedAt = s.UpdatedAt,
                        RackCount = s.Racks.Count(r => r.IsActive)
                    })
                    .ToListAsync();

                return Ok(stores);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching stores for company {CompanyId}", companyId);
                return StatusCode(500, new { error = "Failed to fetch stores" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetStoreById(Guid id)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.Company)
                    .Include(s => s.Racks.Where(r => r.IsActive))
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (store == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var storeDto = new StoreDTO
                {
                    Id = store.Id,
                    Name = store.Name,
                    Description = store.Description,
                    CompanyId = store.CompanyId,
                    CompanyName = store.Company?.Name,
                    IsActive = store.IsActive,
                    CreatedAt = store.CreatedAt,
                    UpdatedAt = store.UpdatedAt,
                    RackCount = store.Racks.Count
                };

                return Ok(storeDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching store {StoreId}", id);
                return StatusCode(500, new { error = "Failed to fetch store" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateStore([FromBody] CreateStoreDTO dto)
        {
            try
            {
                // Validate input
                if (dto == null)
                {
                    return BadRequest(new { error = "Request body is required" });
                }

                // Check if store with same name already exists for this company
                var existingStore = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Name == dto.Name && s.CompanyId == dto.CompanyId);

                if (existingStore != null)
                {
                    return Conflict(new { error = $"Store '{dto.Name}' already exists for this company" });
                }

                // Verify company exists
                var company = await _context.Companies.FindAsync(dto.CompanyId);
                if (company == null)
                {
                    return BadRequest(new { error = "Company not found" });
                }

                var store = new Store
                {
                    Id = Guid.NewGuid(),
                    Name = dto.Name,
                    Description = dto.Description,
                    CompanyId = dto.CompanyId,
                    IsActive = dto.IsActive,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Stores.Add(store);
                await _context.SaveChangesAsync();

                // Get the created store with company details
                var createdStore = await _context.Stores
                    .Include(s => s.Company)
                    .FirstOrDefaultAsync(s => s.Id == store.Id);

                return Ok(new StoreDTO
                {
                    Id = store.Id,
                    Name = store.Name,
                    Description = store.Description,
                    CompanyId = store.CompanyId,
                    CompanyName = createdStore?.Company?.Name,
                    IsActive = store.IsActive,
                    CreatedAt = store.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating store");
                return StatusCode(500, new { error = "Failed to create store" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStore(Guid id, [FromBody] UpdateStoreDTO dto)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.Company)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (store == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                // If name is being changed, check for uniqueness
                if (!string.IsNullOrEmpty(dto.Name) && dto.Name != store.Name)
                {
                    var existingStore = await _context.Stores
                        .FirstOrDefaultAsync(s => s.Name == dto.Name &&
                                                  s.CompanyId == store.CompanyId &&
                                                  s.Id != id);

                    if (existingStore != null)
                    {
                        return Conflict(new { error = $"Store '{dto.Name}' already exists for this company" });
                    }

                    store.Name = dto.Name;
                }

                if (dto.Description != null)
                    store.Description = dto.Description;

                if (dto.IsActive.HasValue)
                    store.IsActive = dto.IsActive.Value;

                store.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new StoreDTO
                {
                    Id = store.Id,
                    Name = store.Name,
                    Description = store.Description,
                    CompanyId = store.CompanyId,
                    CompanyName = store.Company?.Name,
                    IsActive = store.IsActive,
                    CreatedAt = store.CreatedAt,
                    UpdatedAt = store.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating store {StoreId}", id);
                return StatusCode(500, new { error = "Failed to update store" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStore(Guid id)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.Racks)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (store == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                // Check if store has any racks
                if (store.Racks.Any())
                {
                    return BadRequest(new { error = "Cannot delete store that has racks. Please delete the racks first." });
                }

                _context.Stores.Remove(store);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Store deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting store {StoreId}", id);
                return StatusCode(500, new { error = "Failed to delete store" });
            }
        }
    }
}
