import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Path to the AdaptiveGlassNav component
    const filePath = path.join(process.cwd(), 'src/components/glass-nav-examples/AdaptiveGlassNav.tsx');
    
    // Read the file
    let fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Replace the DEFAULT_CONFIG constant
    const newConfig = `const DEFAULT_CONFIG = {
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
    
    // Use regex to replace the DEFAULT_CONFIG block
    const configRegex = /const DEFAULT_CONFIG = \{[^}]+\};/s;
    fileContent = fileContent.replace(configRegex, newConfig);
    
    // Write back to file
    fs.writeFileSync(filePath, fileContent, 'utf-8');
    
    return NextResponse.json({ success: true, message: 'Config updated successfully!' });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
