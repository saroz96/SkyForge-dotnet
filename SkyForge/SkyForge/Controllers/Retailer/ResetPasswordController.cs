using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Services;
using SkyForge.Models.UserModel;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SkyForge.Dto.CompanyDto;
using SkyForge.Dto.RetailerDto;
using SkyForge.Dto.UserDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.RoleModel;
using SkyForge.Services.UserServices;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/public")]
    [EnableCors("ReactApp")]
    public class ResetPasswordController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordService _passwordService;
        private readonly ILogger<ResetPasswordController> _logger;

        public ResetPasswordController(
            ApplicationDbContext context,
            IPasswordService passwordService,
            ILogger<ResetPasswordController> logger)
        {
            _context = context;
            _passwordService = passwordService;
            _logger = logger;
        }

        // Handle OPTIONS preflight requests
        [HttpOptions("reset-password/{token}")]
        public IActionResult Options()
        {
            Response.Headers.Add("Access-Control-Allow-Origin", "http://localhost:3000");
            Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
            Response.Headers.Add("Access-Control-Allow-Credentials", "false");
            return Ok();
        }

        [HttpPost("reset-password/{token}")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword(string token, [FromBody] ResetPasswordRequest request)
        {
            try
            {
                _logger.LogInformation("=== PUBLIC ResetPassword API Called ===");
                _logger.LogInformation($"Token: {token}");
                _logger.LogInformation($"Password length: {request.Password?.Length}");

                // Validate inputs
                if (string.IsNullOrEmpty(token))
                {
                    return BadRequest(new { success = false, message = "Token is required" });
                }

                if (string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new { success = false, message = "Password is required" });
                }

                if (string.IsNullOrWhiteSpace(request.Password2))
                {
                    return BadRequest(new { success = false, message = "Password confirmation is required" });
                }

                if (request.Password != request.Password2)
                {
                    return BadRequest(new { success = false, message = "Passwords do not match" });
                }

                if (request.Password.Length < 6)
                {
                    return BadRequest(new { success = false, message = "Password must be at least 6 characters" });
                }

                // Find user by token - check BOTH raw and hashed tokens
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => 
                        (u.ResetPasswordToken == token || u.ResetPasswordToken == _passwordService.HashToken(token)) &&
                        u.ResetPasswordExpires > DateTime.UtcNow);

                if (user == null)
                {
                    _logger.LogWarning($"No user found with token: {token}");
                    return BadRequest(new { success = false, message = "Invalid or expired reset link" });
                }

                _logger.LogInformation($"Found user: {user.Email}");

                // Update password
                user.PasswordHash = _passwordService.HashPassword(request.Password);
                user.ResetPasswordToken = null;
                user.ResetPasswordExpires = null;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Password reset successful for {user.Email}");

                return Ok(new
                {
                    success = true,
                    message = "Password updated successfully! You can now log in."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in public reset password");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Server error. Please try again."
                });
            }
        }
    }

    public class ResetPasswordRequest
    {
        public string Password { get; set; }
        public string Password2 { get; set; }
    }
}