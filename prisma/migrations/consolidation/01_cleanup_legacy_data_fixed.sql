-- ============================================
-- DATABASE CLEANUP: Remove legacy data
-- ============================================
-- This script removes users without studios and orphaned profiles
-- IMPORTANT: Run this BEFORE the main migration script

SET search_path = public;

SELECT '=== CLEANUP ANALYSIS ===' as info;

-- Count users without profiles
SELECT 'Users without profiles' as issue, COUNT(*) as count
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- Count users with profiles but no studios
SELECT 'Users with profiles but no studios' as issue, COUNT(*) as count
FROM public.users u
INNER JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.studios s ON u.id = s.owner_id
WHERE s.id IS NULL;

SELECT '=== USERS TO BE DELETED ===' as info;

-- List all users that will be deleted
SELECT 
  u.id,
  u.email,
  u.username,
  u.display_name,
  u.created_at,
  CASE 
    WHEN up.id IS NULL THEN 'No profile'
    WHEN s.id IS NULL THEN 'No studio'
  END as reason
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.studios s ON u.id = s.owner_id
WHERE up.id IS NULL OR s.id IS NULL
ORDER BY u.created_at DESC;

-- Delete users without profiles
DELETE FROM public.users 
WHERE id NOT IN (SELECT user_id FROM public.user_profiles);

SELECT 'Deleted users without profiles' as status, (SELECT COUNT(*) FROM public.users) as remaining_users;

SELECT '=== POST-CLEANUP VERIFICATION ===' as info;

-- Delete orphaned profiles (profiles without users)
DELETE FROM public.user_profiles 
WHERE user_id NOT IN (SELECT id FROM public.users);

SELECT 'Deleted orphaned profiles' as status, (SELECT COUNT(*) FROM public.user_profiles) as remaining_profiles;

-- Delete users without studios (includes deleting their profiles via CASCADE)
DELETE FROM public.users
WHERE id NOT IN (SELECT owner_id FROM public.studios);

SELECT 'Deleted users without studios' as status, (SELECT COUNT(*) FROM public.users) as remaining_users;

-- Verify all counts match
SELECT 'Remaining users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Remaining profiles', COUNT(*) FROM public.user_profiles
UNION ALL
SELECT 'Remaining studios', COUNT(*) FROM public.studios
ORDER BY table_name;

-- Final verification
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users) = (SELECT COUNT(*) FROM public.user_profiles)
         AND (SELECT COUNT(*) FROM public.users) = (SELECT COUNT(*) FROM public.studios)
        THEN '✅ All counts match - cleanup successful'
        ELSE '❌ Counts do not match - review needed'
    END as cleanup_status;

SELECT '=== CLEANUP COMPLETE ===' as info;

