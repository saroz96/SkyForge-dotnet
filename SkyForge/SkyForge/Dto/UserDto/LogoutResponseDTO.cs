public class LogoutResponseDTO
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime LoggedOutAt { get; set; }
}
