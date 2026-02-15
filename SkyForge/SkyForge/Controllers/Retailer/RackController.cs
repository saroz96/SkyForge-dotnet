
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using SkyForge.Data;
//using SkyForge.Models.RackModel;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Threading.Tasks;

//namespace SkyForge.Controllers
//{
//    [ApiController]
//    [Route("api/[controller]")]
//    [Authorize]
//    public class RackController : ControllerBase
//    {
//        private readonly ApplicationDbContext _context;
//        private readonly ILogger<RackController> _logger;

//        public RackController(ApplicationDbContext context, ILogger<RackController> logger)
//        {
//            _context = context;
//            _logger = logger;
//        }

//        [HttpGet("store/{storeId}")]
//        public async Task<IActionResult> GetRacksByStore(int storeId, [FromQuery] bool? activeOnly = true)
//        {
//            try
//            {
//                var query = _context.Racks
//                    .Where(r => r.StoreId == storeId)
//                    .Include(r => r.Store)
//                    .AsQueryable();

//                if (activeOnly == true)
//                {
//                    query = query.Where(r => r.IsActive);
//                }

//                var racks = await query
//                    .OrderBy(r => r.Name)
//                    .Select(r => new RackDTO
//                    {
//                        Id = r.Id,
//                        Name = r.Name,
//                        Description = r.Description,
//                        StoreId = r.StoreId,
//                        StoreName = r.Store!.Name,
//                        CompanyId = r.CompanyId,
//                        IsActive = r.IsActive,
//                        CreatedAt = r.CreatedAt,
//                        UpdatedAt = r.UpdatedAt
//                    })
//                    .ToListAsync();

//                return Ok(racks);
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error fetching racks for store {StoreId}", storeId);
//                return StatusCode(500, new { error = "Failed to fetch racks" });
//            }
//        }

//        [HttpGet("company/{companyId}")]
//        public async Task<IActionResult> GetRacksByCompany(int companyId, [FromQuery] bool? activeOnly = true)
//        {
//            try
//            {
//                var query = _context.Racks
//                    .Where(r => r.CompanyId == companyId)
//                    .Include(r => r.Store)
//                    .AsQueryable();

//                if (activeOnly == true)
//                {
//                    query = query.Where(r => r.IsActive);
//                }

//                var racks = await query
//                    .OrderBy(r => r.Name)
//                    .Select(r => new RackDTO
//                    {
//                        Id = r.Id,
//                        Name = r.Name,
//                        Description = r.Description,
//                        StoreId = r.StoreId,
//                        StoreName = r.Store!.Name,
//                        CompanyId = r.CompanyId,
//                        IsActive = r.IsActive,
//                        CreatedAt = r.CreatedAt,
//                        UpdatedAt = r.UpdatedAt
//                    })
//                    .ToListAsync();

//                return Ok(racks);
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error fetching racks for company {CompanyId}", companyId);
//                return StatusCode(500, new { error = "Failed to fetch racks" });
//            }
//        }

//        [HttpPost]
//        public async Task<IActionResult> CreateRack([FromBody] CreateRackDTO dto)
//        {
//            try
//            {
//                // Check if rack with same name already exists for this company
//                var existingRack = await _context.Racks
//                    .FirstOrDefaultAsync(r => r.Name == dto.Name && r.CompanyId == dto.CompanyId);

//                if (existingRack != null)
//                {
//                    return Conflict(new { error = $"Rack '{dto.Name}' already exists for this company" });
//                }

//                // Verify store exists and belongs to same company
//                var store = await _context.Stores
//                    .FirstOrDefaultAsync(s => s.Id == dto.StoreId && s.CompanyId == dto.CompanyId);

//                if (store == null)
//                {
//                    return BadRequest(new { error = "Store not found or does not belong to the specified company" });
//                }

//                var rack = new Rack
//                {
//                    Name = dto.Name,
//                    Description = dto.Description,
//                    StoreId = dto.StoreId,
//                    CompanyId = dto.CompanyId,
//                    IsActive = dto.IsActive,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _context.Racks.Add(rack);
//                await _context.SaveChangesAsync();

//                return Ok(new RackDTO
//                {
//                    Id = rack.Id,
//                    Name = rack.Name,
//                    Description = rack.Description,
//                    StoreId = rack.StoreId,
//                    CompanyId = rack.CompanyId,
//                    IsActive = rack.IsActive,
//                    CreatedAt = rack.CreatedAt
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error creating rack");
//                return StatusCode(500, new { error = "Failed to create rack" });
//            }
//        }

//        [HttpPut("{id}")]
//        public async Task<IActionResult> UpdateRack(int id, [FromBody] UpdateRackDTO dto)
//        {
//            try
//            {
//                var rack = await _context.Racks
//                    .Include(r => r.Store)
//                    .FirstOrDefaultAsync(r => r.Id == id);

