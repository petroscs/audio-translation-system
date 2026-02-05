# Network Testing Guide

This guide describes how to test the system under various network conditions.

## Prerequisites

### Network Simulation Tools

**Linux (using tc/netem):**
```bash
# Already available on most Linux distributions
```

**macOS (using Network Link Conditioner):**
- Install Xcode
- Enable Network Link Conditioner in System Preferences > Developer

**Windows (using Clumsy or NetLimiter):**
- Download Clumsy: https://github.com/jagt/clumsy
- Or use NetLimiter for bandwidth limiting

## Test Scenarios

### 1. Network Latency Simulation

**Objective:** Test system behavior with increased latency.

**Setup (Linux):**
```bash
# Add 100ms latency to all traffic
sudo tc qdisc add dev eth0 root netem delay 100ms

# Remove latency
sudo tc qdisc del dev eth0 root
```

**Test Cases:**
- 50ms latency
- 100ms latency
- 200ms latency

**Expected Results:**
- Audio latency increases proportionally
- System remains functional
- No connection drops
- Captions may be delayed but still delivered

### 2. Packet Loss Simulation

**Objective:** Test system resilience to packet loss.

**Setup (Linux):**
```bash
# Add 1% packet loss
sudo tc qdisc add dev eth0 root netem loss 1%

# Add 3% packet loss
sudo tc qdisc add dev eth0 root netem loss 3%

# Add 5% packet loss
sudo tc qdisc add dev eth0 root netem loss 5%

# Remove packet loss
sudo tc qdisc del dev eth0 root
```

**Test Cases:**
- 1% packet loss
- 3% packet loss
- 5% packet loss

**Expected Results:**
- Audio quality degrades gracefully
- System continues to function
- WebRTC handles packet loss automatically
- No complete connection failures

### 3. Bandwidth Limitations

**Objective:** Test system behavior with limited bandwidth.

**Setup (Linux):**
```bash
# Limit to 1 Mbps
sudo tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms

# Limit to 5 Mbps
sudo tc qdisc add dev eth0 root tbf rate 5mbit burst 32kbit latency 400ms

# Remove bandwidth limit
sudo tc qdisc del dev eth0 root
```

**Test Cases:**
- 1 Mbps bandwidth
- 5 Mbps bandwidth

**Expected Results:**
- Audio quality adapts to bandwidth
- System remains functional
- No connection drops
- Opus codec adapts bitrate

### 4. Network Interruption

**Objective:** Test system recovery from network interruptions.

**Setup:**
```bash
# Disconnect network interface
sudo ifdown eth0

# Reconnect after 10 seconds
sleep 10
sudo ifup eth0
```

**Test Cases:**
- 5 second interruption
- 10 second interruption
- 30 second interruption

**Expected Results:**
- System detects disconnection
- Automatic reconnection attempts
- Session recovery after reconnection
- No data loss (or minimal)

## Test Execution

1. **Start all services:**
   ```bash
   cd deployment
   docker-compose up -d
   ```

2. **Start translator app** and begin session

3. **Apply network conditions** using tools above

4. **Monitor:**
   - Audio quality
   - Connection status
   - Error rates
   - Recovery time

5. **Document results** in test report

## Metrics to Collect

- Audio latency (end-to-end)
- Packet loss rate
- Connection recovery time
- Error rates
- Audio quality metrics (if available)

## Expected Performance

- **Latency:** < 500ms end-to-end (with network latency)
- **Packet Loss:** System handles up to 5% gracefully
- **Bandwidth:** System adapts to available bandwidth
- **Recovery:** Reconnection within 10 seconds

## Notes

- Network simulation affects all traffic on the interface
- Use dedicated test environment when possible
- Document actual network conditions during tests
- Compare results with baseline (no network conditions)
