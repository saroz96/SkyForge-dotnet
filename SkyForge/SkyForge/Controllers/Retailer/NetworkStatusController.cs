using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        // Very lightweight health check
        return Ok(new { ok = true, time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
    }
}