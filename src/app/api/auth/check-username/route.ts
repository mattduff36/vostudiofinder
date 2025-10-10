import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  generateUsernameSuggestions, 
  addNumberSuffix,
  isValidUsername 
} from '@/lib/utils/username';

export async function POST(request: NextRequest) {
  try {
    const { displayName, username } = await request.json();

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

      const existing = await db.user.findUnique({
        where: { username },
      });

      return NextResponse.json({
        available: !existing,
        username,
      });
    }

    // Generate suggestions from display name
    if (displayName) {
      const baseSuggestions = generateUsernameSuggestions(displayName);
      const suggestions: { username: string; available: boolean }[] = [];

      // Check availability of base suggestions
      for (const suggestion of baseSuggestions) {
        const existing = await db.user.findUnique({
          where: { username: suggestion },
        });

        suggestions.push({
          username: suggestion,
          available: !existing,
        });

        // If we found an available username, add a few more options with numbers
        if (!existing) {
          for (let i = 2; i <= 4; i++) {
            const numberedUsername = addNumberSuffix(suggestion, i);
            if (isValidUsername(numberedUsername)) {
              const numberedExisting = await db.user.findUnique({
                where: { username: numberedUsername },
              });
              
              suggestions.push({
                username: numberedUsername,
                available: !numberedExisting,
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
              const existing = await db.user.findUnique({
                where: { username: numberedUsername },
              });

              if (!existing) {
                suggestions.push({
                  username: numberedUsername,
                  available: true,
                });

                // Add a few more numbered options
                for (let j = i + 1; j <= i + 3 && j <= 99; j++) {
                  const nextNumbered = addNumberSuffix(baseSuggestion, j);
                  if (isValidUsername(nextNumbered)) {
                    const nextExisting = await db.user.findUnique({
                      where: { username: nextNumbered },
                    });
                    
                    suggestions.push({
                      username: nextNumbered,
                      available: !nextExisting,
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
        displayName,
      });
    }

    return NextResponse.json(
      { error: 'Either displayName or username is required' },
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

