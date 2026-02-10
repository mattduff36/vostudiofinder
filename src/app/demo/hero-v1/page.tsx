import { Metadata } from 'next';
import { HeroV1Content } from './HeroV1Content';

export const metadata: Metadata = {
  title: 'Hero Demo V1 — Horizontal Strip',
  robots: { index: false, follow: false },
};

export default function HeroV1Page() {
  return <HeroV1Content />;
}