//                if (rack == null)
//                {
//                    return NotFound(new { error = "Rack not found" });
//                }

//                // If name is being changed, check for uniqueness
//                if (!string.IsNullOrEmpty(dto.Name) && dto.Name != rack.Name)
//                {
//                    var existingRack = await _context.Racks
//                        .FirstOrDefaultAsync(r => r.Name == dto.Name &&
//                                                  r.CompanyId == rack.CompanyId &&
//                                                  r.Id != id);

//                    if (existingRack != null)
//                    {
//                        return Conflict(new { error = $"Rack '{dto.Name}' already exists for this company" });
//                    }

//                    rack.Name = dto.Name;
//                }

//                if (dto.Description != null)
//                    rack.Description = dto.Description;

//                if (dto.StoreId.HasValue)
//                {
//                    // Verify new store belongs to same company
//                    var newStore = await _context.Stores
//                        .FirstOrDefaultAsync(s => s.Id == dto.StoreId.Value && s.CompanyId == rack.CompanyId);

//                    if (newStore == null)
//                    {
//                        return BadRequest(new { error = "Store not found or does not belong to the same company" });
//                    }

//                    rack.StoreId = dto.StoreId.Value;
//                }

//                if (dto.IsActive.HasValue)
//                    rack.IsActive = dto.IsActive.Value;

//                rack.UpdatedAt = DateTime.UtcNow;
//                await _context.SaveChangesAsync();

