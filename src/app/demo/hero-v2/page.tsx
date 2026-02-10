import { Metadata } from 'next';
import { HeroV2Content } from './HeroV2Content';

export const metadata: Metadata = {
  title: 'Hero Demo V2 — Category Cards',
  robots: { index: false, follow: false },
};

export default function HeroV2Page() {
  return <HeroV2Content />;
}
