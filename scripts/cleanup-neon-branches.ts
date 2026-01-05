/**
 * Script to clean up unused Neon preview branches
 * 
 * This script will:
 * 1. List all branches in your Neon project
 * 2. Identify preview/dependabot branches
 * 3. Delete them (except main/production branches)
 * 
 * Usage:
 *   NEON_API_KEY=your_api_key npm run cleanup-neon-branches
 */

interface NeonBranch {
  id: string;
  name: string;
  project_id: string;
  parent_id: string | null;
  current_state: string;
  creation_source: string;
  created_at: string;
  updated_at: string;
  primary: boolean;
  protected: boolean;
}

interface NeonBranchesResponse {
  branches: NeonBranch[];
}

const NEON_API_BASE = 'https://console.neon.tech/api/v2';

async function listBranches(apiKey: string, projectId: string): Promise<NeonBranch[]> {
  const response = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list branches: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as NeonBranchesResponse;
  return data.branches;
}

async function deleteBranch(apiKey: string, projectId: string, branchId: string): Promise<void> {
  const response = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches/${branchId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete branch: ${response.status} ${response.statusText}`);
  }
}

async function cleanupPreviewBranches() {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;

  if (!apiKey) {
    console.error('❌ Error: NEON_API_KEY environment variable is required');
    console.log('\nTo get your API key:');
    console.log('1. Go to https://console.neon.tech');
    console.log('2. Click on your profile (bottom left) → Account Settings');
    console.log('3. Go to "API keys" tab');
    console.log('4. Click "Generate new API key"');
    console.log('5. Copy the key and run:');
    console.log('\n   NEON_API_KEY=your_key npm run cleanup-neon-branches\n');
    process.exit(1);
  }

  if (!projectId) {
    console.error('❌ Error: NEON_PROJECT_ID environment variable is required');
    console.log('\nTo get your project ID:');
    console.log('1. Go to https://console.neon.tech');
    console.log('2. Select your project');
    console.log('3. The project ID is in the URL: console.neon.tech/app/projects/YOUR_PROJECT_ID');
    console.log('4. Or check your DATABASE_URL - it contains the project ID');
    console.log('\nThen run:');
    console.log('\n   NEON_PROJECT_ID=your_id NEON_API_KEY=your_key npm run cleanup-neon-branches\n');
    process.exit(1);
  }

  console.log('🔍 Fetching branches from Neon...\n');

  try {
    const branches = await listBranches(apiKey, projectId);
    
    console.log(`Found ${branches.length} total branches:\n`);
    
    // Identify preview/dependabot branches
    const previewBranches = branches.filter(branch => 
      (branch.name.startsWith('preview/') || branch.name.includes('dependabot')) &&
      !branch.primary &&
      !branch.protected
    );

    if (previewBranches.length === 0) {
      console.log('✅ No preview branches to clean up!');
      return;
    }

    console.log('📋 Preview branches to delete:');
    previewBranches.forEach(branch => {
      console.log(`   - ${branch.name} (${branch.current_state}) [ID: ${branch.id}]`);
    });

    console.log(`\n⚠️  About to delete ${previewBranches.length} preview branches...`);
    console.log('⏳ Starting deletion...\n');

    let successCount = 0;
    let failCount = 0;

    for (const branch of previewBranches) {
      try {
        await deleteBranch(apiKey, projectId, branch.id);
        console.log(`✅ Deleted: ${branch.name}`);
        successCount++;
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to delete ${branch.name}:`, error instanceof Error ? error.message : error);
        failCount++;
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   ✅ Successfully deleted: ${successCount}`);
    if (failCount > 0) {
      console.log(`   ❌ Failed: ${failCount}`);
    }

    // List remaining branches
    console.log('\n📊 Remaining branches:');
    const remainingBranches = await listBranches(apiKey, projectId);
    remainingBranches.forEach(branch => {
      const badge = branch.primary ? '⭐' : branch.protected ? '🔒' : '📝';
      console.log(`   ${badge} ${branch.name} (${branch.current_state})`);
    });
    console.log(`\nTotal branches: ${remainingBranches.length}/10\n`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupPreviewBranches().catch(console.error);


























