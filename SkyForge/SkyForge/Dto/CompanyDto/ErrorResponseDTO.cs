//namespace SkyForge.Models.CompanyModel
//{
//    public class ErrorResponseDTO
//    {
//    }
//}

using System;

namespace SkyForge.Dto.CompanyDto
{
    public class ErrorResponseDTO
    {
        public bool Success { get; set; }
        public string Error { get; set; }
        public string Type { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
