'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * Demo 2: Split Screen Story (Enhanced)
 * Images fade in/out on left, text slides from right
 * Text content changes only AFTER slide-out completes
 */
export function StoryDemo2() {
  const [displaySection, setDisplaySection] = useState(1);
  const [nextSection, setNextSection] = useState(1);
  const [textVisible, setTextVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [kenBurnsActive, setKenBurnsActive] = useState(false);

  useEffect(() => {
    // Initial fade in
    setTimeout(() => {
      setImageVisible(true);
      setTextVisible(true);
      // Start Ken Burns effect after image is visible
      setTimeout(() => {
        setKenBurnsActive(true);
      }, 100);
    }, 100);

    // Sequence timing
    const runSequence = (sectionNum: number) => {
      if (sectionNum > 4) return;

      const displayDuration = sectionNum === 4 ? 0 : 10000;

      if (displayDuration > 0) {
        setTimeout(() => {
          if (sectionNum < 3) {
            // Sections 1→2 and 2→3: Normal transition with overlap
            // Step 1: Start image fade out and reset Ken Burns
            setImageVisible(false);
            setKenBurnsActive(false);
            
            // Step 2: After 500ms, start fading in next image (overlap)
            setTimeout(() => {
              setNextSection(sectionNum + 1);
              setImageVisible(true);
              
              // Start Ken Burns effect after new image is visible
              setTimeout(() => {
                setKenBurnsActive(true);
              }, 100);
              
              // Step 3: After image is visible, slide out current text (with fade)
              setTimeout(() => {
                setTextVisible(false);
                
                // Step 4: AFTER text fully slides out, change the content
                setTimeout(() => {
                  setDisplaySection(sectionNum + 1);
                  
                  // Step 5: Slide in new text
                  setTimeout(() => {
                    setTextVisible(true);
                    
                    // Continue to next section
                    runSequence(sectionNum + 1);
                  }, 50);
                }, 1000); // Wait for slide-out to complete
              }, 600); // Wait for image to be visible
            }, 500); // Image cross-fade overlap
          } else if (sectionNum === 3) {
            // Section 3→4: Fade everything out completely first
            // Step 1: Fade out image and text together, reset Ken Burns
            setImageVisible(false);
            setTextVisible(false);
            setKenBurnsActive(false);
            
            // Step 2: Wait for complete fade out, then change to section 4
            setTimeout(() => {
              setDisplaySection(4);
              setNextSection(4);
              
              // Step 3: Fade in section 4 (both image and text together)
              // No Ken Burns effect for section 4
              setTimeout(() => {
                setImageVisible(true);
                setTextVisible(true);
              }, 200);
            }, 1200); // Wait for both to fully fade out
          }
        }, displayDuration);
      }
    };

    runSequence(1);
  }, []);

  const getImageSrc = () => {
    if (nextSection === 1) return '/Image1.png';
    if (nextSection === 2) return '/Image2.png';
    if (nextSection === 3) return '/Image3.png';
    return '/Image4.png';
  };

  const getContent = () => {
    if (displaySection === 1) {
      return (
        <p className="text-lg md:text-xl leading-relaxed text-white">
          "I created Voiceover Studio Finder for a very simple reason: my own studio kept making money while I was literally sat there checking emails. Years ago, a voiceover reached out because they were nearby and needed a professional booth. I said yes - and that became the first of dozens of sessions where I earned £150-£200 simply by letting someone use the space...
        </p>
      );
    }
    if (displaySection === 2) {
      return (
        <p className="text-lg md:text-xl leading-relaxed text-white">
          "Recently, a local actress from Doncaster recorded a TV commercial here because she didn't have a booth at home - the agency were in Cardiff, so my studio was the perfect middle-ground. Two months ago, an American voice artist on holiday in the UK patched through to the USA for a TV ad, and I earned £175 while she worked...
        </p>
      );
    }
    if (displaySection === 3) {
      return (
        <>
          <p className="text-lg md:text-xl leading-relaxed text-white mb-4">
            "It hit me... there are thousands of studios like mine - home booths, pro booths, podcast rooms - all sitting empty for hours a day. And there are thousands of voiceovers desperately needing somewhere local and reliable to record.
          </p>
          <p className="text-lg md:text-xl leading-relaxed text-white">
            So I built the website I wished existed: a clean, simple, no-commission platform to connect the two."
          </p>
          <p className="text-base font-semibold mt-6 text-red-500">
            - British Male Voiceover Guy Harris, Founder
          </p>
        </>
      );
    }
    if (displaySection === 4) {
      return (
        <>
          <p className="text-sm leading-relaxed text-white mb-4">
            "I created Voiceover Studio Finder for a very simple reason: my own studio kept making money while I was literally sat there checking emails. Years ago, a voiceover reached out because they were nearby and needed a professional booth. I said yes - and that became the first of dozens of sessions where I earned £150-£200 simply by letting someone use the space.
          </p>
          <p className="text-sm leading-relaxed text-white mb-4">
            Recently, a local actress from Doncaster recorded a TV commercial here because she didn't have a booth at home - the agency were in Cardiff, so my studio was the perfect middle-ground. Two months ago, an American voice artist on holiday in the UK patched through to the USA for a TV ad, and I earned £175 while she worked.
          </p>
          <p className="text-sm leading-relaxed text-white mb-4">
            It hit me... there are thousands of studios like mine - home booths, pro booths, podcast rooms - all sitting empty for hours a day. And there are thousands of voiceovers desperately needing somewhere local and reliable to record.
          </p>
          <p className="text-sm leading-relaxed text-white mb-4">
            So I built the website I wished existed: a clean, simple, no-commission platform to connect the two."
          </p>
          <p className="text-xs font-semibold mt-6 text-red-500">
            - British Male Voiceover Guy Harris, Founder
          </p>
        </>
      );
    }
    return null;
  };

  return (
    <div className="relative py-8 overflow-hidden bg-black min-h-screen">
      <div className="absolute inset-0">
        <Image
          src="/bottom-banner.jpg"
          alt="Professional recording studio"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/70"></div>
      </div>
      
      <div className="relative z-10 py-8 w-full">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-12 text-center text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Why I Built This Platform
          </h2>
          
          {displaySection < 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[500px]">
              {/* Image on Left - Fade + Ken Burns effect */}
              <div className={`relative rounded-lg overflow-hidden shadow-2xl transition-opacity duration-600 ${
                imageVisible ? 'opacity-100' : 'opacity-0'
              }`}>
                <div 
                  key={`ken-burns-${nextSection}`}
                  className={`transition-all duration-[10000ms] ease-out ${
                    kenBurnsActive ? 'scale-110 rotate-2' : 'scale-100 rotate-0'
                  }`}
                >
                  <Image
                    src={getImageSrc()}
                    alt="Guy Harris Studio"
                    width={600}
                    height={400}
                    className="object-cover w-full h-auto"
                    priority={displaySection === 1}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>

              {/* Text on Right - Slide from right + fade */}
              <div className={`relative flex items-center transition-all duration-1000 ${
                textVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
              }`}>
                <div className="w-full">
                  {getContent()}
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Full story - Image LEFT, Text RIGHT, both fade in */}
          {displaySection === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[500px]">
              {/* Image4 on LEFT - Fade only (no Ken Burns effect) */}
              <div className={`relative rounded-lg overflow-hidden shadow-2xl transition-opacity duration-1000 ${
                imageVisible ? 'opacity-100' : 'opacity-0'
              }`}>
                <Image
                  src="/Image4.png"
                  alt="Guy Harris Studio"
                  width={600}
                  height={400}
                  className="object-cover w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>

              {/* Text on RIGHT - Fade only */}
              <div className={`relative flex items-center transition-opacity duration-1000 ${
                textVisible ? 'opacity-100' : 'opacity-0'
              }`}>
                <div className="w-full">
                  {getContent()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
