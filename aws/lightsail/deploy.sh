#!/bin/bash
#
# AWS Lightsail Deployment Script for MagnifiMind CRM
#
# This script deploys MagnifiMind CRM to AWS Lightsail as an alternative
# to the K8s/Helm deployment. Both deployment options can coexist.
#
# IMPORTANT: Run with AWS_PROFILE=webcentricds
#   Example: AWS_PROFILE=webcentricds ./deploy.sh status
#
# Live URL: https://crm.webcentricds.com
# AWS Account: 369660266796 (webcentricds)
#

set -e

# ============================================================================
# CONFIGURATION - Update these values before running
# ============================================================================

# AWS Configuration
export AWS_REGION="us-east-1"           # Change to your preferred region
export AWS_ACCOUNT_ID=""                 # Your AWS account ID (12 digits)

# Image tags (current versions from your K8s deployment)
export FRONTEND_TAG="0.1.24"
export BACKEND_TAG="0.1.13"

# Credentials (CHANGE THESE for production!)
export DB_PASSWORD="n1JyKYns65p33NK4uUByg6R"
export JWT_SECRET="VXlEyyU0A9C3pw8NRrftGbr9iSfOUJKN0LJXXhIABc2trtOY"

# Lightsail service name
export SERVICE_NAME="magnifimind-crm"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_step() {
    echo ""
    echo "============================================================"
    echo "STEP: $1"
    echo "============================================================"
}

print_info() {
    echo "[INFO] $1"
}

print_warning() {
    echo "[WARNING] $1"
}

confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

preflight_checks() {
    print_step "Pre-flight Checks"

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "ERROR: AWS CLI not installed. Install from: https://aws.amazon.com/cli/"
        exit 1
    fi
    print_info "AWS CLI: OK"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "ERROR: Docker not installed."
        exit 1
    fi
    print_info "Docker: OK"

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "ERROR: AWS credentials not configured. Run: aws configure"
        exit 1
    fi
    print_info "AWS Credentials: OK"

    # Get and display account ID
    DETECTED_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    print_info "AWS Account ID: $DETECTED_ACCOUNT"

    if [ -z "$AWS_ACCOUNT_ID" ]; then
        export AWS_ACCOUNT_ID=$DETECTED_ACCOUNT
        print_info "Using detected account ID: $AWS_ACCOUNT_ID"
    fi

    echo ""
    echo "Configuration Summary:"
    echo "  Region:       $AWS_REGION"
    echo "  Account ID:   $AWS_ACCOUNT_ID"
    echo "  Frontend Tag: $FRONTEND_TAG"
    echo "  Backend Tag:  $BACKEND_TAG"
    echo ""
}

# ============================================================================
# STEP 1: Create ECR Repositories
# ============================================================================

create_ecr_repos() {
    print_step "Creating ECR Repositories"

    # Create frontend repo
    aws ecr create-repository \
        --repository-name magnifimind-frontend \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        2>/dev/null || print_info "Frontend repo already exists"

    # Create backend repo
    aws ecr create-repository \
        --repository-name magnifimind-backend \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        2>/dev/null || print_info "Backend repo already exists"

    print_info "ECR repositories ready"
}

# ============================================================================
# STEP 2: Build and Push Docker Images
# ============================================================================

build_and_push_images() {
    print_step "Building and Pushing Docker Images"

    # Login to ECR
    print_info "Logging into ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

    # Navigate to project root
    cd "$(dirname "$0")/../.."
    PROJECT_ROOT=$(pwd)

    # Build frontend (using Lightsail-specific Dockerfile)
    print_info "Building frontend image..."
    docker buildx build --platform linux/amd64 \
        -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/magnifimind-frontend:$FRONTEND_TAG \
        -f aws/lightsail/Dockerfile.frontend \
        .

    # Build backend
    print_info "Building backend image..."
    docker buildx build --platform linux/amd64 \
        -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/magnifimind-backend:$BACKEND_TAG \
        -f backend/Dockerfile \
        backend/

    # Push images
    print_info "Pushing frontend image..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/magnifimind-frontend:$FRONTEND_TAG

    print_info "Pushing backend image..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/magnifimind-backend:$BACKEND_TAG

    print_info "Images pushed successfully"
}

