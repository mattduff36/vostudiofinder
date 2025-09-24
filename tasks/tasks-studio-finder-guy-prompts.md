# Tasks: Studio Finder Guy Prompts Implementation

## Relevant Files

- `src/components/search/StudiosList.tsx` - Main component for studio cards display, needs height standardization and text clamping
- `src/components/search/StudiosList.test.tsx` - Unit tests for StudiosList component
- `src/components/maps/GoogleMap.tsx` - Map component that needs enhanced tooltips and info windows
- `src/components/maps/GoogleMap.test.tsx` - Unit tests for GoogleMap component
- `src/components/maps/StudioMarkerTooltip.tsx` - New component for enhanced studio marker tooltips (to be created)
- `src/components/maps/StudioMarkerTooltip.test.tsx` - Unit tests for StudioMarkerTooltip component
- `src/components/search/EnhancedSearchBar.tsx` - Homepage search component needing radius display updates
- `src/components/search/EnhancedSearchBar.test.tsx` - Unit tests for EnhancedSearchBar component
- `src/components/search/StudiosPage.tsx` - Studios page component needing text color updates
- `src/components/search/StudiosPage.test.tsx` - Unit tests for StudiosPage component
- `src/components/home/FeaturedStudios.tsx` - Featured studios section needing padding adjustments
- `src/components/home/FeaturedStudios.test.tsx` - Unit tests for FeaturedStudios component
- `src/components/home/Footer.tsx` - Footer component needing copyright text update
- `src/components/home/Footer.test.tsx` - Unit tests for Footer component

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Standardize Studio Cards Layout and Content
  - [x] 1.1 Set fixed height for all studio cards to ensure uniform appearance across the grid
  - [x] 1.2 Implement line-clamp-4 or equivalent CSS to limit shortAbout text to maximum 4 lines
  - [x] 1.3 Set fixed height for card images so all images align cleanly across cards
  - [x] 1.4 Ensure cards maintain equal height even when text content is shorter than 4 lines
  - [x] 1.5 Test responsive behavior on different screen sizes to ensure cards remain uniform

- [ ] 2.0 Enhance Map Marker Tooltips and Info Windows
  - [x] 2.1 Create StudioMarkerTooltip component with compact design (logo left, text right)
  - [x] 2.2 Add studio image/logo thumbnail to tooltip using existing image field from database
  - [x] 2.3 Display studio name (studioName field) in tooltip
  - [x] 2.4 Add clickable link to studio profile page in tooltip
  - [x] 2.5 Implement popup/info window functionality when user clicks studio pin
  - [x] 2.6 Add close 'X' button to popup and implement click-outside-to-close behavior
  - [x] 2.7 Ensure only one popup is open at a time (close previous when opening new)
  - [x] 2.8 Maintain current red border highlight on matching studio card when pin is clicked

- [ ] 3.0 Update Homepage Search Radius Display
  - [ ] 3.1 Move miles value from right side of slider to appear next to "Search Radius" label on left
  - [ ] 3.2 Display miles value in bold formatting
  - [ ] 3.3 Show full word "miles" instead of abbreviated form (e.g., "Search Radius: 25 miles")
  - [ ] 3.4 Ensure slider functionality remains the same with live updates as user drags
  - [ ] 3.5 Test that the display updates correctly when slider value changes

- [ ] 4.0 Fix Text Colors on Studios Page
  - [ ] 4.1 Change "Showing 1–50 of X studios" text color from grey to black
  - [ ] 4.2 Change "Search Radius: X miles" text color from grey to black
  - [ ] 4.3 Verify text remains readable and accessible with new black color
  - [ ] 4.4 Test across different themes/backgrounds to ensure proper contrast

- [ ] 5.0 Adjust Homepage Layout and Footer Content
  - [ ] 5.1 Reduce top/bottom padding above "Featured Studios" section to sit closer to search area
  - [ ] 5.2 Update footer copyright text from "© 2025 VoiceoverStudioFinder & MPDEE Development. All rights reserved" to "© 2025 VoiceoverGuy & MPDEE Development. All rights reserved"
  - [ ] 5.3 Test homepage layout changes on different screen sizes to ensure proper spacing
  - [ ] 5.4 Verify footer text change is applied consistently across all pages
