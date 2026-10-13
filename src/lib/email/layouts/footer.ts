/** Same fallback used by locked layouts and captured campaign snapshots. */
export function defaultEmailFooter(now = new Date()): string {
  return `Voiceover Studio Finder\n© ${now.getFullYear()} Voiceover Studio Finder. All rights reserved.\nQuestions? support@voiceoverstudiofinder.com`;
}
