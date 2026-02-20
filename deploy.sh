#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🌿 Vanatvam — Deploy to GCP
# ═══════════════════════════════════════════════════════════════
# Usage: ./deploy.sh [backend|frontend|all]
#   backend  — Build & deploy backend to Cloud Run
#   frontend — Build & deploy frontend to Firebase Hosting
#   all      — Deploy both (default)
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on any error

# ─── Configuration ────────────────────────────────────────────
PROJECT_ID="vanatvam-booking-app"
REGION="asia-south1"
BACKEND_SERVICE="vanatvam-backend"
IMAGE_REPO="asia-south1-docker.pkg.dev/${PROJECT_ID}/vanatvam-repo/backend"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Colors ───────────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ─── Helper Functions ─────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ ${NC} $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠️ ${NC} $1"; }
error()   { echo -e "${RED}❌${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}═══════════════════════════════════════════${NC}"; echo -e "${BOLD}  $1${NC}"; echo -e "${BOLD}═══════════════════════════════════════════${NC}\n"; }

# ─── Parse Arguments ──────────────────────────────────────────
DEPLOY_TARGET="${1:-all}"

if [[ "$DEPLOY_TARGET" != "backend" && "$DEPLOY_TARGET" != "frontend" && "$DEPLOY_TARGET" != "all" ]]; then
    echo -e "${BOLD}Usage:${NC} ./deploy.sh [backend|frontend|all]"
    echo ""
    echo "  backend   Build & deploy backend to Cloud Run"
    echo "  frontend  Build & deploy frontend to Firebase Hosting"
    echo "  all       Deploy both (default)"
    exit 1
fi

echo -e "${BOLD}"
echo "  🌿 Vanatvam GCP Deployment"
echo "  ─────────────────────────"
echo -e "${NC}"
echo "  Project:  ${PROJECT_ID}"
echo "  Region:   ${REGION}"
echo "  Target:   ${DEPLOY_TARGET}"
echo ""

# ─── Verify gcloud is available ───────────────────────────────
if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI not found. Please install Google Cloud SDK."
fi

# ─── Verify correct project ──────────────────────────────────
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
    warn "Current project is '${CURRENT_PROJECT}', switching to '${PROJECT_ID}'..."
    gcloud config set project "$PROJECT_ID" --quiet
fi

# ═══════════════════════════════════════════════════════════════
# BACKEND DEPLOYMENT
# ═══════════════════════════════════════════════════════════════
deploy_backend() {
    header "🐳 Building Backend Docker Image"
    
    info "Submitting build to Cloud Build..."
    START_TIME=$SECONDS
    
    gcloud builds submit \
        --tag="${IMAGE_REPO}:latest" \
        --project="${PROJECT_ID}" \
        "${SCRIPT_DIR}/backend"
    
    BUILD_TIME=$((SECONDS - START_TIME))
    success "Backend image built in ${BUILD_TIME}s"

    header "🚀 Deploying Backend to Cloud Run"
    
    info "Deploying to Cloud Run service '${BACKEND_SERVICE}'..."
    START_TIME=$SECONDS
    
    gcloud run deploy "${BACKEND_SERVICE}" \
        --image="${IMAGE_REPO}:latest" \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --quiet
    
    DEPLOY_TIME=$((SECONDS - START_TIME))
    success "Backend deployed in ${DEPLOY_TIME}s"
    
    # Get the service URL
    BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --format="value(status.url)" 2>/dev/null)
    
    echo ""
    success "Backend live at: ${BACKEND_URL}"
}

# ═══════════════════════════════════════════════════════════════
# FRONTEND DEPLOYMENT
# ═══════════════════════════════════════════════════════════════
deploy_frontend() {
    header "📦 Building Frontend"
    
    info "Running npm build..."
    START_TIME=$SECONDS
    
    cd "${SCRIPT_DIR}/frontend"
    npm run build
    
    BUILD_TIME=$((SECONDS - START_TIME))
    success "Frontend built in ${BUILD_TIME}s"

    header "🌐 Deploying Frontend to Firebase Hosting"
    
    info "Deploying to Firebase Hosting..."
    START_TIME=$SECONDS
    
    npx -y firebase-tools deploy --only hosting --project "${PROJECT_ID}"
    
    DEPLOY_TIME=$((SECONDS - START_TIME))
    success "Frontend deployed in ${DEPLOY_TIME}s"
    
    cd "${SCRIPT_DIR}"
    
    echo ""
    success "Frontend live at: https://${PROJECT_ID}.web.app"
}

# ═══════════════════════════════════════════════════════════════
# EXECUTE DEPLOYMENT
# ═══════════════════════════════════════════════════════════════
TOTAL_START=$SECONDS

if [[ "$DEPLOY_TARGET" == "backend" || "$DEPLOY_TARGET" == "all" ]]; then
    deploy_backend
fi

if [[ "$DEPLOY_TARGET" == "frontend" || "$DEPLOY_TARGET" == "all" ]]; then
    deploy_frontend
fi

TOTAL_TIME=$((SECONDS - TOTAL_START))

# ─── Summary ─────────────────────────────────────────────────
header "✅ Deployment Complete!"

echo "  ⏱  Total time:  ${TOTAL_TIME}s"
echo ""

if [[ "$DEPLOY_TARGET" == "backend" || "$DEPLOY_TARGET" == "all" ]]; then
    echo "  🔧 Backend:   https://vanatvam-backend-57399834436.asia-south1.run.app"
    echo "  📖 API Docs:  https://vanatvam-backend-57399834436.asia-south1.run.app/docs"
fi

if [[ "$DEPLOY_TARGET" == "frontend" || "$DEPLOY_TARGET" == "all" ]]; then
    echo "  🌐 Frontend:  https://${PROJECT_ID}.web.app"
fi

echo ""
echo "  📊 GCP Console: https://console.cloud.google.com/run?project=${PROJECT_ID}"
echo ""
