import { Suspense } from 'react';
import { StudiosPage } from '@/components/search/StudiosPage';
import { buildPublicPageMetadata } from '@/lib/seo/metadata';
import { getPublicStudiosBrowsePage } from '@/lib/studios/public-browse';

const STUDIOS_TITLE = 'Browse Recording Studios - Voiceover Studio Finder';
const STUDIOS_DESCRIPTION =
  'Search and discover professional recording studios worldwide. Filter by location, services, and studio type to find the right studio for your next voiceover project.';

interface StudiosRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSingleSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: StudiosRouteProps) {
  const resolvedSearchParams = await searchParams;
  const activeParamKeys = Object.entries(resolvedSearchParams).filter(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === 'string' && value.length > 0;
  });

  const rawPage = Number.parseInt(getSingleSearchParam(resolvedSearchParams.page) || '1', 10);
  const pageNumber = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const isPaginationOnly = activeParamKeys.every(([key]) => key === 'page');

  return buildPublicPageMetadata({
    title: STUDIOS_TITLE,
    description: STUDIOS_DESCRIPTION,
    pathname: isPaginationOnly && pageNumber > 1 ? `/studios?page=${pageNumber}` : '/studios',
  });
}

export default async function Studios({ searchParams }: StudiosRouteProps) {
  const resolvedSearchParams = await searchParams;
  const activeParamKeys = Object.entries(resolvedSearchParams).filter(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === 'string' && value.length > 0;
  });

  const isDefaultBrowseRoute = activeParamKeys.every(([key]) => key === 'page');
  const requestedPage = Number.parseInt(getSingleSearchParam(resolvedSearchParams.page) || '1', 10);
  const browsePage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const initialBrowseData = isDefaultBrowseRoute
    ? await getPublicStudiosBrowsePage({ page: browsePage })
    : null;

  return (
    <Suspense fallback={<div>Loading studios...</div>}>
      <StudiosPage
        initialSearchResponse={initialBrowseData?.response ?? null}
        initialSeed={initialBrowseData?.seed}
        initialPage={browsePage}
      />
    </Suspense>
  );
}
