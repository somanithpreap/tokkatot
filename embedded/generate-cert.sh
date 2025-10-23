#!/bin/bash

CERT_DIR="main/certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "Certificate and key files already exist in $CERT_DIR."
    echo "Skipping certificate generation."
    exit 0
fi

# Create directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key and self-signed certificate
openssl req -x509 \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 1825 \
    -nodes \
    -subj "/C=KH/ST=PhnomPenh/L=PhnomPenh/O=Tokkatot/CN=Tokkatot" \

if [ $? -eq 0 ]; then
    echo "Successfully generated certificate and key in $CERT_DIR"
    echo "  + Certificate: $CERT_FILE"
    echo "  + Private Key: $KEY_FILE"
else
    echo "Failed to generate certificate and key"
    exit 1
fi