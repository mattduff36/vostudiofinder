-- ============================================
-- CLEANUP SCRIPT: Remove legacy/spam accounts
-- ============================================
-- This script removes problematic records before migration:
-- - 1 user without a user_profile
-- - 36 users with profiles but no studios (legacy spam)
-- ============================================

-- Step 1: Review problematic records (for information only)
SELECT '=== CLEANUP ANALYSIS ===' as info;

SELECT 'Users without profiles' as issue, COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

SELECT 'Users with profiles but no studios' as issue, COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN studios s ON u.id = s.owner_id
WHERE s.id IS NULL;

-- Step 2: List users without studios (for manual review)
SELECT '=== USERS TO BE DELETED ===' as info;

SELECT 
  u.id,
  u.email,
  u.username,
  u.display_name,
  u.created_at,
  'No studio' as issue
FROM users u
LEFT JOIN studios s ON u.id = s.owner_id
WHERE s.id IS NULL
ORDER BY u.created_at DESC;

-- Step 3: Delete users without profiles (expected: 1 user)
DELETE FROM users 
WHERE id NOT IN (SELECT user_id FROM user_profiles);

SELECT 'Deleted users without profiles' as status, ROW_COUNT() as deleted_count;

-- Step 4: Delete users with profiles but no studios (expected: 36 users)
-- First delete their profiles (due to foreign key constraints)
DELETE FROM user_profiles 
WHERE user_id IN (
  SELECT u.id FROM users u
  LEFT JOIN studios s ON u.id = s.owner_id
  WHERE s.id IS NULL
);

SELECT 'Deleted orphaned profiles' as status, ROW_COUNT() as deleted_count;

-- Then delete the users themselves
DELETE FROM users
WHERE id NOT IN (SELECT owner_id FROM studios);

SELECT 'Deleted users without studios' as status, ROW_COUNT() as deleted_count;

-- Step 5: Verify cleanup complete
SELECT '=== POST-CLEANUP VERIFICATION ===' as info;

SELECT 'Remaining users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Remaining profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'Remaining studios', COUNT(*) FROM studios;

-- All three counts should now be equal (expected: 650 each)
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM users) = (SELECT COUNT(*) FROM user_profiles)
         AND (SELECT COUNT(*) FROM user_profiles) = (SELECT COUNT(*) FROM studios)
    THEN '✅ Cleanup successful - all counts match'
    ELSE '❌ WARNING: Count mismatch detected!'
  END as cleanup_status;

