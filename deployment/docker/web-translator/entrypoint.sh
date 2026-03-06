#!/bin/sh
set -e
SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"
if [ ! -f "$SSL_DIR/cert.pem" ]; then
  echo "Generating self-signed certificate for HTTPS..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" \
    -subj "/CN=localhost/O=Audio Translation/C=US"
fi
exec nginx -g "daemon off;"
