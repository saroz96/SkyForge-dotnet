using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SkyForge.Models.RoleModel;
using SkyForge.Models.UserModel;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SkyForge.Services
{
    public interface IJwtService
    {
        string GenerateToken(User user, Role? primaryRole = null);
        string GenerateTokenWithClaims(User user, Dictionary<string, string> additionalClaims, Role? primaryRole = null);
        ClaimsPrincipal ValidateToken(string token); // Add this method
        bool TryValidateToken(string token, out ClaimsPrincipal principal);
    }

    public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;
        private readonly TokenValidationParameters _tokenValidationParameters;

        public JwtService(IConfiguration configuration)
        {
            _configuration = configuration;

            // Initialize token validation parameters
            _tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"))),
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        }

        public string GenerateToken(User user, Role? primaryRole = null)
        {
            return GenerateTokenWithClaims(user, new Dictionary<string, string>(), primaryRole);
        }

        public string GenerateTokenWithClaims(User user, Dictionary<string, string> additionalClaims, Role? primaryRole = null)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.Name),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("userId", user.Id.ToString()),
                new Claim("isAdmin", user.IsAdmin.ToString()),
                new Claim("isEmailVerified", user.IsEmailVerified.ToString())
            };

            // Add role claim if exists
            if (primaryRole != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, primaryRole.Name));
                claims.Add(new Claim("roleId", primaryRole.Id.ToString()));
            }

            // Add additional claims
            foreach (var claim in additionalClaims)
            {
                claims.Add(new Claim(claim.Key, claim.Value));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddMinutes(
                Convert.ToDouble(_configuration["Jwt:ExpireMinutes"] ?? "60"));

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);

        }


        /// <summary>
        /// Validates a JWT token and returns the ClaimsPrincipal
        /// </summary>
        /// <param name="token">The JWT token string</param>
        /// <returns>ClaimsPrincipal if valid, null if invalid</returns>
        public ClaimsPrincipal ValidateToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var principal = tokenHandler.ValidateToken(token, _tokenValidationParameters, out _);
                return principal;
            }
            catch (Exception ex)
            {
                // Log the exception if needed
                Console.WriteLine($"Token validation failed: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Safely tries to validate a token
        /// </summary>
        /// <param name="token">The JWT token string</param>
        /// <param name="principal">The ClaimsPrincipal if validation succeeds</param>
        /// <returns>True if validation succeeds, false otherwise</returns>
        public bool TryValidateToken(string token, out ClaimsPrincipal principal)
        {
            principal = ValidateToken(token);
            return principal != null;
        }
    }
}