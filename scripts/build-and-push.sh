#!/bin/bash
set -e

# Build and Push Images to t5810 Registry
# This script builds all Docker images and pushes them to the t5810.webcentricds.net registry

REGISTRY="t5810.webcentricds.net"
VERSION="${VERSION:-latest}"

echo "========================================="
echo "Building Manifimind CRM Docker Images"
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo "========================================="

# Navigate to project root
cd "$(dirname "$0")/.."

# Login to registry
echo ""
echo ">>> Logging into Docker registry..."
if [ -n "$KUBE_PASSWORD" ] && [ -n "$KUBE_USERNAME" ]; then
    echo "$KUBE_PASSWORD" | docker login "$REGISTRY" -u "$KUBE_USERNAME" --password-stdin
else
    echo "Warning: KUBE_USERNAME and KUBE_PASSWORD not set. Attempting login without credentials..."
    docker login "$REGISTRY"
fi

# Build Database Image
echo ""
echo ">>> Building Database image..."
docker buildx build --platform linux/amd64 \
    -t "${REGISTRY}/magnifimind-crm-database:${VERSION}" \
    --push \
    ./db/

echo "✅ Database image built and pushed"

# Build Backend Image
echo ""
echo ">>> Building Backend image..."
docker buildx build --platform linux/amd64 \
    -t "${REGISTRY}/magnifimind-crm-backend:${VERSION}" \
    --push \
    ./backend/

echo "✅ Backend image built and pushed"

# Build Frontend Image (if package.json exists)
if [ -f "./frontend/package.json" ]; then
    echo ""
    echo ">>> Building Frontend image..."
    docker buildx build --platform linux/amd64 \
        -t "${REGISTRY}/magnifimind-crm-frontend:${VERSION}" \
        --push \
        ./frontend/
    echo "✅ Frontend image built and pushed"
else
    echo ""
    echo "⚠️  Frontend package.json not found, skipping frontend build"
    echo "    Run 'npm init' in ./frontend first"
fi

echo ""
echo "========================================="
echo "✅ All images built and pushed successfully!"
echo "========================================="
echo ""
echo "Images available at:"
echo "  - ${REGISTRY}/magnifimind-crm-database:${VERSION}"
echo "  - ${REGISTRY}/magnifimind-crm-backend:${VERSION}"
echo "  - ${REGISTRY}/magnifimind-crm-frontend:${VERSION}"
echo ""