# ============================================================================
# STEP 3: Create Lightsail Database
# ============================================================================

create_database() {
    print_step "Creating Lightsail PostgreSQL Database"

    print_warning "This will create a Lightsail database (~\$15/month)"
    confirm "Proceed with database creation?"

    aws lightsail create-relational-database \
        --relational-database-name magnifimind-db \
        --relational-database-blueprint-id postgres_16 \
        --relational-database-bundle-id micro_2_0 \
        --master-database-name magnifimind_crm \
        --master-username postgres \
        --master-user-password "$DB_PASSWORD" \
        --region $AWS_REGION \
        --no-publicly-accessible

    print_info "Database creation initiated. This takes 5-10 minutes."
    print_info "Waiting for database to be available..."

    # Wait for database to be ready
    while true; do
        STATUS=$(aws lightsail get-relational-database \
            --relational-database-name magnifimind-db \
            --region $AWS_REGION \
            --query 'relationalDatabase.state' \
            --output text 2>/dev/null || echo "pending")

        if [ "$STATUS" = "available" ]; then
            break
        fi
        echo "  Status: $STATUS - waiting..."
        sleep 30
    done

    # Get database endpoint
    DB_ENDPOINT=$(aws lightsail get-relational-database \
        --relational-database-name magnifimind-db \
        --region $AWS_REGION \
        --query 'relationalDatabase.masterEndpoint.address' \
        --output text)

    export DB_ENDPOINT
    print_info "Database ready!"
    print_info "Endpoint: $DB_ENDPOINT"
}

# ============================================================================
# STEP 4: Create the magnifimind_crm database
# ============================================================================

create_app_database() {
    print_step "Creating Application Database"

    # Get database endpoint if not set
    if [ -z "$DB_ENDPOINT" ]; then
        DB_ENDPOINT=$(aws lightsail get-relational-database \
            --relational-database-name magnifimind-db \
            --region $AWS_REGION \
            --query 'relationalDatabase.masterEndpoint.address' \
            --output text)
    fi

    print_info "Connecting to: $DB_ENDPOINT"
    print_info "You may need to temporarily enable public access to run this."
    print_warning "Run these commands manually if this step fails:"
    echo ""
    echo "  # Enable public access temporarily"
    echo "  aws lightsail update-relational-database \\"
    echo "    --relational-database-name magnifimind-db \\"
    echo "    --publicly-accessible \\"
    echo "    --region $AWS_REGION"
    echo ""
    echo "  # Connect and create database"
    echo "  PGPASSWORD='$DB_PASSWORD' psql -h $DB_ENDPOINT -U postgres -c 'CREATE DATABASE magnifimind_crm;'"
    echo ""
    echo "  # Disable public access"
    echo "  aws lightsail update-relational-database \\"
    echo "    --relational-database-name magnifimind-db \\"
    echo "    --no-publicly-accessible \\"
    echo "    --region $AWS_REGION"
    echo ""
}

# ============================================================================
# STEP 5: Create Lightsail Container Service
# ============================================================================

create_container_service() {
    print_step "Creating Lightsail Container Service"

    print_warning "This will create a Lightsail container service (~\$7/month for micro)"
    confirm "Proceed with container service creation?"

    aws lightsail create-container-service \
        --service-name $SERVICE_NAME \
        --power micro \
        --scale 1 \
        --region $AWS_REGION

    print_info "Container service creation initiated..."

    # Wait for service to be ready
    while true; do
        STATUS=$(aws lightsail get-container-services \
            --service-name $SERVICE_NAME \
            --region $AWS_REGION \
            --query 'containerServices[0].state' \
            --output text 2>/dev/null || echo "PENDING")

        if [ "$STATUS" = "READY" ] || [ "$STATUS" = "RUNNING" ]; then
            break
        fi
        echo "  Status: $STATUS - waiting..."
        sleep 15
    done

    print_info "Container service ready!"
}

