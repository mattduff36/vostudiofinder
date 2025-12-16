#!/bin/bash

# ============================================
# Show Current Database Environment
# ============================================
# Display which database the app will use
# ============================================

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║        DATABASE ENVIRONMENT STATUS             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Function to extract database ID from URL
get_db_id() {
    echo "$1" | grep -o 'ep-[^/@]*' | head -1
}

# Check .env.local (DEV)
if [ -f .env.local ]; then
    DEV_URL=$(grep DATABASE_URL .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    DEV_ID=$(get_db_id "$DEV_URL")
    echo "🔧 DEV Database (.env.local):"
    echo "   ID: $DEV_ID"
    echo "   Status: Active for 'npm run dev'"
    echo ""
else
    echo "⚠️  DEV: .env.local not found"
    echo ""
fi

# Check .env.production (PRODUCTION)
if [ -f .env.production ]; then
    PROD_URL=$(grep DATABASE_URL .env.production | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    PROD_ID=$(get_db_id "$PROD_URL")
    echo "🚀 PRODUCTION Database (.env.production):"
    echo "   ID: $PROD_ID"
    echo "   Status: Active for 'npm run build' and Vercel"
    echo ""
else
    echo "⚠️  PRODUCTION: .env.production not found"
    echo ""
fi

# Check if they're the same (DANGEROUS!)
if [ "$DEV_ID" = "$PROD_ID" ] && [ -n "$DEV_ID" ]; then
    echo "╔════════════════════════════════════════════════╗"
    echo "║  ⚠️  DANGER: SAME DATABASE IN DEV & PROD!     ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    echo "❌ Your dev and production databases are THE SAME!"
    echo "   This is DANGEROUS and should be fixed immediately."
    echo ""
else
    echo "✅ Dev and Production databases are properly separated"
    echo ""
fi

# Show current git branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "📌 Current Git Branch: $BRANCH"
echo ""

