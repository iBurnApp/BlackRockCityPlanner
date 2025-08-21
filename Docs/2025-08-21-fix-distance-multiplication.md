# Fix for 1.6x Distance Multiplication Issue

## Problem
GPS to playa coordinate conversion was reporting distances approximately 1.6 times larger than actual distances. For example:
- ARTery at 2400' from the Man was showing as ~3856'
- Point 2 at 8337' was showing as ~13396'  
- 1500' locations showed as ~2506'

## Root Cause
The issue was caused by a breaking change between Turf.js v3 and v7. The project was upgraded to Turf v7 but still used the old v3 syntax for distance calculations.

**The 1.6x multiplication factor = 1.609344 (the conversion between kilometers and miles)**

### Technical Details
- **Turf v3 syntax**: `turf.distance(point1, point2, 'miles')` returned miles
- **Turf v7 with old syntax**: `turf.distance(point1, point2, 'miles')` returns **kilometers** (ignores string parameter)
- **Turf v7 correct syntax**: `turf.distance(point1, point2, {units: 'miles'})` returns miles

## Files Fixed

### Source Code
1. **src/geocoder/reverse.js:82** - Critical fix for reverse geocoding
   - Changed from: `turf.distance(point, this.cityCenter, 'miles')`  
   - Changed to: `turf.distance(point, this.cityCenter, {units: 'miles'})`

2. **src/brc_diff.js:37** - Translation distance calculation
   - Changed from: `turf.distance(goldenSpike1, goldenSpike2, 'miles')`
   - Changed to: `turf.distance(goldenSpike1, goldenSpike2, {units: 'miles'})`

3. **src/wiki.js:7** - Already using kilometers, updated for consistency
   - Changed from: `turf.distance(turf.point(lastYearCenter), turf.point(thisYearCenter), 'kilometers')`
   - Changed to: `turf.distance(turf.point(lastYearCenter), turf.point(thisYearCenter), {units: 'kilometers'})`

### Test Files
4. **tests/GeocoderTest.js** - Updated multiple turf.distance calls and corrected expected distance values
5. **tests/ArtGeocodeTest.js** - Updated turf.distance call

## New Tests Added
Created **tests/ReverseGeocoderDistanceTest.js** with comprehensive tests:
- Validates distances are calculated in miles, not kilometers
- Tests known locations (ARTery, Point 2, etc.) have correct distances
- Verifies reverse geocode distances match forward geocode
- Confirms the fix eliminates the 1.6x multiplication

## Verification
All tests now pass with correct distance calculations:
- ARTery correctly shows as 2400' from the Man
- Point 2 correctly shows as 8337' from the Man
- All other distances are now accurate without the 1.6x multiplication

## Impact
This fix ensures accurate distance reporting for:
- GPS location to playa coordinate conversion
- Reverse geocoding from lat/lon to Burning Man addresses
- Distance calculations throughout the application