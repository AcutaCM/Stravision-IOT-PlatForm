#!/bin/bash

# Cloudflare Origin Certificate Setup Script

CERT_DIR="./nginx/certs"
mkdir -p "$CERT_DIR"

echo "========================================================"
echo "   Cloudflare Origin Certificate Setup"
echo "========================================================"
echo "Please go to Cloudflare Dashboard -> SSL/TLS -> Origin Server -> Create Certificate"
echo "Keep default settings (RSA 2048, 15 years)"
echo "========================================================"

echo ""
echo "👉 Step 1: Paste the 'Origin Certificate' content below."
echo "   (Press Ctrl+D on a new line when finished)"
echo "--------------------------------------------------------"
cat > "$CERT_DIR/nginx.crt"

echo ""
echo "👉 Step 2: Paste the 'Private Key' content below."
echo "   (Press Ctrl+D on a new line when finished)"
echo "--------------------------------------------------------"
cat > "$CERT_DIR/nginx.key"

echo ""
echo "========================================================"
echo "✅ Certificates saved to:"
echo "   - $CERT_DIR/nginx.crt"
echo "   - $CERT_DIR/nginx.key"
echo ""
echo "Now you can run: docker-compose up -d"
echo "Don't forget to set SSL/TLS mode to 'Full (Strict)' in Cloudflare!"
echo "========================================================"
