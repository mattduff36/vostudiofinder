import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    const adaptiveGlassNavPath = path.join(process.cwd(), 'src/components/glass-nav-examples/AdaptiveGlassNav.tsx');
    const bubblesNavPath = path.join(process.cwd(), 'src/components/navigation/AdaptiveGlassBubblesNav.tsx');

    // Replace the DEFAULT_CONFIG constant (demo page component)
    const newAdaptiveConfig = `const DEFAULT_CONFIG = {
  blur: ${config.blur},
  saturation: ${config.saturation},
  brightness: ${config.brightness},
  contrast: ${config.contrast},
  backgroundOpacity: ${config.backgroundOpacity},
  borderWidth: ${config.borderWidth},
  borderOpacity: ${config.borderOpacity},
  circleSize: ${config.circleSize},
  pillPaddingX: ${config.pillPaddingX},
  pillPaddingY: ${config.pillPaddingY},
  fontSize: ${config.fontSize},
  shadowIntensity: ${config.shadowIntensity},
  shadowSpread: ${config.shadowSpread},
  hoverLift: ${config.hoverLift},
  hoverScale: ${config.hoverScale},
  adaptiveEnabled: ${config.adaptiveEnabled},
  darkBrightness: ${config.darkBrightness},
  lightBrightness: ${config.lightBrightness},
  luminanceThreshold: ${config.luminanceThreshold},
};`;

    // Replace the DEFAULT_CONFIG constant (production shared bubbles component)
    const newBubblesConfig = `export const DEFAULT_CONFIG = {
  blur: ${config.blur},
  saturation: ${config.saturation},
  brightness: ${config.brightness},
  contrast: ${config.contrast},
  backgroundOpacity: ${config.backgroundOpacity},
  borderWidth: ${config.borderWidth},
  borderOpacity: ${config.borderOpacity},
  circleSize: ${config.circleSize},
  pillPaddingX: ${config.pillPaddingX},
  pillPaddingY: ${config.pillPaddingY},
  fontSize: ${config.fontSize},
  shadowIntensity: ${config.shadowIntensity},
  shadowSpread: ${config.shadowSpread},
  hoverLift: ${config.hoverLift},
  hoverScale: ${config.hoverScale},
  adaptiveEnabled: ${config.adaptiveEnabled},
  darkBrightness: ${config.darkBrightness},
  lightBrightness: ${config.lightBrightness},
  luminanceThreshold: ${config.luminanceThreshold},
} satisfies GlassCustomization;`;

    // Update AdaptiveGlassNav.tsx
    let adaptiveFileContent = fs.readFileSync(adaptiveGlassNavPath, 'utf-8');
    const adaptiveConfigRegex = /const DEFAULT_CONFIG = \{[^}]+\};/s;
    adaptiveFileContent = adaptiveFileContent.replace(adaptiveConfigRegex, newAdaptiveConfig);
    fs.writeFileSync(adaptiveGlassNavPath, adaptiveFileContent, 'utf-8');

    // Update AdaptiveGlassBubblesNav.tsx
    let bubblesFileContent = fs.readFileSync(bubblesNavPath, 'utf-8');
    const bubblesConfigRegex = /export const DEFAULT_CONFIG = \{[\s\S]*?\} satisfies GlassCustomization;/;
    bubblesFileContent = bubblesFileContent.replace(bubblesConfigRegex, newBubblesConfig);
    fs.writeFileSync(bubblesNavPath, bubblesFileContent, 'utf-8');
    
    return NextResponse.json({ success: true, message: 'Config updated successfully!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
