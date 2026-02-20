FROM mcr.microsoft.com/dotnet/runtime:8.0-alpine

WORKDIR /app
COPY bin/Release/net8.0/publish/ ./

RUN apk add --no-cache curl
RUN adduser -D agent && chown -R agent:agent /app
USER agent

ENTRYPOINT ["dotnet", "RequirementsGenerator.dll"]
