import { headers } from 'next/headers';
import { getBaseUrl } from '@/lib/seo/site';

export default async function TempURLVariableTest() {
  const headersList = await headers();
  
  // Create a mock request object for getBaseUrl testing
  const mockRequest = new Request('http://localhost:3000', {
    headers: headersList as any
  });

  // Collect all environment variables
  const envVars = {
    // Vercel-specific
    VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
    VERCEL_ENV: process.env.VERCEL_ENV || 'NOT SET',
    VERCEL_REGION: process.env.VERCEL_REGION || 'NOT SET',
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF || 'NOT SET',
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL || 'NOT SET',
    
    // Custom env vars
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET',
    
    // Node env
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  };

  // Collect all headers
  const allHeaders: Record<string, string> = {};
  headersList.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Test getBaseUrl function
  const baseUrlResult = getBaseUrl(mockRequest);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">
            🔍 URL Variable Diagnostics
          </h1>
          <p className="text-gray-600 mb-4">
            This page shows all URL-related environment variables and request information.
          </p>
        </div>

        {/* getBaseUrl() Result */}
        <div className="bg-green-50 border-2 border-green-500 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-green-900">
            ✅ getBaseUrl() Result
          </h2>
          <div className="bg-white p-4 rounded border-2 border-green-600 font-mono text-lg break-all">
            {baseUrlResult}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            This is what our verification emails should use.
          </p>
        </div>

        {/* Environment Variables */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            🌍 Environment Variables
          </h2>
          <div className="space-y-3">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="border-b pb-3">
                <div className="font-semibold text-blue-600 mb-1">{key}</div>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Request Headers */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            📋 Request Headers
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(allHeaders).map(([key, value]) => (
              <div key={key} className="border-b pb-3">
                <div className="font-semibold text-purple-600 mb-1">{key}</div>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Headers Highlighted */}
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-yellow-900">
            ⚡ Key Headers (Used by getBaseUrl)
          </h2>
          <div className="space-y-3">
            <div className="border-b pb-3">
              <div className="font-semibold text-yellow-700 mb-1">host</div>
              <div className="font-mono text-sm bg-white p-2 rounded break-all">
                {allHeaders['host'] || 'NOT FOUND'}
              </div>
            </div>
            <div className="border-b pb-3">
              <div className="font-semibold text-yellow-700 mb-1">x-forwarded-proto</div>
              <div className="font-mono text-sm bg-white p-2 rounded break-all">
                {allHeaders['x-forwarded-proto'] || 'NOT FOUND'}
              </div>
            </div>
            <div className="border-b pb-3">
              <div className="font-semibold text-yellow-700 mb-1">x-forwarded-host</div>
              <div className="font-mono text-sm bg-white p-2 rounded break-all">
                {allHeaders['x-forwarded-host'] || 'NOT FOUND'}
              </div>
            </div>
          </div>
        </div>

        {/* Manual URL Construction Tests */}
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-blue-900">
            🧪 Manual URL Construction Tests
          </h2>
          <div className="space-y-3">
            <div className="border-b pb-3">
              <div className="font-semibold text-blue-700 mb-1">
                Option 1: x-forwarded-proto + host
              </div>
              <div className="font-mono text-sm bg-white p-2 rounded break-all">
                {allHeaders['x-forwarded-proto'] && allHeaders['host']
                  ? `${allHeaders['x-forwarded-proto']}://${allHeaders['host']}`
                  : 'CANNOT CONSTRUCT'}
              </div>
            </div>
            <div className="border-b pb-3">
              <div className="font-semibold text-blue-700 mb-1">
                Option 2: https + x-forwarded-host
              </div>
              <div className="font-mono text-sm bg-white p-2 rounded break-all">
                {allHeaders['x-forwarded-host']
                  ? `https://${allHeaders['x-forwarded-host']}`
                  : 'CANNOT CONSTRUCT'}
              </div>
            </div>
            <div className="border-b pb-3">
              <div className="font-semibold text-blue-700 mb-1">
                Option 3: VERCEL_URL with https
              </div>
              <div className="font-mono text-sm bg-white p-2 rounded break-all">
                {envVars.VERCEL_URL !== 'NOT SET'
                  ? `https://${envVars.VERCEL_URL}`
                  : 'CANNOT CONSTRUCT'}
              </div>
            </div>
            <div className="border-b pb-3">
              <div className="font-semibold text-blue-700 mb-1">
                Option 4: NEXT_PUBLIC_BASE_URL (as-is)
              </div>
              <div className="font-mono text-sm bg-white p-2 rounded break-all">
                {envVars.NEXT_PUBLIC_BASE_URL}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-red-50 border-2 border-red-500 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-900">
            📝 What to Check
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>On Production:</strong> Visit this page and note which variables are set
            </li>
            <li>
              <strong>On Preview Build:</strong> Visit this page again and compare the values
            </li>
            <li>
              <strong>Look for:</strong> Which variables correctly show the preview URL vs production URL
            </li>
            <li>
              <strong>The green box at the top</strong> should show the URL that verification emails will use
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
