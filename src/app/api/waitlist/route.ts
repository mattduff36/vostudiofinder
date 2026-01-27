import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, type = 'GENERAL' } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['GENERAL', 'FEATURED'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid waitlist type' },
        { status: 400 }
      );
    }

    // Check if email already exists in this waitlist type
    const existingEntry = await db.waitlist.findUnique({
      where: { 
        email_type: {
          email: email.toLowerCase(),
          type: type
        }
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'This email address is already on the waitlist' },
        { status: 400 }
      );
    }

    // Create waitlist entry
    await db.waitlist.create({
      data: {
        id: nanoid(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        type: type,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Successfully joined the waitlist' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}

