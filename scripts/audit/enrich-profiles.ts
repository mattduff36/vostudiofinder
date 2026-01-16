/**
 * PROFILE ENRICHMENT SCRIPT
 * 
 * Gathers missing/incomplete profile data from online sources
 * Generates field-level suggestions with confidence scores
 * Stores suggestions in profile_enrichment_suggestions table
 * 
 * Sources:
 * - Existing website URLs and social profiles
 * - Web search for missing information
 * - Schema.org/JSON-LD extraction
 * - OpenGraph metadata
 * - Google Places API (if configured)
 * 
 * Usage: ts-node scripts/audit/enrich-profiles.ts [--user-id=ID] [--classification=TYPE] [--dry-run]
 */

import { PrismaClient, AuditClassification, EnrichmentConfidence } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Load dev environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const db = new PrismaClient();

interface EnrichmentSuggestion {
  audit_finding_id: string;
  field_name: string;
  current_value: string | null;
  suggested_value: string;
  confidence: EnrichmentConfidence;
  evidence_url: string | null;
  evidence_type: string | null;
}

// Helper to fetch URL content
async function fetchUrl(url: string, timeout: number = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, {
      headers: {
        'User-Agent': 'VoiceoverStudioFinder-Bot/1.0 (Profile Enrichment)',
      },
      timeout,
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Extract structured data from HTML
function extractStructuredData(html: string): Record<string, any> {
  const data: Record<string, any> = {};

  // Extract JSON-LD
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd['@type'] === 'LocalBusiness' || jsonLd['@type'] === 'Organization') {
        data.name = jsonLd.name;
        data.phone = jsonLd.telephone;
        data.address = jsonLd.address?.streetAddress || jsonLd.address;
        data.city = jsonLd.address?.addressLocality;
        data.url = jsonLd.url;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Extract OpenGraph
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  if (ogTitleMatch) data.og_title = ogTitleMatch[1];

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  if (ogDescMatch) data.og_description = ogDescMatch[1];

  const ogUrlMatch = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']*)["']/i);
  if (ogUrlMatch) data.og_url = ogUrlMatch[1];

  // Extract contact info from common patterns
  const emailMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) data.email = emailMatch[1];

  const phoneMatch = html.match(/(?:tel:|phone:|call:)\s*([+\d\s()-]{10,})/i);
  if (phoneMatch) data.extracted_phone = phoneMatch[1].trim();

  return data;
}

