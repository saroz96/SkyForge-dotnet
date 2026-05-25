// Dto/UserDto/CreateUserRequestDTO.cs
namespace SkyForge.Dto.UserDto
{
    public class CreateUserRequestDTO
    {
        public required string Name { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string Password2 { get; set; }
        public required string Role { get; set; } // Role name (Admin, Supervisor, Sales, Purchase, User, Account)
    }

    public class CreateUserResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public CreateUserDataDTO User { get; set; }
        public List<ValidationErrorDTO> Errors { get; set; }
        public object FormData { get; set; }
        public string Error { get; set; }
    }

    public class CreateUserDataDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
    }

    public class ValidationErrorDTO
    {
        public string Field { get; set; }
        public string Msg { get; set; }
    }
}