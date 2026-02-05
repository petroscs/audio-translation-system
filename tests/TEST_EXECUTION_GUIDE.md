# Test Execution Guide

This guide provides instructions for executing all test suites in Phase 8.

## Prerequisites

1. **Development Environment:**
   - .NET 8 SDK installed
   - Node.js 18+ installed
   - Docker Desktop installed (for integration tests)

2. **Test Data:**
   - Admin user seeded (username: `admin`, password: `admin123`)
   - Test users created (translator, listener)

3. **Services Running:**
   - Backend API: `http://localhost:5000`
   - mediasoup: `http://localhost:4000`
   - STT Worker: `http://localhost:5002`
   - Recording Worker: `http://localhost:5003`

## Running Tests

### 1. Unit Tests

```bash
cd backend
dotnet test Backend.Tests --filter "FullyQualifiedName~Unit"
```

### 2. Integration Tests

```bash
cd backend
dotnet test Backend.Tests --filter "FullyQualifiedName~Integration"
```

**Note:** Integration tests require services to be running or use mocks.

### 3. Security Tests

```bash
cd backend
dotnet test Backend.Tests --filter "FullyQualifiedName~Security"
```

### 4. All Tests

```bash
cd backend
dotnet test Backend.Tests
```

**Current status (Phase 8):** Running the full suite yields **50 passing** and **9 failing** tests. Failures are confined to test classes where the in-memory database used by the test fixture is not shared with the test server (WebApplicationFactory isolation). The following classes pass fully when run together or in the full suite:

- **ApiIntegrationTests** (11 tests) – auth, users, events, channels, sessions
- **MediasoupIntegrationTests**, **RecordingWorkerIntegrationTests**, **SttWorkerIntegrationTests**
- **AuthenticationTests** (most), **AuthorizationTests** (most), **DataSecurityTests** (most)

**Workaround – run by test class:** To get a fully green run, execute one class at a time (e.g. all API integration tests):

```bash
cd backend
dotnet test Backend.Tests --filter "FullyQualifiedName~ApiIntegrationTests"
```

**Known failing tests (9):** These depend on login/setup in classes where the in-memory DB is not visible to the server: e.g. `GetUser_DoesNotReturnPasswordHash`, Signaling/Session/Concurrency auth flows, `Refresh_WithValidToken_ReturnsNewToken`, `AccessProtectedEndpoint_WithValidToken_Succeeds`, `GetUser_AsSelf_Succeeds`, `CreateUser_WithXSSAttempt_Sanitized`. Fixing them would require aligning the test server with the in-memory DB (e.g. shared WebApplicationFactory collection or a test database the server is configured to use).

### 5. With Coverage

```bash
cd backend
dotnet test Backend.Tests /p:CollectCoverage=true /p:CoverletOutputFormat=opencover
```

## Load Tests

### API Load Tests (k6)

```bash
# Install k6 first (see tests/load/README.md)

# Run baseline test
k6 run tests/load/api-load-test.js

# Run with custom API URL
k6 run tests/load/api-load-test.js --env API_URL=http://localhost:5000
```

### WebSocket Load Tests (Artillery)

```bash
# Install Artillery first
npm install -g artillery

# Run WebSocket load test
artillery run tests/load/websocket-load-test.yml
```

### WebRTC Load Tests

```bash
# Run WebRTC load test
node tests/load/webrtc-load-test.js --translators=5 --listeners=50 --duration=300
```

## E2E Tests

E2E tests are manual test scripts. Follow the procedures in:
- `tests/integration/e2e-test-scripts.md`

## Network Tests

Follow procedures in:
- `tests/network/network-testing-guide.md`

## Stress Tests

Follow procedures in:
- `tests/stress/stress-testing-guide.md`

## Test Reports

### Generating Test Reports

```bash
# HTML report (using ReportGenerator)
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"**/coverage.opencover.xml" -targetdir:"coverage" -reporttypes:Html
```

### Viewing Coverage

Open `coverage/index.html` in a browser.

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    cd backend
    dotnet test Backend.Tests --collect:"XPlat Code Coverage"
    
- name: Generate Coverage Report
  run: |
    dotnet tool install -g dotnet-reportgenerator-globaltool
    reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:"coverage" -reporttypes:Html
```

## Troubleshooting

### Tests Failing

1. **Check service availability:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Check database:**
   ```bash
   # Ensure database is accessible
   # Check connection string in appsettings.json
   ```

3. **Check logs:**
   ```bash
   # Backend logs
   docker logs audio-translation-backend
   
   # Service logs
   docker logs audio-translation-mediasoup
   ```

### Common Issues

- **Port conflicts:** Ensure ports 5000, 4000, 5002, 5003 are available
- **Database locked:** SQLite may be locked if multiple processes access it
- **Authentication failures:** Ensure test users exist and passwords are correct
- **Backend integration tests – 401 on login:** Some test classes use an in-memory DB that is not shared with the test server, so login returns 401 even after seeding users. Use the “run by test class” workaround above (e.g. `--filter "FullyQualifiedName~ApiIntegrationTests"`) for a fully passing run, or see “Known failing tests” in the “All Tests” section.

## Test Data Management

### Seeding Test Data

```bash
# Database seeder runs automatically on startup
# Or run manually:
cd backend
dotnet run --project Backend.Api
```

### Cleaning Test Data

```bash
# Delete test database
rm database/audio_translation.db
```

## Performance Benchmarks

After running tests, document:

- API response times (p50, p95, p99)
- WebSocket message latency
- Audio latency (end-to-end)
- Error rates
- System resource usage (CPU, memory)

## Next Steps

1. Execute all test suites
2. Document results
3. Fix any failures
4. Update test documentation
5. Generate test reports
