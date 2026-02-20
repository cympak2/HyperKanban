using HyperKanban.API.Models;
using HyperKanban.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace HyperKanban.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
// [Authorize] // Authentication disabled for MVP
public class ContainerConfigsController : ControllerBase
{
    private readonly IContainerConfigRepository _repository;
    private readonly ILogger<ContainerConfigsController> _logger;

    public ContainerConfigsController(
        IContainerConfigRepository repository,
        ILogger<ContainerConfigsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Get all active container configurations
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ContainerConfigEntry>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ContainerConfigEntry>>> GetActiveContainers()
    {
        try
        {
            var configs = await _repository.GetAllActiveContainersAsync();
            _logger.LogInformation("Retrieved {Count} active container configs", configs.Count);
            return Ok(configs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve container configs");
            return StatusCode(500, new { error = "Failed to retrieve container configurations" });
        }
    }

    /// <summary>
    /// Get container configuration by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ContainerConfigEntry), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContainerConfigEntry>> GetById(string id)
    {
        try
        {
            var config = await _repository.GetByIdAsync(id);
            if (config == null)
            {
                return NotFound(new { error = $"Container configuration '{id}' not found" });
            }

            return Ok(config);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve container config {ContainerId}", id);
            return StatusCode(500, new { error = "Failed to retrieve container configuration" });
        }
    }

    /// <summary>
    /// Create new container configuration (Admin only)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ContainerConfigEntry), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ContainerConfigEntry>> Create([FromBody] ContainerConfigEntry config)
    {
        try
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(config.Name))
            {
                return BadRequest(new { error = "Container name is required" });
            }
            if (string.IsNullOrWhiteSpace(config.Image))
            {
                return BadRequest(new { error = "Container image is required" });
            }

            var created = await _repository.CreateAsync(config);
            _logger.LogInformation("Created container config {ContainerId}: {ContainerName}", created.Id, created.Name);
            
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create container config");
            return StatusCode(500, new { error = "Failed to create container configuration" });
        }
    }

    /// <summary>
    /// Update container configuration (Admin only)
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ContainerConfigEntry), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContainerConfigEntry>> Update(string id, [FromBody] ContainerConfigEntry config)
    {
        try
        {
            // Verify container exists
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                return NotFound(new { error = $"Container configuration '{id}' not found" });
            }

            config.Id = id; // Ensure ID matches route
            var updated = await _repository.UpdateAsync(config);
            _logger.LogInformation("Updated container config {ContainerId}", id);
            
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update container config {ContainerId}", id);
            return StatusCode(500, new { error = "Failed to update container configuration" });
        }
    }
}
