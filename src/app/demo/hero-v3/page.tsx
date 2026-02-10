import { Metadata } from 'next';
import { HeroV3Content } from './HeroV3Content';

export const metadata: Metadata = {
  title: 'Hero Demo V3 — Tabbed Search',
  robots: { index: false, follow: false },
};

export default function HeroV3Page() {
  return <HeroV3Content />;
}
