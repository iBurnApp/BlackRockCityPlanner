var fs = require('fs');
var levenshtein = require('levenshtein');
var Geocoder = require('../geocoder/geocoder.js');

var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "source": path,
        "target": path,
        "output": path,
        "layout": path,
        "type": String,
        "match-threshold": Number,
        "use-geocoding": Boolean,
        "help": Boolean
    },
    shortHands = {
        "s": ["--source"],
        "t": ["--target"],
        "o": ["--output"],
        "l": ["--layout"],
        "h": ["--help"],
        "m": ["--match-threshold"],
        "g": ["--use-geocoding"]
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

function showHelp() {
    console.log(`
Usage: node mock_locations.js [options]

Mock location data by copying location strings from a source year and geocoding them 
for the target year, or optionally copying GPS coordinates directly.

Options:
  -s, --source PATH         Source JSON file with location data (e.g., 2024 camp.json)
  -t, --target PATH         Target JSON file without location data (e.g., 2025 camp.json)
  -o, --output PATH         Output file path for enhanced data
  -l, --layout PATH         Layout JSON file for geocoding (required for --use-geocoding)
  -m, --match-threshold NUM Minimum similarity score for fuzzy matching (0-1, default: 0.8)
  -g, --use-geocoding       Use geocoding instead of copying GPS coordinates (default: true)
  --type STRING            Data type (currently supports: camp, art, event)
  -h, --help               Show this help message

Examples:
  # Mock 2025 camp locations with geocoding (recommended)
  node mock_locations.js \\
    --source ../../data/2024/APIData/camp.json \\
    --target ../../data/2025/APIData/APIData.bundle/camp.json \\
    --layout ../../data/2025/layouts/layout.json \\
    --output ../../data/2025/APIData/APIData.bundle/camp-mocked.json \\
    --type camp

  # Use legacy mode (copy GPS coordinates directly)
  node mock_locations.js \\
    --source ../../data/2024/APIData/camp.json \\
    --target ../../data/2025/APIData/APIData.bundle/camp.json \\
    --output ../../data/2025/APIData/APIData.bundle/camp-mocked.json \\
    --use-geocoding false \\
    --type camp

  # Use more permissive matching threshold
  node mock_locations.js -s 2024/camp.json -t 2025/camp.json -l 2025/layout.json -o 2025/camp-mocked.json --match-threshold 0.7
`);
}

// Default values
var useGeocoding = parsed['use-geocoding'] !== false; // Default to true
var matchThreshold = parsed['match-threshold'] || 0.8;
var dataType = parsed.type || 'camp';

if (parsed.help || !parsed.source || !parsed.target) {
    showHelp();
    process.exit(parsed.help ? 0 : 1);
}

// Validate layout parameter when using geocoding
if (useGeocoding && !parsed.layout) {
    console.error('Error: --layout parameter is required when using geocoding mode');
    console.error('Use --use-geocoding false to disable geocoding and copy GPS coordinates directly');
    showHelp();
    process.exit(1);
}

// Read source and target data
var sourceData, targetData, layoutData, geocoder;
try {
    sourceData = JSON.parse(fs.readFileSync(parsed.source, 'utf8'));
    targetData = JSON.parse(fs.readFileSync(parsed.target, 'utf8'));
    
    // Initialize geocoder if using geocoding mode
    if (useGeocoding) {
        layoutData = JSON.parse(fs.readFileSync(parsed.layout, 'utf8'));
        geocoder = new Geocoder(layoutData);
        console.log('Geocoder initialized with layout file:', parsed.layout);
    }
} catch (error) {
    console.error('Error reading input files:', error.message);
    process.exit(1);
}

console.log(`Processing ${dataType} data...`);
console.log(`Source: ${sourceData.length} items with location data`);
console.log(`Target: ${targetData.length} items without location data`);
console.log(`Match threshold: ${matchThreshold}`);
console.log(`Geocoding mode: ${useGeocoding ? 'enabled' : 'disabled (copying GPS coordinates)'}`);

/**
 * Calculate similarity score between two strings using Levenshtein distance
 * Returns a score from 0 (no match) to 1 (exact match)
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    var s1 = str1.toLowerCase().trim();
    var s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    var distance = levenshtein(s1, s2);
    var maxLength = Math.max(s1.length, s2.length);
    
    return maxLength === 0 ? 0 : 1 - (distance / maxLength);
}

/**
 * Find the best match for a target item in the source data
 */
function findBestMatch(targetItem, sourceData) {
    var bestMatch = null;
    var bestScore = 0;
    
    for (var i = 0; i < sourceData.length; i++) {
        var sourceItem = sourceData[i];
        
        // Skip if source item doesn't have location data
        if (!sourceItem.location || !sourceItem.location_string) {
            continue;
        }
        
        var score = calculateSimilarity(targetItem.name, sourceItem.name);
        
        if (score > bestScore && score >= matchThreshold) {
            bestScore = score;
            bestMatch = {
                item: sourceItem,
                score: score
            };
        }
    }
    
    return bestMatch;
}

/**
 * Copy location data from source to target item with optional geocoding
 */
function copyLocationData(targetItem, sourceItem, useGeocoding, geocoder) {
    var result = {
        geocoded: false,
        fallback: false,
        error: null
    };
    
    // Copy location string first
    targetItem.location_string = sourceItem.location_string;
    
    if (useGeocoding && geocoder && sourceItem.location_string) {
        try {
            // Attempt to geocode the location string
            var geocodedPoint = geocoder.forward(sourceItem.location_string);
            
            if (geocodedPoint && geocodedPoint.geometry && geocodedPoint.geometry.coordinates) {
                // Create new location object with geocoded coordinates
                targetItem.location = {
                    string: sourceItem.location_string,
                    gps_latitude: geocodedPoint.geometry.coordinates[1],
                    gps_longitude: geocodedPoint.geometry.coordinates[0]
                };
                
                // Copy other location metadata if available (preserve structure)
                if (sourceItem.location) {
                    if (sourceItem.location.frontage) targetItem.location.frontage = sourceItem.location.frontage;
                    if (sourceItem.location.intersection) targetItem.location.intersection = sourceItem.location.intersection;
                    if (sourceItem.location.intersection_type) targetItem.location.intersection_type = sourceItem.location.intersection_type;
                    if (sourceItem.location.dimensions) targetItem.location.dimensions = sourceItem.location.dimensions;
                    if (sourceItem.location.exact_location) targetItem.location.exact_location = sourceItem.location.exact_location;
                }
                
                result.geocoded = true;
                console.log(`  Geocoded: "${sourceItem.location_string}" -> [${targetItem.location.gps_latitude.toFixed(6)}, ${targetItem.location.gps_longitude.toFixed(6)}]`);
            } else {
                throw new Error('Geocoding returned no result');
            }
        } catch (error) {
            result.error = error.message;
            console.log(`  Geocoding failed for "${sourceItem.location_string}": ${error.message}`);
            
            // Fall back to copying original coordinates if available
            if (sourceItem.location && sourceItem.location.gps_latitude && sourceItem.location.gps_longitude) {
                targetItem.location = JSON.parse(JSON.stringify(sourceItem.location));
                result.fallback = true;
                console.log(`  Using fallback coordinates: [${targetItem.location.gps_latitude}, ${targetItem.location.gps_longitude}]`);
            } else {
                console.log(`  No fallback coordinates available`);
            }
        }
    } else {
        // Legacy mode: just copy the location object
        if (sourceItem.location) {
            targetItem.location = JSON.parse(JSON.stringify(sourceItem.location));
        }
    }
    
    // Add mock flags to indicate this is simulated data
    targetItem.location_mock = true;
    targetItem.location_mock_source = sourceItem.name;
    
    if (useGeocoding) {
        targetItem.location_mock_geocoded = result.geocoded;
        if (result.fallback) targetItem.location_mock_fallback = true;
        if (result.error) targetItem.location_mock_error = result.error;
    }
    
    return result;
}

// Process matching
var results = [];
var matchStats = {
    exactMatches: 0,
    fuzzyMatches: 0,
    noMatches: 0,
    totalProcessed: 0,
    geocodingSuccessful: 0,
    geocodingFailed: 0,
    geocodingFallback: 0
};

targetData.forEach(function(targetItem) {
    matchStats.totalProcessed++;
    
    // Clean up any null/undefined fields
    for (var key in targetItem) {
        if (targetItem[key] === null || targetItem[key] === undefined) {
            delete targetItem[key];
        }
    }
    
    var match = findBestMatch(targetItem, sourceData);
    
    if (match) {
        if (match.score === 1) {
            matchStats.exactMatches++;
            console.log(`Exact match: "${targetItem.name}" -> "${match.item.name}"`);
        } else {
            matchStats.fuzzyMatches++;
            console.log(`Fuzzy match: "${targetItem.name}" -> "${match.item.name}" (score: ${match.score.toFixed(3)})`);
        }
        
        var geocodingResult = copyLocationData(targetItem, match.item, useGeocoding, geocoder);
        
        // Update geocoding statistics
        if (useGeocoding) {
            if (geocodingResult.geocoded) {
                matchStats.geocodingSuccessful++;
            } else if (geocodingResult.fallback) {
                matchStats.geocodingFallback++;
            } else {
                matchStats.geocodingFailed++;
            }
        }
    } else {
        matchStats.noMatches++;
        console.log(`No match found for: "${targetItem.name}"`);
    }
    
    results.push(targetItem);
});

// Print statistics
console.log('\n=== Matching Statistics ===');
console.log(`Total processed: ${matchStats.totalProcessed}`);
console.log(`Exact matches: ${matchStats.exactMatches}`);
console.log(`Fuzzy matches: ${matchStats.fuzzyMatches}`);
console.log(`No matches: ${matchStats.noMatches}`);
console.log(`Success rate: ${((matchStats.exactMatches + matchStats.fuzzyMatches) / matchStats.totalProcessed * 100).toFixed(1)}%`);

if (useGeocoding) {
    console.log('\n=== Geocoding Statistics ===');
    console.log(`Geocoding successful: ${matchStats.geocodingSuccessful}`);
    console.log(`Geocoding failed (used fallback): ${matchStats.geocodingFallback}`);
    console.log(`Geocoding failed (no coordinates): ${matchStats.geocodingFailed}`);
    var totalWithMatches = matchStats.exactMatches + matchStats.fuzzyMatches;
    if (totalWithMatches > 0) {
        console.log(`Geocoding success rate: ${(matchStats.geocodingSuccessful / totalWithMatches * 100).toFixed(1)}%`);
    }
}

// Write output
var outputPath = parsed.output || parsed.target.replace('.json', '-mocked.json');

try {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nOutput written to: ${outputPath}`);
} catch (error) {
    console.error('Error writing output file:', error.message);
    process.exit(1);
}