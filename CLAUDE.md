# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlackRockCityPlanner is a Node.js geospatial data generation tool that creates GeoJSON files for Burning Man's Black Rock City layout. It generates street grids, plazas, toilets, and provides geocoding services for the unique radial address system used at Burning Man. The generated data is consumed by the iBurn iOS application.

## Development Commands

### Setup
- `npm install` - Install dependencies
- `npm install -g` - Install globally for CLI usage

### Testing
- `npm test` - Run all tests with coverage (uses TAP)
- `tap tests/*.js --cov` - Run tests with coverage directly

### Main Generation Workflow
```bash
# Generate all geometric data for a year
node src/cli/generate_all.js -d ../../data/2025

# Geocode API data (camps/art) with coordinates
node src/cli/api.js -l ../../data/2025/layouts/layout.json -f ../../data/2025/APIData/Resources/camp.json -k location_string -o ../../data/2025/APIData/Resources/camp-location.json

# Replace original with geocoded version
mv ../../data/2025/APIData/Resources/camp-location.json ../../data/2025/APIData/Resources/camp.json

# Bundle geocoder for browser use
browserify src/geocoder/index.js -o ../../data/2025/geocoder/bundle.js
```

### Location Data Mocking (During Embargo Periods)
When official location data is embargoed but development/testing needs location coordinates:

```bash
# Mock 2025 camp locations from 2024 data
node src/cli/mock_locations.js \
  --source ../../data/2024/APIData/camp.json \
  --target ../../data/2025/APIData/APIData.bundle/camp.json \
  --output ../../data/2025/APIData/APIData.bundle/camp-mocked.json \
  --type camp

# Mock with different matching threshold (more permissive)
node src/cli/mock_locations.js -s 2024/camp.json -t 2025/camp.json -o 2025/camp-mocked.json --match-threshold 0.7

# Works with art and event data too
node src/cli/mock_locations.js -s 2024/art.json -t 2025/art.json -o 2025/art-mocked.json --type art
```

**Key Features**:
- Exact name matching with fuzzy fallback using Levenshtein distance
- Adds `location_mock: true` flag to identify simulated data
- Preserves original target year metadata (uid, description, etc.)
- Reports matching statistics and unmatched items
- Configurable similarity threshold for matching tolerance

### Vector Tile Generation
After generating GeoJSON files, create vector tiles for efficient mobile rendering:

```bash
# Install tippecanoe (macOS)
brew install tippecanoe

# Generate vector tiles from all GeoJSON files
tippecanoe --output=../../data/2025/Map/Resources/map.mbtiles -f \
  -L fence:../../data/2025/geo/fence.geojson \
  -L outline:../../data/2025/geo/outline.geojson \
  -L polygons:../../data/2025/geo/polygons.geojson \
  -L streets:../../data/2025/geo/streets.geojson \
  -L toilets:../../data/2025/geo/toilets.geojson \
  -L dmz:../../data/2025/geo/dmz.geojson \
  -z 14 \
  -Z 4 \
  -B0
```

### Individual Generation Commands
```bash
# Generate specific geometry types
node src/cli/layout.js -f [layout.json] -o [output.geojson] -t [streets|polygons|outline|fence|dmz]

# Generate toilets
node src/cli/toilet.js -f [layout.json] -t [toilet.json] -o [output.geojson]

# Mock location data from previous year (during embargo periods)
node src/cli/mock_locations.js -s [source.json] -t [target.json] -o [output.json] --type camp
```

## Architecture Overview

### Core Data Flow
1. **Layout Configuration** - JSON files define city geometry parameters (center, bearing, street positions)
2. **Generation Pipeline** - Creates radial "time" streets (12:00, 1:00, etc.) and concentric circular streets
3. **Geocoding** - Converts Burning Man addresses to coordinates using fuzzy matching
4. **Output** - Produces GeoJSON files for different geometry types

### Key Components

**CLI Entry Points (`src/cli/`)**
- `generate_all.js` - Master orchestration script for all city geometry
- `api.js` - Processes API JSON to add geocoded coordinates to records
- `layout.js` - Individual geometry type generation
- `mock_locations.js` - Mock location data from previous year for testing during embargo periods

**Geocoding System (`src/geocoder/`)**
- `geocoder.js` - Main geocoder with forward/reverse capabilities
- `forward.js` - Address string → coordinates with fuzzy matching
- `reverse.js` - Coordinates → address string
- `geocodeParser.js` - Parses various address formats (time/distance, intersections)

**City Layout Generation**
- `streetplanner.js` - Complex street grid generation (radial/circular patterns)
- `polygons.js` - Plaza polygons and city outline shapes
- `fence.js` - Perimeter fence geometry
- `toiletParser.js` - Toilet placement processing

**Utilities**
- `grid.js` - Coordinate transformations and grid calculations
- `clock.js` - Time-to-bearing conversions (Burning Man clock positions)
- `geo.js` - Geographic utility functions

### Address System
The geocoder handles Burning Man's unique addressing:
- **Time-based**: "3:00 & 500'" (radial position)
- **Street intersections**: "Esplanade & 6:00" (named streets with time)
- **Special locations**: "Center Camp Plaza", "9:00 Portal"
- **Distance-based**: "10:30 1200'" (direction with distance from center)

### Key Dependencies
- **Turf.js v3.x** - Core geospatial processing and GeoJSON manipulation
- **JSTS** - Advanced geometric operations and spatial analysis
- **Mathjs** - Mathematical calculations for coordinate transformations
- **Levenshtein** - Fuzzy string matching for geocoding tolerance

### Testing Approach
- **Tape.js** framework with TAP protocol and coverage reporting
- Comprehensive geocoding tests with known coordinate pairs
- Distance-based assertions using Turf.js measurements
- Test data includes realistic layout configurations

### Data Formats
**Input**: JSON layout files with city parameters, toilet/POI placement data, API data with location strings
**Output**: GeoJSON FeatureCollections for streets/polygons/points, enhanced API JSON with coordinates