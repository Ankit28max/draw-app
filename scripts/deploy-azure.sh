#!/usr/bin/env bash
set -e

# ==============================================================================
# VectorCraft Automated Deployment Script for Azure Virtual Machines (Ubuntu)
# ==============================================================================

echo "=========================================================="
echo "🚀 VectorCraft Production Setup for Azure Virtual Machine"
echo "=========================================================="

# 1. Update system packages and install Docker + Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Installing Docker..."
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose curl git
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER" || true
    echo "✅ Docker successfully installed."
else
    echo "✅ Docker is already installed."
fi

# 2. Detect VM Public IP
echo "🌐 Detecting Azure Public IP..."
DETECTED_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org || echo "")

if [ -z "$DETECTED_IP" ]; then
    read -p "Could not auto-detect public IP. Please enter your Azure VM Public IP: " DETECTED_IP
else
    echo "Detected Public IP: $DETECTED_IP"
    read -p "Press Enter to use this IP [$DETECTED_IP] or type a different one: " USER_IP
    if [ -n "$USER_IP" ]; then
        DETECTED_IP="$USER_IP"
    fi
fi

# 3. Generate Secure Environment File (.env)
echo "🔑 Generating production credentials and .env file..."
RANDOM_JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32 ; echo '')
RANDOM_DB_PASSWORD=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16 ; echo '')

cat <<EOF > .env
# Azure Production Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${RANDOM_DB_PASSWORD}
POSTGRES_DB=vectorcraft

JWT_SECRET=${RANDOM_JWT_SECRET}
CORS_ORIGIN=http://${DETECTED_IP}:3000

NEXT_PUBLIC_HTTP_BACKEND=http://${DETECTED_IP}:3001
NEXT_PUBLIC_WS_URL=ws://${DETECTED_IP}:8080
EOF

echo "✅ Created .env with public IP: $DETECTED_IP"

# 4. Build and start containers
echo "🐳 Building and launching Docker containers..."
sudo docker-compose down --remove-orphans || true
sudo docker-compose up --build -d

# 5. Wait for database and sync Prisma schema
echo "⏳ Waiting for PostgreSQL container to initialize..."
sleep 6

echo "🗄️ Applying Prisma database migrations..."
sudo docker-compose exec -T http-backend npx prisma db push --schema=packages/db/prisma/schema.prisma || {
    echo "Retrying schema push after 5 seconds..."
    sleep 5
    sudo docker-compose exec -T http-backend npx prisma db push --schema=packages/db/prisma/schema.prisma
}

echo ""
echo "=========================================================="
echo "🎉 VectorCraft successfully deployed on Azure!"
echo "=========================================================="
echo "👉 Web App (Canvas):    http://${DETECTED_IP}:3000"
echo "👉 HTTP API Health:    http://${DETECTED_IP}:3001/health"
echo "👉 WebSocket Server:   ws://${DETECTED_IP}:8080"
echo ""
echo "⚠️  IMPORTANT AZURE STEP:"
echo "Remember to allow inbound ports 3000, 3001, and 8080 in your"
echo "Azure Portal Network Security Group (Networking -> Add inbound port rule)!"
echo "=========================================================="
