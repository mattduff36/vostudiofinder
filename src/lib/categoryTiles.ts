export type CategoryTile = {
  id: string;
  label: string;
  href: string;
  ariaLabel: string;
  studioType: string;
  gridPosition: { row: number; column: number };
  palette: {
    primary: string[];
    accent: string[];
    neutral: string[];
  };
  backgroundColor: string;
};

export const categoryTiles: CategoryTile[] = [
  {
    id: 'home-studio',
    label: 'Home Studio',
    href: '/studios?studioTypes=HOME',
    ariaLabel: 'Browse Home Studios',
    studioType: 'HOME',
    gridPosition: { row: 1, column: 1 },
    palette: {
      primary: ['#3B82F6', '#F97316'],
      accent: ['#10B981'],
      neutral: ['#4B5563'],
    },
    backgroundColor: '#D9D9D9',
  },
  {
    id: 'recording-studio',
    label: 'Recording Studio',
    href: '/studios?studioTypes=RECORDING',
    ariaLabel: 'Browse Recording Studios',
    studioType: 'RECORDING',
    gridPosition: { row: 1, column: 2 },
    palette: {
      primary: ['#EF4444', '#262626'],
      accent: ['#3B82F6'],
      neutral: ['#D1D5DB'],
    },
    backgroundColor: '#525252',
  },
  {
    id: 'podcast-studio',
    label: 'Podcast Studio',
    href: '/studios?studioTypes=PODCAST',
    ariaLabel: 'Browse Podcast Studios',
    studioType: 'PODCAST',
    gridPosition: { row: 1, column: 3 },
    palette: {
      primary: ['#2563EB', '#EA580C'],
      accent: ['#059669'],
      neutral: ['#374151'],
    },
    backgroundColor: '#C4C4C4',
  },
  {
    id: 'voiceover-artist',
    label: 'Voiceover Artist',
    href: '/studios?studioTypes=VOICEOVER',
    ariaLabel: 'Browse Voiceover Artists',
    studioType: 'VOICEOVER',
    gridPosition: { row: 2, column: 1 },
    palette: {
      primary: ['#6366F1', '#1E293B'],
      accent: ['#F43F5E'],
      neutral: ['#F8FAFC'],
    },
    backgroundColor: '#818CF8',
  },
  {
    id: 'audio-producer',
    label: 'Audio Producer',
    href: '/studios?studioTypes=AUDIO_PRODUCER',
    ariaLabel: 'Browse Audio Producers',
    studioType: 'AUDIO_PRODUCER',
    gridPosition: { row: 2, column: 2 },
    palette: {
      primary: ['#06B6D4', '#171717'],
      accent: ['#F59E0B'],
      neutral: ['#E5E7EB'],
    },
    backgroundColor: '#404040',
  },
  {
    id: 'voiceover-coach',
    label: 'Voiceover Coach',
    href: '/studios?studioTypes=VO_COACH',
    ariaLabel: 'Browse Voiceover Coaches',
    studioType: 'VO_COACH',
    gridPosition: { row: 2, column: 3 },
    palette: {
      primary: ['#DC2626', '#1D4ED8'],
      accent: ['#FBBF24'],
      neutral: ['#525252'],
    },
    backgroundColor: '#E5E5E5',
  },
];
