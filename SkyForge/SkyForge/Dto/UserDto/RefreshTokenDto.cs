// Dto/UserDto/RefreshTokenDto.cs
namespace SkyForge.Dto.UserDto
{
    public class RefreshTokenRequest
    {
        public string RefreshToken { get; set; }
    }

    public class RefreshTokenResponse
    {
        public bool Success { get; set; }
        public string Token { get; set; }
        public string RefreshToken { get; set; }
        public int ExpiresIn { get; set; }
        public string Message { get; set; }
    }
}