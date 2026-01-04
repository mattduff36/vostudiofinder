import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level } = body;

    // Validate the consent level
    if (!['all', 'necessary', 'decline'].includes(level)) {
      return NextResponse.json(
        { error: 'Invalid consent level. Must be "all", "necessary", or "decline".' },
        { status: 400 }
      );
    }

    // Create response
    const response = NextResponse.json({ success: true, level });

    // Set the consent cookie with appropriate security settings
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('vsf_cookie_consent', level, {
      maxAge: 60 * 60 * 24 * 730, // 2 years
      path: '/',
      sameSite: 'lax',
      secure: isProduction,
      httpOnly: false, // Allow client-side access for reading
    });

    return response;
  } catch (error) {
    console.error('Error setting cookie consent:', error);
    return NextResponse.json(
      { error: 'Failed to set cookie consent' },
      { status: 500 }
    );
  }
}

