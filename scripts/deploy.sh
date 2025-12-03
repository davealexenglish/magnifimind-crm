#!/bin/bash
set -e

# Deploy Manifimind CRM to t5810 Minikube Cluster
# This script deploys the application using Helm

RELEASE_NAME="${RELEASE_NAME:-magnifimind-crm}"
NAMESPACE="${NAMESPACE:-magnifimind-crm}"
KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config-t5810}"

echo "========================================="
echo "Deploying Manifimind CRM to Kubernetes"
echo "Release: $RELEASE_NAME"
echo "Namespace: $NAMESPACE"
echo "Kubeconfig: $KUBECONFIG"
echo "========================================="

# Navigate to project root
cd "$(dirname "$0")/.."

# Set kubeconfig
export KUBECONFIG="$KUBECONFIG"

# Check if kubectl is working
echo ""
echo ">>> Checking Kubernetes connection..."
kubectl cluster-info || {
    echo "❌ Failed to connect to Kubernetes cluster"
    echo "   Make sure minikube is running and KUBECONFIG is correct"
    exit 1
}

# Create namespace if it doesn't exist
echo ""
echo ">>> Ensuring namespace exists..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Check if release exists
echo ""
echo ">>> Checking for existing release..."
if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
    echo ">>> Release exists, upgrading..."
    helm upgrade "$RELEASE_NAME" ./helm/magnifimind-crm \
        --namespace "$NAMESPACE" \
        --wait \
        --timeout 5m
    echo "✅ Release upgraded successfully"
else
    echo ">>> Installing new release..."
    helm install "$RELEASE_NAME" ./helm/magnifimind-crm \
        --namespace "$NAMESPACE" \
        --wait \
        --timeout 5m
    echo "✅ Release installed successfully"
fi

# Show deployment status
echo ""
echo ">>> Deployment Status:"
kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=magnifimind-crm"

# Show services
echo ""
echo ">>> Services:"
kubectl get svc -n "$NAMESPACE" -l "app.kubernetes.io/name=magnifimind-crm"

# Get frontend URL
echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Frontend URL (NodePort):"
MINIKUBE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "  http://${MINIKUBE_IP}:30081"
echo ""
echo "To view logs:"
echo "  kubectl logs -n $NAMESPACE -l component=backend --tail=100"
echo "  kubectl logs -n $NAMESPACE -l component=database --tail=100"
echo ""
echo "To port-forward services:"
echo "  kubectl port-forward -n $NAMESPACE svc/${RELEASE_NAME}-frontend 3000:80"
echo "  kubectl port-forward -n $NAMESPACE svc/${RELEASE_NAME}-backend 8080:8080"
echo ""
