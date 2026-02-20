using HyperKanban.API.Models;

namespace HyperKanban.API.Repositories;

public interface IContainerConfigRepository
{
    Task<List<ContainerConfigEntry>> GetAllActiveContainersAsync();
    Task<ContainerConfigEntry?> GetByIdAsync(string id);
    Task<ContainerConfigEntry> CreateAsync(ContainerConfigEntry config);
    Task<ContainerConfigEntry> UpdateAsync(ContainerConfigEntry config);
    Task UpdateMetricsAsync(string id, ContainerMetrics metrics);
}
