# HyperKanban MySQL Setup Guide

## Prerequisites
- MySQL 8.0 or higher
- .NET 8 SDK

## Installation

### macOS (using Homebrew)
```bash
brew install mysql
brew services start mysql
```

### Using Docker
```bash
docker run --name hyperkanban-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=hyperkanban \
  -p 3306:3306 \
  -d mysql:8.0
```

## Configuration

The backend is configured to use MySQL when `Database:UseMySQL` is set to `true` in appsettings.

### Update Connection String

Edit [appsettings.Development.json](src/backend/HyperKanban.API/appsettings.Development.json):

```json
{
  "Database": {
    "UseMySQL": true
  },
  "ConnectionStrings": {
    "MySQL": "server=localhost;port=3306;database=hyperkanban;user=root;password=YOUR_PASSWORD"
  }
}
```

Replace `YOUR_PASSWORD` with your MySQL root password.

## Database Initialization

The database will be automatically created and seeded when you run the backend:

```bash
cd src/backend/HyperKanban.API
dotnet run
```

This will:
1. Create the `hyperkanban` database if it doesn't exist
2. Apply all migrations to create tables
3. Seed initial container configurations

## Manual Migration Management

### Apply migrations manually
```bash
cd src/backend/HyperKanban.API
dotnet ef database update
```

### Create a new migration
```bash
dotnet ef migrations add MigrationName
```

### Remove last migration
```bash
dotnet ef migrations remove
```

## Database Schema

The MySQL implementation uses the following tables:

### Boards
- Stores board metadata
- Columns and Permissions stored as JSON

### WorkItems
- Stores work item data
- Tags, AiProcessingHistory, and AuditTrail stored as JSON
- Indexed by BoardId, CurrentColumn, State

### ContainerConfigs
- Stores AI container configurations
- Capabilities and Metrics stored as JSON
- Indexed by Name and Status

## Troubleshooting

### Connection Refused
- Ensure MySQL is running: `brew services list` (macOS) or `docker ps` (Docker)
- Check port 3306 is not blocked

### Access Denied
- Verify username and password in connection string
- Grant privileges: `GRANT ALL PRIVILEGES ON hyperkanban.* TO 'root'@'localhost';`

### Migration Errors
- Ensure database exists
- Check EF Core tools are installed: `dotnet tool install --global dotnet-ef`

## Performance Notes

- MySQL provides faster query times for complex filters
- Easier to inspect data using MySQL Workbench or similar tools
- Suitable for local development and production deployments
