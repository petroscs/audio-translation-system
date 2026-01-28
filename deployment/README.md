# Docker Deployment Guide

This directory contains Docker configuration files for deploying the Audio Translation System.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

1. **Copy environment file:**
   ```bash
   cd deployment
   cp .env.example .env
   ```

2. **Edit `.env` file** with your configuration:
   - Set `SERVER_IP` to your server's IP address
   - Change `JWT_SECRET` to a secure random string
   - Adjust other settings as needed

3. **Build and start all services:**
   ```bash
   docker-compose up -d --build
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop all services:**
   ```bash
   docker-compose down
   ```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 5000 (HTTP), 5001 (HTTPS) | REST API and WebSocket |
| mediasoup | 4000 (HTTP), 10000-10100 (UDP) | WebRTC SFU |
| STT Worker | 5002 | Speech-to-Text API |
| Recording Worker | 5003 | Recording API |
| Admin Dashboard | 3000 | Web Admin Interface |

## Volumes

- `db_data`: SQLite database file storage
- `recordings`: Audio recording files

## Development vs Production

### Development
- Uses development environment variables
- Hot reload enabled (if configured)
- More verbose logging

### Production
- Set `NODE_ENV=production` for Node.js services
- Set `ASPNETCORE_ENVIRONMENT=Production` for backend
- Use strong JWT secrets
- Configure proper firewall rules

## Troubleshooting

### Docker Desktop not running
- Start Docker Desktop application
- Wait for it to fully start (whale icon in system tray)

### Port conflicts
- Check if ports are already in use
- Modify port mappings in `docker-compose.yml`

### Build failures
- Ensure all source code is present
- Check Docker logs: `docker-compose logs [service-name]`

### Network issues
- Ensure all services are on the same Docker network
- Check `SERVER_IP` matches your actual server IP

## Individual Service Commands

### Build specific service
```bash
docker-compose build [service-name]
```

### Start specific service
```bash
docker-compose up -d [service-name]
```

### View logs for specific service
```bash
docker-compose logs -f [service-name]
```

### Restart specific service
```bash
docker-compose restart [service-name]
```

## Data Persistence

- Database files are stored in Docker volume `db_data`
- Recording files are stored in Docker volume `recordings`
- To backup: `docker run --rm -v audio-translation-system_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz /data`

## Clean Up

### Stop and remove containers
```bash
docker-compose down
```

### Remove containers, networks, and volumes
```bash
docker-compose down -v
```

### Remove all images
```bash
docker-compose down --rmi all
```
