import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Strict validation schema to prevent injection
const GlassConfigSchema = z.object({
  blur: z.number().finite().min(0).max(100),
  saturation: z.number().finite().min(0).max(500),
  brightness: z.number().finite().min(0).max(3),
  contrast: z.number().finite().min(0).max(3),
  backgroundOpacity: z.number().finite().min(0).max(1),
  borderWidth: z.number().finite().min(0).max(10),
  borderOpacity: z.number().finite().min(0).max(1),
  circleSize: z.number().finite().min(20).max(200),
  pillPaddingX: z.number().finite().min(0).max(50),
  pillPaddingY: z.number().finite().min(0).max(50),
  fontSize: z.number().finite().min(8).max(32),
  shadowIntensity: z.number().finite().min(0).max(1),
  shadowSpread: z.number().finite().min(0).max(100),
  hoverLift: z.number().finite().min(0).max(20),
  hoverScale: z.number().finite().min(1).max(2),
  adaptiveEnabled: z.boolean(),
  darkBrightness: z.number().finite().min(0).max(3),
  lightBrightness: z.number().finite().min(0).max(3),
  luminanceThreshold: z.number().finite().min(0).max(1),
});

type GlassConfig = z.infer<typeof GlassConfigSchema>;

/**
 * Safely serialize a validated config object to TypeScript source code.
 * Uses JSON.stringify for numbers to avoid injection, explicit true/false for booleans.
 */
function serializeConfigValue(value: number | boolean): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  // For numbers, JSON.stringify is safe and handles edge cases (Infinity, NaN, etc.)
  return JSON.stringify(value);
}

function buildConfigSource(config: GlassConfig, isExport: boolean): string {
  const exportPrefix = isExport ? 'export ' : '';
  const suffix = isExport ? ' satisfies GlassCustomization' : '';
  
  return `${exportPrefix}const DEFAULT_CONFIG = {
  blur: ${serializeConfigValue(config.blur)},
  saturation: ${serializeConfigValue(config.saturation)},
  brightness: ${serializeConfigValue(config.brightness)},
  contrast: ${serializeConfigValue(config.contrast)},
  backgroundOpacity: ${serializeConfigValue(config.backgroundOpacity)},
  borderWidth: ${serializeConfigValue(config.borderWidth)},
  borderOpacity: ${serializeConfigValue(config.borderOpacity)},
  circleSize: ${serializeConfigValue(config.circleSize)},
  pillPaddingX: ${serializeConfigValue(config.pillPaddingX)},
  pillPaddingY: ${serializeConfigValue(config.pillPaddingY)},
  fontSize: ${serializeConfigValue(config.fontSize)},
  shadowIntensity: ${serializeConfigValue(config.shadowIntensity)},
  shadowSpread: ${serializeConfigValue(config.shadowSpread)},
  hoverLift: ${serializeConfigValue(config.hoverLift)},
  hoverScale: ${serializeConfigValue(config.hoverScale)},
  adaptiveEnabled: ${serializeConfigValue(config.adaptiveEnabled)},
  darkBrightness: ${serializeConfigValue(config.darkBrightness)},
  lightBrightness: ${serializeConfigValue(config.lightBrightness)},
  luminanceThreshold: ${serializeConfigValue(config.luminanceThreshold)},
}${suffix};`;
}

export async function POST(request: Request) {
  try {
    // AUTHENTICATION: Only admins can modify source files
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      logger.warn('Unauthorized glass config update attempt', { 
        email: session?.user?.email || 'anonymous',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // VALIDATION: Parse and validate input against strict schema
    const body = await request.json();
    const parseResult = GlassConfigSchema.safeParse(body);
    
    if (!parseResult.success) {
      logger.warn('Invalid glass config data', { 
        errors: parseResult.error.issues,
        user: session.user.email
      });
      return NextResponse.json(
        { success: false, error: 'Invalid configuration data', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const config = parseResult.data;
    
    const adaptiveGlassNavPath = path.join(process.cwd(), 'src/components/glass-nav-examples/AdaptiveGlassNav.tsx');
    const bubblesNavPath = path.join(process.cwd(), 'src/components/navigation/AdaptiveGlassBubblesNav.tsx');

    // SAFE SERIALIZATION: Use safe serialization function (no direct interpolation)
    const newAdaptiveConfig = buildConfigSource(config, false);
    const newBubblesConfig = buildConfigSource(config, true);

    // Update AdaptiveGlassNav.tsx
    let adaptiveFileContent = fs.readFileSync(adaptiveGlassNavPath, 'utf-8');
    // Match DEFAULT_CONFIG block (multiline-compatible without 's' flag)
    const adaptiveConfigRegex = /const DEFAULT_CONFIG = \{[\s\S]+?\};/;
    adaptiveFileContent = adaptiveFileContent.replace(adaptiveConfigRegex, newAdaptiveConfig);
    fs.writeFileSync(adaptiveGlassNavPath, adaptiveFileContent, 'utf-8');

    // Update AdaptiveGlassBubblesNav.tsx
    let bubblesFileContent = fs.readFileSync(bubblesNavPath, 'utf-8');
    const bubblesConfigRegex = /export const DEFAULT_CONFIG = \{[\s\S]*?\} satisfies GlassCustomization;/;
    bubblesFileContent = bubblesFileContent.replace(bubblesConfigRegex, newBubblesConfig);
    fs.writeFileSync(bubblesNavPath, bubblesFileContent, 'utf-8');
    
    logger.info('Glass config updated successfully', { 
      user: session.user.email,
      updatedFiles: ['AdaptiveGlassNav.tsx', 'AdaptiveGlassBubblesNav.tsx']
    });
    
    return NextResponse.json({ success: true, message: 'Config updated successfully!' });
  } catch (error) {
    logger.error('Failed to update glass config', { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
