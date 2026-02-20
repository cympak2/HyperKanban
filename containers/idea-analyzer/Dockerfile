FROM mcr.microsoft.com/dotnet/runtime:8.0-alpine

WORKDIR /app

# Copy application files
COPY bin/Release/net8.0/publish/ ./

# Install curl for health checks (optional)
RUN apk add --no-cache curl

# Create non-root user for security
RUN adduser -D agent && chown -R agent:agent /app
USER agent

# Container expects input via environment variable WORK_ITEM_INPUT
# Output should be written to STDOUT

ENTRYPOINT ["dotnet", "IdeaAnalyzer.dll"]
