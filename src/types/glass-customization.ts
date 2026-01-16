export interface GlassCustomization {
  // Glass Effect
  blur: number;
  saturation: number;
  brightness: number;
  contrast: number;
  
  // Background
  backgroundOpacity: number;
  
  // Border
  borderWidth: number;
  borderOpacity: number;
  
  // Size
  circleSize: number;
  pillPaddingX: number;
  pillPaddingY: number;
  fontSize: number;
  
  // Shadow
  shadowIntensity: number;
  shadowSpread: number;
  
  // Animation
  hoverLift: number;
  hoverScale: number;
  
  // Adaptive Settings
  adaptiveEnabled: boolean;
  darkBrightness: number;
  lightBrightness: number;
  luminanceThreshold: number;
}
