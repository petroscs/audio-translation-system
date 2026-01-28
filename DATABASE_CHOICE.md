# Database Choice: SQLite

## Decision

We are using **SQLite** instead of PostgreSQL for this project.

## Rationale

### Advantages of SQLite for This Project

1. **Simplicity**
   - No separate database server process required
   - Built into .NET Core (Microsoft.Data.Sqlite)
   - Single file database - easy to backup and move
   - Zero configuration needed

2. **Perfect for LAN Deployment**
   - File-based database works well for on-premise deployments
   - No network port required
   - Easier firewall configuration
   - Lower resource usage

3. **Development Benefits**
   - Faster setup and iteration
   - Easy to reset (just delete the file)
   - No need for Docker container for database
   - Works seamlessly with Entity Framework Core

4. **Suitable for Use Case**
   - Mostly read operations (events, channels, sessions)
   - Writes are infrequent (session creation, recording metadata)
   - Single server deployment
   - Moderate concurrent users expected

### Limitations & Considerations

1. **Concurrent Writes**
   - SQLite handles concurrent reads very well
   - Concurrent writes are serialized (acceptable for this use case)
   - If write contention becomes an issue, can migrate to PostgreSQL later

2. **Scalability**
   - SQLite is suitable for small to medium deployments
   - For very large deployments (1000+ concurrent users), PostgreSQL may be better
   - Can migrate to PostgreSQL if needed without changing application code (EF Core abstraction)

3. **File Size**
   - SQLite databases can grow large but handle multi-GB databases well
   - For this project, database size will be relatively small (metadata only, not audio)

## Migration Path

If we need to migrate to PostgreSQL in the future:

1. **Entity Framework Core** abstracts the database provider
2. **Change connection string** from SQLite to PostgreSQL
3. **Run migrations** - EF Core handles the differences
4. **No code changes** needed in application logic

## Configuration

### Connection String

**SQLite:**
```
Data Source=./data/audio_translation.db
```

**Future PostgreSQL (if needed):**
```
Host=localhost;Database=audio_translation;Username=postgres;Password=...
```

### Entity Framework Core Setup

```csharp
// SQLite
services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(connectionString));

// PostgreSQL (if migrating)
services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));
```

## Backup Strategy

Since SQLite is file-based:

1. **Simple Backup**: Copy the `.db` file
2. **Automated Backup**: Script to copy database file to backup location
3. **Version Control**: Can include database file in backups (not Git)
4. **Point-in-Time Recovery**: Use SQLite's WAL (Write-Ahead Logging) mode

## Performance Tips

1. **Enable WAL Mode**: Better concurrency
   ```sql
   PRAGMA journal_mode=WAL;
   ```

2. **Optimize for Reads**: Most operations are reads
   ```sql
   PRAGMA synchronous=NORMAL;
   ```

3. **Proper Indexing**: Index frequently queried columns
4. **Connection Pooling**: Not needed (file-based), but reuse DbContext instances

## Conclusion

SQLite is an excellent choice for this project:
- ✅ Simpler setup and deployment
- ✅ No additional infrastructure needed
- ✅ Perfect for LAN-only deployment
- ✅ Easy to backup and maintain
- ✅ Can migrate to PostgreSQL later if needed

The system is designed to work with SQLite, but the architecture allows for easy migration to PostgreSQL if requirements change.
