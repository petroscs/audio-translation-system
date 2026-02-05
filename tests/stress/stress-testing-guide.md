# Stress Testing Guide

This guide describes how to conduct stress tests to identify system limits.

## Objectives

1. Identify maximum concurrent users
2. Identify maximum concurrent channels
3. Test service restart behavior under load
4. Test database connection limits
5. Test mediasoup worker limits

## Test Scenarios

### 1. Maximum Concurrent Users

**Objective:** Find the maximum number of concurrent users the system can handle.

**Procedure:**
1. Start with 10 users
2. Gradually increase by 10 users every 5 minutes
3. Monitor system metrics (CPU, memory, errors)
4. Continue until system fails or performance degrades significantly
5. Document the maximum supported users

**Metrics to Monitor:**
- CPU usage per service
- Memory usage per service
- API response times
- Error rates
- Connection failures

**Expected Results:**
- System should support at least 10 translators and 100 listeners
- Performance degradation should be gradual
- No sudden failures

### 2. Maximum Concurrent Channels

**Objective:** Find the maximum number of concurrent channels.

**Procedure:**
1. Create multiple events
2. Create multiple channels per event
3. Start sessions in each channel simultaneously
4. Gradually increase number of channels
5. Monitor system behavior

**Metrics to Monitor:**
- Router creation success rate
- mediasoup worker CPU/memory
- Channel isolation (no cross-channel audio)

**Expected Results:**
- System should support at least 10 concurrent channels
- No cross-channel audio leakage
- Each channel operates independently

### 3. Service Restarts Under Load

**Objective:** Test graceful degradation and recovery when services restart.

**Procedure:**
1. Start load test with 50 users
2. Restart backend service
3. Monitor reconnection behavior
4. Restart mediasoup service
5. Monitor recovery
6. Restart STT worker
7. Monitor caption recovery

**Metrics to Monitor:**
- Reconnection time
- Data loss
- Service recovery time
- User experience impact

**Expected Results:**
- Services restart gracefully
- Clients reconnect automatically
- Minimal data loss
- Recovery within 30 seconds

### 4. Database Connection Limits

**Objective:** Test SQLite concurrent access limits.

**Procedure:**
1. Start high load test (100+ concurrent requests)
2. Monitor database connection errors
3. Test concurrent writes
4. Monitor for deadlocks or corruption

**Metrics to Monitor:**
- Database connection errors
- Query timeouts
- Deadlock occurrences
- Data corruption

**Expected Results:**
- SQLite handles concurrent reads well
- Writes are serialized (expected behavior)
- No deadlocks or corruption
- Consider PostgreSQL if limits reached

### 5. mediasoup Worker Limits

**Objective:** Test mediasoup worker capacity.

**Procedure:**
1. Gradually increase number of producers/consumers
2. Monitor mediasoup worker metrics
3. Test worker scaling (if multiple workers configured)
4. Identify worker limits

**Metrics to Monitor:**
- Worker CPU usage
- Worker memory usage
- Producer/consumer limits
- RTP stream quality

**Expected Results:**
- Single worker supports multiple producers/consumers
- Worker scaling works if configured
- No degradation in RTP quality

## Test Execution

### Prerequisites

1. All services running
2. Load testing tools configured
3. Monitoring tools set up
4. Test data prepared

### Running Tests

```bash
# 1. Start monitoring
# Monitor CPU, memory, network, etc.

# 2. Run baseline test
k6 run tests/load/api-load-test.js

# 3. Gradually increase load
# Modify test scripts to increase users

# 4. Monitor system behavior
# Watch for errors, performance degradation

# 5. Document results
# Record maximum supported load, failure points
```

## System Limits Documentation

Document identified limits:

| Limit | Value | Notes |
|-------|-------|-------|
| Max Concurrent Translators | TBD | To be determined |
| Max Concurrent Listeners | TBD | To be determined |
| Max Concurrent Channels | TBD | To be determined |
| Max Sessions per Channel | TBD | To be determined |
| Database Concurrent Connections | SQLite limit | Consider PostgreSQL for scale |

## Recommendations

Based on stress test results:

1. **If limits reached:**
   - Consider horizontal scaling
   - Optimize database queries
   - Add caching layers
   - Consider PostgreSQL migration

2. **If performance degrades:**
   - Identify bottlenecks
   - Optimize slow queries
   - Add connection pooling
   - Consider service scaling

3. **If failures occur:**
   - Improve error handling
   - Add retry logic
   - Implement circuit breakers
   - Add monitoring/alerting

## Notes

- Stress tests should be run in isolated environment
- Document all test conditions and results
- Compare results with performance targets
- Update system documentation with limits
