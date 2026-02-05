# Load Testing Infrastructure

This directory contains load testing scripts and configurations for the audio translation system.

## Tools

- **k6**: For API load testing
- **Artillery**: For WebSocket load testing
- **Custom Scripts**: For WebRTC/mediasoup load testing

## Prerequisites

### k6 Installation

**Windows:**
```powershell
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Artillery Installation

```bash
npm install -g artillery
```

## Test Scenarios

### Baseline: 1 translator, 10 listeners
- Duration: 5 minutes
- Ramp-up: 30 seconds

### Medium: 5 translators, 50 listeners
- Duration: 10 minutes
- Ramp-up: 1 minute

### High: 10 translators, 100 listeners
- Duration: 15 minutes
- Ramp-up: 2 minutes

### Stress: 20 translators, 200 listeners
- Duration: 20 minutes
- Ramp-up: 3 minutes

## Running Tests

### API Load Tests

```bash
k6 run api-load-test.js
```

### WebSocket Load Tests

```bash
artillery run websocket-load-test.yml
```

### WebRTC Load Tests

```bash
node webrtc-load-test.js
```

## Monitoring

During load tests, monitor:

- CPU usage per service
- Memory usage per service
- Network bandwidth usage
- Database query performance
- Error rates
- Response times (p50, p95, p99)

## Performance Targets

- API response time < 200ms (p95)
- Audio latency < 500ms (end-to-end)
- WebSocket message latency < 100ms
- Error rate < 0.1%