//                return Ok(new RackDTO
//                {
//                    Id = rack.Id,
//                    Name = rack.Name,
//                    Description = rack.Description,
//                    StoreId = rack.StoreId,
//                    StoreName = rack.Store!.Name,
//                    CompanyId = rack.CompanyId,
//                    IsActive = rack.IsActive,
//                    CreatedAt = rack.CreatedAt,
//                    UpdatedAt = rack.UpdatedAt
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error updating rack {RackId}", id);
//                return StatusCode(500, new { error = "Failed to update rack" });
//            }
//        }
//    }
//}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.RackModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RackController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<RackController> _logger;

        public RackController(ApplicationDbContext context, ILogger<RackController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("store/{storeId}")]
        public async Task<IActionResult> GetRacksByStore(Guid storeId, [FromQuery] bool? activeOnly = true)
        {
            try
            {
                var query = _context.Racks
                    .Where(r => r.StoreId == storeId)
                    .Include(r => r.Store)
                    .AsQueryable();

                if (activeOnly == true)
                {
                    query = query.Where(r => r.IsActive);
                }

                var racks = await query
                    .OrderBy(r => r.Name)
                    .Select(r => new RackDTO
                    {
                        Id = r.Id,
                        Name = r.Name,
                        Description = r.Description,
                        StoreId = r.StoreId,
                        StoreName = r.Store!.Name,
                        CompanyId = r.CompanyId,
                        IsActive = r.IsActive,
                        CreatedAt = r.CreatedAt,
                        UpdatedAt = r.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(racks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching racks for store {StoreId}", storeId);
                return StatusCode(500, new { error = "Failed to fetch racks" });
            }
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetRacksByCompany(Guid companyId, [FromQuery] bool? activeOnly = true)
        {
            try
            {
                var query = _context.Racks
                    .Where(r => r.CompanyId == companyId)
                    .Include(r => r.Store)
                    .AsQueryable();

                if (activeOnly == true)
                {
                    query = query.Where(r => r.IsActive);
                }

                var racks = await query
                    .OrderBy(r => r.Name)
                    .Select(r => new RackDTO
                    {
                        Id = r.Id,
                        Name = r.Name,
                        Description = r.Description,
                        StoreId = r.StoreId,
                        StoreName = r.Store!.Name,
                        CompanyId = r.CompanyId,
                        IsActive = r.IsActive,
                        CreatedAt = r.CreatedAt,
                        UpdatedAt = r.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(racks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching racks for company {CompanyId}", companyId);
                return StatusCode(500, new { error = "Failed to fetch racks" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetRackById(Guid id)
        {
            try
            {
                var rack = await _context.Racks
                    .Include(r => r.Store)
                    .Include(r => r.Company)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (rack == null)
                {
                    return NotFound(new { error = "Rack not found" });
                }

                var rackDto = new RackDTO
                {
                    Id = rack.Id,
                    Name = rack.Name,
                    Description = rack.Description,
                    StoreId = rack.StoreId,
                    StoreName = rack.Store?.Name,
                    CompanyId = rack.CompanyId,
                    CompanyName = rack.Company?.Name,
                    IsActive = rack.IsActive,
                    CreatedAt = rack.CreatedAt,
                    UpdatedAt = rack.UpdatedAt
                };

                return Ok(rackDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching rack {RackId}", id);
                return StatusCode(500, new { error = "Failed to fetch rack" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateRack([FromBody] CreateRackDTO dto)
        {
            try
            {
                // Validate input
                if (dto == null)
                {
                    return BadRequest(new { error = "Request body is required" });
                }

                // Check if rack with same name already exists for this company
                var existingRack = await _context.Racks
                    .FirstOrDefaultAsync(r => r.Name == dto.Name && r.CompanyId == dto.CompanyId);

                if (existingRack != null)
                {
                    return Conflict(new { error = $"Rack '{dto.Name}' already exists for this company" });
                }

                // Verify store exists and belongs to same company
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == dto.StoreId && s.CompanyId == dto.CompanyId);

                if (store == null)
                {
                    return BadRequest(new { error = "Store not found or does not belong to the specified company" });
                }

                var rack = new Rack
                {
                    Id = Guid.NewGuid(),
                    Name = dto.Name,
                    Description = dto.Description,
                    StoreId = dto.StoreId,
                    CompanyId = dto.CompanyId,
                    IsActive = dto.IsActive,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Racks.Add(rack);
                await _context.SaveChangesAsync();

                // Get the created rack with related data
                var createdRack = await _context.Racks
                    .Include(r => r.Store)
                    .Include(r => r.Company)
                    .FirstOrDefaultAsync(r => r.Id == rack.Id);

                return Ok(new RackDTO
                {
                    Id = rack.Id,
                    Name = rack.Name,
                    Description = rack.Description,
                    StoreId = rack.StoreId,
                    StoreName = createdRack?.Store?.Name,
                    CompanyId = rack.CompanyId,
                    CompanyName = createdRack?.Company?.Name,
                    IsActive = rack.IsActive,
                    CreatedAt = rack.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating rack");
                return StatusCode(500, new { error = "Failed to create rack" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRack(Guid id, [FromBody] UpdateRackDTO dto)
        {
            try
            {
                var rack = await _context.Racks
                    .Include(r => r.Store)
                    .Include(r => r.Company)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (rack == null)
                {
                    return NotFound(new { error = "Rack not found" });
                }

                // If name is being changed, check for uniqueness
                if (!string.IsNullOrEmpty(dto.Name) && dto.Name != rack.Name)
                {
                    var existingRack = await _context.Racks
                        .FirstOrDefaultAsync(r => r.Name == dto.Name &&
                                                  r.CompanyId == rack.CompanyId &&
                                                  r.Id != id);

                    if (existingRack != null)
                    {
                        return Conflict(new { error = $"Rack '{dto.Name}' already exists for this company" });
                    }

                    rack.Name = dto.Name;
                }

                if (dto.Description != null)
                    rack.Description = dto.Description;

                if (dto.StoreId.HasValue && dto.StoreId.Value != rack.StoreId)
                {
                    // Verify new store belongs to same company
                    var newStore = await _context.Stores
                        .FirstOrDefaultAsync(s => s.Id == dto.StoreId.Value && s.CompanyId == rack.CompanyId);

                    if (newStore == null)
                    {
                        return BadRequest(new { error = "Store not found or does not belong to the same company" });
                    }

                    rack.StoreId = dto.StoreId.Value;
                }

                if (dto.IsActive.HasValue)
                    rack.IsActive = dto.IsActive.Value;

                rack.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Refresh the rack with updated related data
                var updatedRack = await _context.Racks
                    .Include(r => r.Store)
                    .Include(r => r.Company)
                    .FirstOrDefaultAsync(r => r.Id == id);

                return Ok(new RackDTO
                {
                    Id = rack.Id,
                    Name = rack.Name,
                    Description = rack.Description,
                    StoreId = rack.StoreId,
                    StoreName = updatedRack?.Store?.Name,
                    CompanyId = rack.CompanyId,
                    CompanyName = updatedRack?.Company?.Name,
                    IsActive = rack.IsActive,
                    CreatedAt = rack.CreatedAt,
                    UpdatedAt = rack.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating rack {RackId}", id);
                return StatusCode(500, new { error = "Failed to update rack" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRack(Guid id)
        {
            try
            {
                var rack = await _context.Racks.FindAsync(id);

                if (rack == null)
                {
                    return NotFound(new { error = "Rack not found" });
                }

                // Check if rack has any items or inventory
                //var hasItems = await _context.Items.AnyAsync(i => i.RackId == id);
                //if (hasItems)
                //{
                //    return BadRequest(new { error = "Cannot delete rack that has items assigned to it" });
                //}

                _context.Racks.Remove(rack);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Rack deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting rack {RackId}", id);
                return StatusCode(500, new { error = "Failed to delete rack" });
            }
        }
    }
}