// Normalize URLs
function normalizeUrl(url: string): string {
  if (!url) return url;
  
  // Add https if no protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Migrate twitter.com to x.com
  url = url.replace(/twitter\.com/gi, 'x.com');

  // Remove tracking parameters
  try {
    const urlObj = new URL(url);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Extract social media URLs from website
function extractSocialLinks(html: string): Record<string, string> {
  const socialLinks: Record<string, string> = {};

  const patterns = [
    { name: 'facebook', regex: /(?:href|url)=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'\s]+)["']/gi },
    { name: 'twitter', regex: /(?:href|url)=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"'\s]+)["']/gi },
    { name: 'linkedin', regex: /(?:href|url)=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s]+)["']/gi },
    { name: 'instagram', regex: /(?:href|url)=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/gi },
    { name: 'youtube', regex: /(?:href|url)=["'](https?:\/\/(?:www\.)?youtube\.com\/[^"'\s]+)["']/gi },
    { name: 'vimeo', regex: /(?:href|url)=["'](https?:\/\/(?:www\.)?vimeo\.com\/[^"'\s]+)["']/gi },
    { name: 'soundcloud', regex: /(?:href|url)=["'](https?:\/\/(?:www\.)?soundcloud\.com\/[^"'\s]+)["']/gi },
  ];

  patterns.forEach(({ name, regex }) => {
    const matches = Array.from(html.matchAll(regex));
    if (matches.length > 0) {
      // Take the first match and normalize
      socialLinks[name] = normalizeUrl(matches[0][1]);
    }
  });

  return socialLinks;
}

// Enrich a single profile
async function enrichProfile(
  finding: any,
  user: any,
  studioProfile: any | null
): Promise<EnrichmentSuggestion[]> {
  const suggestions: EnrichmentSuggestion[] = [];

  console.log(`\n🔍 Enriching profile: ${user.username} (${finding.classification})`);

  if (!studioProfile) {
    console.log('  ⚠️  No studio profile - skipping');
    return suggestions;
  }

  // Strategy 1: Extract data from existing website URL
  if (studioProfile.website_url) {
    try {
      console.log(`  🌐 Fetching website: ${studioProfile.website_url}`);
      const html = await fetchUrl(studioProfile.website_url, 15000);
      const structuredData = extractStructuredData(html);
      const socialLinks = extractSocialLinks(html);

      // Suggest phone if found and missing
      if (!studioProfile.phone && structuredData.phone) {
        suggestions.push({
          audit_finding_id: finding.id,
          field_name: 'phone',
          current_value: null,
          suggested_value: structuredData.phone,
          confidence: 'HIGH',
          evidence_url: studioProfile.website_url,
          evidence_type: 'website',
        });
        console.log(`    ✅ Found phone: ${structuredData.phone}`);
      }

      // Suggest city if found and missing
      if ((!studioProfile.city || studioProfile.city === '') && structuredData.city) {
        suggestions.push({
          audit_finding_id: finding.id,
          field_name: 'city',
          current_value: studioProfile.city,
          suggested_value: structuredData.city,
          confidence: 'HIGH',
          evidence_url: studioProfile.website_url,
          evidence_type: 'website',
        });
        console.log(`    ✅ Found city: ${structuredData.city}`);
      }

      // Suggest social links if found and missing
      Object.entries(socialLinks).forEach(([platform, url]) => {
        const fieldName = platform === 'twitter' ? 'x_url' : `${platform}_url`;
        const currentValue = (studioProfile as any)[fieldName];

        if (!currentValue) {
          suggestions.push({
            audit_finding_id: finding.id,
            field_name: fieldName,
            current_value: null,
            suggested_value: url,
            confidence: 'HIGH',
            evidence_url: studioProfile.website_url,
            evidence_type: 'website',
          });
          console.log(`    ✅ Found ${platform}: ${url}`);
        }
      });

    } catch (error: any) {
      console.log(`    ⚠️  Failed to fetch website: ${error.message}`);
    }
  }

  // Strategy 2: URL normalization for existing URLs
  const urlFields = [
    'website_url',
    'facebook_url',
    'twitter_url',
    'linkedin_url',
    'instagram_url',
    'youtube_url',
    'vimeo_url',
    'soundcloud_url',
  ];

  urlFields.forEach(field => {
    const currentValue = (studioProfile as any)[field];
    if (currentValue) {
      const normalized = normalizeUrl(currentValue);
      if (normalized !== currentValue) {
        // Handle twitter -> x migration
        if (field === 'twitter_url' && normalized.includes('x.com')) {
          suggestions.push({
            audit_finding_id: finding.id,
            field_name: 'x_url',
            current_value: null,
            suggested_value: normalized,
            confidence: 'HIGH',
            evidence_url: null,
            evidence_type: 'url_normalization',
          });
          console.log(`    ✅ Migrate twitter_url to x_url: ${normalized}`);
        } else {
          suggestions.push({
            audit_finding_id: finding.id,
            field_name: field,
            current_value: currentValue,
            suggested_value: normalized,
            confidence: 'HIGH',
            evidence_url: null,
            evidence_type: 'url_normalization',
          });
          console.log(`    ✅ Normalize ${field}: ${normalized}`);
        }
      }
    }
  });

  // Strategy 3: Extract social profile data
  const socialFields = [
    { field: 'facebook_url', urlPattern: /facebook\.com/ },
    { field: 'x_url', urlPattern: /x\.com/ },
    { field: 'twitter_url', urlPattern: /twitter\.com/ },
    { field: 'linkedin_url', urlPattern: /linkedin\.com/ },
    { field: 'instagram_url', urlPattern: /instagram\.com/ },
  ];

  for (const { field, urlPattern } of socialFields) {
    const url = (studioProfile as any)[field];
    if (url && urlPattern.test(url)) {
      try {
        // For social profiles, we can extract basic info from the page
        console.log(`  🔗 Checking ${field}: ${url}`);
        const html = await fetchUrl(url, 10000);
        
        // Extract display name or location hints
        // This is basic - a more sophisticated approach would use APIs
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          console.log(`    ℹ️  Profile title: ${titleMatch[1]}`);
        }

      } catch (error: any) {
        console.log(`    ⚠️  Failed to fetch ${field}: ${error.message}`);
      }
    }
  }

  // Strategy 4: Reverse geocoding (if coordinates exist but city missing)
  if (studioProfile.latitude && studioProfile.longitude && (!studioProfile.city || studioProfile.city === '')) {
    // Note: This would require Google Maps API or similar
    // For now, we'll flag it as a manual review item
    console.log(`  🗺️  Has coordinates but missing city - requires geocoding API`);
    suggestions.push({
      audit_finding_id: finding.id,
      field_name: 'city',
      current_value: studioProfile.city,
      suggested_value: '[REQUIRES_GEOCODING_API]',
      confidence: 'MEDIUM',
      evidence_url: null,
      evidence_type: 'reverse_geocoding_needed',
    });
  }

  // Strategy 5: Forward geocoding (if city/address exist but no coordinates)
  if (studioProfile.city && studioProfile.city !== '' && (!studioProfile.latitude || !studioProfile.longitude)) {
    console.log(`  🗺️  Has city but missing coordinates - requires geocoding API`);
    // This would also require Google Maps API
  }

  console.log(`  📊 Generated ${suggestions.length} suggestions`);

  return suggestions;
}

async function runEnrichment(options: {
  userId?: string;
  classification?: AuditClassification;
  dryRun?: boolean;
  limit?: number;
} = {}) {
  console.log('🚀 Starting Profile Enrichment...\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No database writes will be performed\n');
  }

  try {
    // Build query for findings to enrich
    const where: any = {};

    if (options.userId) {
      where.user_id = options.userId;
    } else if (options.classification) {
      where.classification = options.classification;
    } else {
      // Default: enrich NEEDS_UPDATE and EXCEPTION findings
      where.classification = { in: ['NEEDS_UPDATE', 'EXCEPTION'] };
    }

    console.log('📊 Fetching audit findings...');
    const findings = await db.profile_audit_findings.findMany({
      where,
      include: {
        users: {
          include: {
            studio_profiles: {
              include: {
                studio_studio_types: true,
                studio_services: true,
                studio_images: true,
              }
            }
          }
        }
      },
      take: options.limit || 100,
      orderBy: { completeness_score: 'asc' }, // Prioritize least complete profiles
    });

    console.log(`✅ Found ${findings.length} profiles to enrich\n`);

    if (findings.length === 0) {
      console.log('ℹ️  No profiles found matching criteria');
      return;
    }

    let totalSuggestions = 0;

    // Enrich each profile
    for (const finding of findings) {
      const suggestions = await enrichProfile(
        finding,
        finding.users,
        finding.users.studio_profiles
      );

      if (suggestions.length > 0 && !options.dryRun) {
        // Store suggestions in database
        for (const suggestion of suggestions) {
          await db.profile_enrichment_suggestions.create({
            data: {
              id: `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ...suggestion,
              updated_at: new Date(),
            }
          });
        }
        totalSuggestions += suggestions.length;
      }

      // Rate limiting - wait 1 second between profiles to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✨ Enrichment complete!`);
    console.log(`📊 Total suggestions generated: ${totalSuggestions}`);

    if (!options.dryRun && totalSuggestions > 0) {
      console.log(`💾 Stored ${totalSuggestions} suggestions in database`);
      console.log('\n🔍 Next steps:');
      console.log('  1. Review suggestions in admin UI: /admin/audit/users');
      console.log('  2. Approve/reject suggestions');
      console.log('  3. Apply approved suggestions to profiles');
    }

  } catch (error) {
    console.error('❌ Error during enrichment:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: any = {
  dryRun: args.includes('--dry-run'),
};

args.forEach(arg => {
  if (arg.startsWith('--user-id=')) {
    options.userId = arg.split('=')[1];
  } else if (arg.startsWith('--classification=')) {
    options.classification = arg.split('=')[1] as AuditClassification;
  } else if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  }
});

// Run the enrichment
runEnrichment(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
