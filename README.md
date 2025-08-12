## Black Rock City Planner [![Tests](https://github.com/iBurnApp/BlackRockCityPlanner/workflows/Tests/badge.svg?branch=master)](https://github.com/iBurnApp/BlackRockCityPlanner/actions)

This is a collection of command line tools and scripts that generate [GeoJSON](http://geojson.org/). The GeoJSON is then used in the [iBurn](https://iburnapp.com/) app.

### Geo Data Generator

#### What we can create:
 - The centerlines of all the streets inside the fence.
 - The trash fence pentagon.
 - All the plazas and portals.
 - An outline of all the streets at proper width combined with plazas and portals (used for good looking rendereing).
 - Toilets as points or polygons

#### What we can't create:
 - Gate Road
 - Camp polygons (can geocode addresses).
 - Art locations (can geocode addresses).
 - Locations of important POI like first-aid, ranger and ice.
 - Airport 

#### Install

`npm install` or `npm install -g`

#### Use

##### Generate all the files at once

`node src/cli/generate_all.js -d [SOMETHING]/iBurn-Data/data/2025`

##### Streets

`node src/cli/layout.js -f [layout file] -o [output file] -t [type]`

- layout file: path to the [layout file](https://github.com/Burning-Man-Earth/iBurn-Data/tree/master/data). Use the latest year to see the proper format.
- output file: (optional) The output GeoJSON destination. Results from [2016](https://github.com/Burning-Man-Earth/iBurn-Data/tree/master/data/2016/geo)
- type: `streets`, `polygons`, `outline`, `fence`, `dmz`

##### Toilets

`node src/cli/toilet.js -f [layout file] -t [toilet layout file] -o [output file]`

- layout file: path to the [layout file](https://github.com/Burning-Man-Earth/iBurn-Data/tree/master/data). Use the latest year to see the proper format.
- toilet layout file: path to the [toilet layout file](https://github.com/Burning-Man-Earth/iBurn-Data/blob/master/data/2016/layouts/toilet.json).
- output file: (optional) The output GeoJSON destination. Here are results for [2016](https://github.com/Burning-Man-Earth/iBurn-Data/blob/master/data/2016/geo/toilets.geojson)

#### API Data Sync

##### Fetch and Geocode Latest Data

This fetches the latest data from the Burning Man API and geocodes camp locations:

```bash
# Set your API key (get from api.burningman.org)
export BMORG_API_KEY=your-api-key-here

# Fetch all data and geocode camps
node src/cli/fetch_and_geocode.js \
  --year 2025 \
  --layout ../../data/2025/layouts/layout.json \
  --output ../../data/2025/APIData/APIData.bundle
```

**Options:**
- `-y, --year` - Year to fetch data for (e.g., 2025)
- `-l, --layout` - Path to layout.json file for geocoding
- `-o, --output` - Output directory for API data files

**What it does:**
1. Fetches camps, art, and events from api.burningman.org
2. Geocodes camps using their `location_string` field
3. Saves art and events as-is (already have coordinates)
4. Creates `update.json` with timestamps
5. Provides summary statistics

##### Manual Geocoding

This geocodes the a string in an API JSON file and outputs full API result + lat/lon.

`node src/cli/api.js -l [layout file] -f [API JSON] -k [key string to geocode] -o [output file]`
e.g.
```
node src/cli/api.js -l ../../data/2025/layouts/layout.json -f ../../data/2025/APIData/Resources/camp.json -k location_string -o ../../data/2025/APIData/Resources/camp-location.json
```

#### Mock Locations (During Embargo Periods)

When official location data is embargoed but development/testing needs location coordinates, this tool can copy location strings from a previous year and geocode them with the current year's layout for maximum accuracy.

**Recommended (with geocoding):**
```bash
node src/cli/mock_locations.js \
  --source ../../data/2024/APIData/camp.json \
  --target ../../data/2025/APIData/APIData.bundle/camp.json \
  --layout ../../data/2025/layouts/layout.json \
  --output ../../data/2025/APIData/APIData.bundle/camp-mocked.json \
  --type camp
```

**Legacy mode (copy GPS coordinates directly):**
```bash
node src/cli/mock_locations.js \
  --source ../../data/2024/APIData/camp.json \
  --target ../../data/2025/APIData/APIData.bundle/camp.json \
  --output ../../data/2025/APIData/APIData.bundle/camp-mocked.json \
  --use-geocoding false \
  --type camp
```

**Options:**
- `-s, --source` - Source JSON file with location data (e.g., 2024 camp.json)
- `-t, --target` - Target JSON file without location data (e.g., 2025 camp.json)  
- `-l, --layout` - Layout JSON file for geocoding (required for geocoding mode)
- `-o, --output` - Output file path for enhanced data
- `-m, --match-threshold` - Similarity score for fuzzy matching (0-1, default: 0.8)
- `-g, --use-geocoding` - Use geocoding instead of copying GPS coordinates (default: true)
- `--type` - Data type (supports: camp, art, event)

**Features:**
- **Geocoding Mode**: Copies location strings and geocodes with current year's layout
- **Intelligent Fallback**: Falls back to original coordinates when geocoding fails
- **Fuzzy Matching**: Uses Levenshtein distance for name matching
- **Comprehensive Reporting**: Statistics on both matching and geocoding success rates
- **Unit Tested**: Full test coverage with real data samples

### [Geocoder](src/geocoder/readme.md)