# ============================================================================
# STEP 6: Grant ECR Access to Lightsail
# ============================================================================

grant_ecr_access() {
    print_step "Granting ECR Access to Lightsail"

    # Get Lightsail principal ARN
    PRINCIPAL_ARN=$(aws lightsail get-container-service-powers \
        --region $AWS_REGION \
        --query 'powers[0].ecr_image_puller_role_arn' \
        --output text 2>/dev/null || echo "")

    if [ -z "$PRINCIPAL_ARN" ] || [ "$PRINCIPAL_ARN" = "None" ]; then
        print_warning "Could not get Lightsail ECR principal automatically."
        print_info "You may need to configure ECR access policy manually in AWS Console."
        return
    fi

    # Create ECR policy for both repos
    POLICY='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowLightsailPull",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "'"$PRINCIPAL_ARN"'"
                },
                "Action": [
                    "ecr:BatchGetImage",
                    "ecr:GetDownloadUrlForLayer"
                ]
            }
        ]
    }'

    aws ecr set-repository-policy \
        --repository-name magnifimind-frontend \
        --policy-text "$POLICY" \
        --region $AWS_REGION 2>/dev/null || print_warning "Frontend policy may already exist"

    aws ecr set-repository-policy \
        --repository-name magnifimind-backend \
        --policy-text "$POLICY" \
        --region $AWS_REGION 2>/dev/null || print_warning "Backend policy may already exist"

    print_info "ECR access configured"
}

# ============================================================================
# STEP 7: Deploy Containers
# ============================================================================

deploy_containers() {
    print_step "Deploying Containers to Lightsail"

    # Get database endpoint
    if [ -z "$DB_ENDPOINT" ]; then
        DB_ENDPOINT=$(aws lightsail get-relational-database \
            --relational-database-name magnifimind-db \
            --region $AWS_REGION \
            --query 'relationalDatabase.masterEndpoint.address' \
            --output text)
    fi

    # Navigate to project root
    cd "$(dirname "$0")/../.."

    # Generate containers.json from template
    print_info "Generating containers.json..."
    envsubst < aws/lightsail/containers.json.template > aws/lightsail/containers.json

    print_info "Deploying containers..."
    aws lightsail create-container-service-deployment \
        --service-name $SERVICE_NAME \
        --containers file://aws/lightsail/containers.json \
        --public-endpoint file://aws/lightsail/public-endpoint.json \
        --region $AWS_REGION

    print_info "Deployment initiated. This may take a few minutes..."

    # Wait and show URL
    sleep 30

    URL=$(aws lightsail get-container-services \
        --service-name $SERVICE_NAME \
        --region $AWS_REGION \
        --query 'containerServices[0].url' \
        --output text)

    echo ""
    print_info "Deployment in progress!"
    print_info "Your application will be available at: https://$URL"
    echo ""
}

# ============================================================================
# STEP 8: Copy Data from K8s (Optional)
# ============================================================================

copy_data_from_k8s() {
    print_step "Copy Data from K8s to Lightsail (Optional)"

    echo "To copy your existing data from K8s:"
    echo ""
    echo "1. Export from K8s:"
    echo "   KUBECONFIG=~/.kube/config-r740 kubectl exec -n magnifimind-crm \$(kubectl get pod -n magnifimind-crm -l app=magnifimind-crm-database -o jsonpath='{.items[0].metadata.name}') -- pg_dump -U postgres magnifimind_crm > backup.sql"
    echo ""
    echo "2. Enable public access on Lightsail DB temporarily:"
    echo "   aws lightsail update-relational-database --relational-database-name magnifimind-db --publicly-accessible --region $AWS_REGION"
    echo ""
    echo "3. Import to Lightsail (wait for public access to propagate ~5 min):"
    echo "   PGPASSWORD='$DB_PASSWORD' psql -h $DB_ENDPOINT -U postgres magnifimind_crm < backup.sql"
    echo ""
    echo "4. Disable public access:"
    echo "   aws lightsail update-relational-database --relational-database-name magnifimind-db --no-publicly-accessible --region $AWS_REGION"
    echo ""
}

