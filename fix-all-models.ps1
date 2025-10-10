# Comprehensive fix script for all remaining Prisma model/field issues

Write-Host "Fixing src/app/api/admin/bulk/route.ts..." -ForegroundColor Yellow
$content = Get-Content "src/app/api/admin/bulk/route.ts" -Raw
$content = $content `
    -replace 'prisma\.studio\.', 'prisma.studios.' `
    -replace 'studio\.owner', 'studio.users' `
    -replace '\.created_at', '.created_at' `
    -replace '\.avatar_url', '.avatar_url'
$content | Set-Content "src/app/api/admin/bulk/route.ts"

Write-Host "Fixing src/app/api/admin/browse/route.ts..." -ForegroundColor Yellow
$content = Get-Content "src/app/api/admin/browse/route.ts" -Raw
$content = $content `
    -replace 'prisma\.user\.', 'prisma.users.' `
    -replace 'prisma\.userProfile\.', 'prisma.user_profiles.' `
    -replace 'prisma\.studio\.', 'prisma.studios.' `
    -replace 'prisma\.studioImage\.', 'prisma.studio_images.' `
    -replace 'prisma\.studioService\.', 'prisma.studio_services.' `
    -replace 'prisma\.review\.', 'prisma.reviews.' `
    -replace 'prisma\.message\.', 'prisma.messages.' `
    -replace 'prisma\.faq\.', 'prisma.faqs.' `
    -replace 'prisma\.contact\.', 'prisma.contacts.' `
    -replace 'prisma\.poi\.', 'prisma.pois.'
$content | Set-Content "src/app/api/admin/browse/route.ts"

Write-Host "Fixing src/app/api/premium/route.ts..." -ForegroundColor Yellow
$content = Get-Content "src/app/api/premium/route.ts" -Replace
$content = $content `
    -replace 'prisma\.user\.', 'prisma.users.' `
    -replace 'prisma\.studio\.', 'prisma.studios.' `
    -replace '\bowner:', 'users:' `
    -replace 'display_name:', 'display_name:' `
    -replace 'created_at:', 'created_at:'
$content | Set-Content "src/app/api/premium/route.ts"

Write-Host "Fixing src/app/premium/page.tsx..." -ForegroundColor Yellow
$content = Get-Content "src/app/premium/page.tsx" -Raw
$content = $content `
    -replace 'prisma\.user\.', 'prisma.users.' `
    -replace 'prisma\.studio\.', 'prisma.studios.' `
    -replace '\bowner:', 'users:'
$content | Set-Content "src/app/premium/page.tsx"

Write-Host "Fixing src/app/api/network/route.ts..." -ForegroundColor Yellow
$content = Get-Content "src/app/api/network/route.ts" -Raw
$content = $content `
    -replace 'prisma\.userConnection\.', 'prisma.user_connections.' `
    -replace 'prisma\.user\.', 'prisma.users.' `
    -replace '\buserId', 'user_id' `
    -replace 'connectedUserId', 'connected_user_id' `
    -replace 'userId_connectedUserId', 'user_id_connected_user_id'
$content | Set-Content "src/app/api/network/route.ts"

Write-Host "Fixing src/app/api/reviews/[id]/response/route.ts..." -ForegroundColor Yellow
$content = Get-Content "src/app/api/reviews/[id]/response/route.ts" -Raw
$content = $content `
    -replace 'db\.review\.', 'db.reviews.' `
    -replace 'db\.reviewResponse\.', 'db.review_responses.' `
    -replace '\.ownerId', '.owner_id' `
    -replace 'reviewId:', 'review_id:' `
    -replace 'authorId:', 'author_id:' `
    -replace 'where: \{ reviewId \}', 'where: { review_id: reviewId }'
$content | Set-Content "src/app/api/reviews/[id]/response/route.ts"

Write-Host "All files fixed!" -ForegroundColor Green

