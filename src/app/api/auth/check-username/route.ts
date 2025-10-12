import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  generateUsernameSuggestions, 
  addNumberSuffix,
  isValidUsername 
} from '@/lib/utils/username';

/**
 * Check if username exists (case-insensitive)
 */
async function usernameExists(username: string): Promise<boolean> {
  const existing = await db.users.findFirst({
    where: {
      username: {
        equals: username,
        mode: 'insensitive',
      },
    },
  });
  return !!existing;
}

export async function POST(request: NextRequest) {
  try {
    const { display_name, username } = await request.json();

    // If checking a specific username
    if (username) {
      if (!isValidUsername(username)) {
        return NextResponse.json(
          { 
            available: false, 
            message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
          },
          { status: 400 }
        );
      }

      const exists = await usernameExists(username);

      return NextResponse.json({
        available: !exists,
        username,
      });
    }

    // Generate suggestions from display name
    if (display_name) {
      const baseSuggestions = generateUsernameSuggestions(display_name);
      const suggestions: { username: string; available: boolean }[] = [];

      // Check availability of base suggestions
      for (const suggestion of baseSuggestions) {
        const exists = await usernameExists(suggestion);

        suggestions.push({
          username: suggestion,
          available: !exists,
        });

        // If we found an available username, add a few more options with numbers
        if (!exists) {
          for (let i = 2; i <= 4; i++) {
            const numberedUsername = addNumberSuffix(suggestion, i);
            if (isValidUsername(numberedUsername)) {
              const numberedExists = await usernameExists(numberedUsername);
              
              suggestions.push({
                username: numberedUsername,
                available: !numberedExists,
              });
            }
          }
          break; // Found available base, no need to check other bases
        }
      }

      // If all base suggestions are taken, add numbered versions
      if (suggestions.every(s => !s.available)) {
        for (const baseSuggestion of baseSuggestions) {
          for (let i = 1; i <= 99; i++) {
            const numberedUsername = addNumberSuffix(baseSuggestion, i);
            if (isValidUsername(numberedUsername)) {
              const exists = await usernameExists(numberedUsername);

              if (!exists) {
                suggestions.push({
                  username: numberedUsername,
                  available: true,
                });

                // Add a few more numbered options
                for (let j = i + 1; j <= i + 3 && j <= 99; j++) {
                  const nextNumbered = addNumberSuffix(baseSuggestion, j);
                  if (isValidUsername(nextNumbered)) {
                    const nextExists = await usernameExists(nextNumbered);
                    
                    suggestions.push({
                      username: nextNumbered,
                      available: !nextExists,
                    });
                  }
                }
                break;
              }
            }
          }
          if (suggestions.some(s => s.available)) break;
        }
      }

      return NextResponse.json({
        suggestions: suggestions.slice(0, 6), // Return top 6 suggestions
        display_name,
      });
    }

    return NextResponse.json(
      { error: 'Either display_name or username is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json(
      { error: 'Failed to check username' },
      { status: 500 }
    );
  }
}