# ============================================================================
# UTILITY: Check Status
# ============================================================================

check_status() {
    print_step "Checking Deployment Status"

    echo "Database:"
    aws lightsail get-relational-database \
        --relational-database-name magnifimind-db \
        --region $AWS_REGION \
        --query 'relationalDatabase.{Name:name,State:state,Endpoint:masterEndpoint.address}' \
        --output table 2>/dev/null || echo "  Not created yet"

    echo ""
    echo "Container Service:"
    aws lightsail get-container-services \
        --service-name $SERVICE_NAME \
        --region $AWS_REGION \
        --query 'containerServices[0].{Name:containerServiceName,State:state,URL:url,Power:power}' \
        --output table 2>/dev/null || echo "  Not created yet"

    echo ""
    echo "Current Deployment:"
    aws lightsail get-container-service-deployments \
        --service-name $SERVICE_NAME \
        --region $AWS_REGION \
        --query 'deployments[0].{State:state,Version:version,CreatedAt:createdAt}' \
        --output table 2>/dev/null || echo "  No deployments yet"
}

# ============================================================================
# UTILITY: Cleanup (Destroy Everything)
# ============================================================================

cleanup() {
    print_step "Cleanup - DESTRUCTIVE!"

    print_warning "This will DELETE all Lightsail resources!"
    confirm "Are you absolutely sure?"
    confirm "Type 'y' again to confirm deletion"

    print_info "Deleting container service..."
    aws lightsail delete-container-service \
        --service-name $SERVICE_NAME \
        --region $AWS_REGION 2>/dev/null || true

    print_info "Deleting database..."
    aws lightsail delete-relational-database \
        --relational-database-name magnifimind-db \
        --skip-final-snapshot \
        --region $AWS_REGION 2>/dev/null || true

    print_info "Resources deleted. ECR repos retained."
}

# ============================================================================
# MAIN
# ============================================================================

show_help() {
    echo "MagnifiMind CRM - AWS Lightsail Deployment Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  preflight      Run pre-flight checks"
    echo "  ecr            Create ECR repositories"
    echo "  build          Build and push Docker images"
    echo "  database       Create Lightsail database"
    echo "  createdb       Instructions to create app database"
    echo "  service        Create Lightsail container service"
    echo "  ecr-access     Grant ECR access to Lightsail"
    echo "  deploy         Deploy containers"
    echo "  copy-data      Show instructions to copy data from K8s (optional)"
    echo "  status         Check deployment status"
    echo "  all            Run full deployment (interactive)"
    echo "  cleanup        Delete all Lightsail resources"
    echo ""
    echo "Recommended order: preflight -> ecr -> build -> database -> service -> ecr-access -> deploy"
}

case "${1:-help}" in
    preflight)   preflight_checks ;;
    ecr)         preflight_checks && create_ecr_repos ;;
    build)       preflight_checks && build_and_push_images ;;
    database)    preflight_checks && create_database ;;
    createdb)    create_app_database ;;
    service)     preflight_checks && create_container_service ;;
    ecr-access)  preflight_checks && grant_ecr_access ;;
    deploy)      preflight_checks && deploy_containers ;;
    copy-data)   copy_data_from_k8s ;;
    status)      check_status ;;
    cleanup)     cleanup ;;
    all)
        preflight_checks
        confirm "Continue with ECR repository creation?"
        create_ecr_repos
        confirm "Continue with Docker image build and push?"
        build_and_push_images
        confirm "Continue with database creation?"
        create_database
        create_app_database
        confirm "Continue with container service creation?"
        create_container_service
        grant_ecr_access
        confirm "Continue with deployment?"
        deploy_containers
        check_status
        echo ""
        echo "Deployment complete! Run './deploy.sh copy-data' if you want to copy data from K8s."
        ;;
    *)           show_help ;;
esac
