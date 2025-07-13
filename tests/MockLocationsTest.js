var test = require('tape');
var turf = require('@turf/turf');
var Geocoder = require('../src/geocoder/geocoder');
var levenshtein = require('levenshtein');

var layout = require('./layout2025.json');

// Test data extracted from real 2024 camp data (source with coordinates)
var sourceData = [
    {
        "uid": "a1XVI000001ztyH2AQ",
        "year": 2024,
        "name": "Mindless Movement",
        "hometown": "Salt Lake City",
        "description": "Come empty your mind and be intentionally aware of the present moment via embodied play with our many mental wellness mindLess movement activities and toys.",
        "landmark": "\"Mindless Movement\" sign, yellow/green surfboard",
        "location": {
            "string": "D & 3:45",
            "frontage": "D",
            "intersection": "3:45",
            "intersection_type": "&",
            "dimensions": "150 x 50",
            "exact_location": "Mid-block facing man",
            "gps_latitude": 40.77739788580608,
            "gps_longitude": -119.1988706062086
        },
        "location_string": "D & 3:45"
    },
    {
        "uid": "a1XVI000001yDxt2AE", 
        "year": 2024,
        "name": "Dark Sparkle",
        "hometown": "Davis",
        "description": "Dark Sparkle is your call to the mysterious, your insatiable drive of self-expression.",
        "landmark": "Large Dark Sparkle banner, lit at night",
        "location": {
            "string": "E & 8:15",
            "frontage": "E",
            "intersection": "8:15", 
            "intersection_type": "&",
            "dimensions": "150 x 100",
            "exact_location": "Mid-block facing mountain",
            "gps_latitude": 40.79122068558773,
            "gps_longitude": -119.21767999965927
        },
        "location_string": "E & 8:15"
    },
    {
        "uid": "a1XVI000001zwkr2AA",
        "year": 2024,
        "name": "Quarks and Recreation",
        "contact_email": "scientistsvseveryone@agnostica.com",
        "hometown": "Berkeley, CA",
        "description": "Games for Progress! Play! Scientists vs. Jabberwocks!",
        "landmark": "Parklet w/ green \"grass\" and rad waste burn barrel",
        "location": {
            "string": "D & 6:45",
            "frontage": "D",
            "intersection": "6:45",
            "intersection_type": "&",
            "dimensions": "200 x 100",
            "exact_location": "Mid-block facing mountain",
            "gps_latitude": 40.784218854836354,
            "gps_longitude": -119.2140709504653
        },
        "location_string": "D & 6:45"
    },
    {
        "uid": "test_no_coords",
        "year": 2024,
        "name": "Test Camp No Coords",
        "hometown": "Test City",
        "description": "Camp for testing fallback behavior",
        "location": {
            "string": "Invalid Location String",
            "frontage": null,
            "intersection": null,
            "intersection_type": null
        },
        "location_string": "Invalid Location String"
    }
];

// Test data extracted from real 2025 camp data (target without coordinates)
var targetData = [
    {
        "uid": "a1XVI000008yf262AA",
        "name": "Mindless Movement", // Exact match
        "year": 2025,
        "url": null,
        "contact_email": "test@example.com",
        "hometown": "Salt Lake City",
        "description": "Come empty your mind and be intentionally aware of the present moment.",
        "landmark": "\"Mindless Movement\" sign",
        "location": null,
        "location_string": null
    },
    {
        "uid": "a1XVI000008zNKs2AM",
        "name": "Dark Sparkles", // Fuzzy match (missing 's')
        "year": 2025,
        "url": null,
        "contact_email": "test2@example.com",
        "hometown": "Davis Area",
        "description": "Dark Sparkles is your call to the mysterious.",
        "landmark": "Large banner, lit at night", 
        "location": null,
        "location_string": null
    },
    {
        "uid": "a1XVI000008zSaf2AE",
        "name": "Completely Different Camp", // No match
        "year": 2025,
        "url": null,
        "contact_email": "nomatch@example.com",
        "hometown": "Unknown",
        "description": "This camp has no match in the source data.",
        "landmark": "Unique landmark",
        "location": null,
        "location_string": null
    },
    {
        "uid": "test_fallback",
        "name": "Test Camp No Coords", // Exact match but should trigger fallback
        "year": 2025,
        "description": "Should match but geocoding will fail",
        "location": null,
        "location_string": null
    }
];

/**
 * Calculate similarity score between two strings using Levenshtein distance
 * (Copy of function from mock_locations.js for testing)
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
 * (Copy of function from mock_locations.js for testing)
 */
function findBestMatch(targetItem, sourceData, matchThreshold) {
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
 * Copy location data from source to target item with geocoding
 * (Adapted from mock_locations.js for testing)
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
                
                // Copy other location metadata if available
                if (sourceItem.location) {
                    if (sourceItem.location.frontage) targetItem.location.frontage = sourceItem.location.frontage;
                    if (sourceItem.location.intersection) targetItem.location.intersection = sourceItem.location.intersection;
                    if (sourceItem.location.intersection_type) targetItem.location.intersection_type = sourceItem.location.intersection_type;
                    if (sourceItem.location.dimensions) targetItem.location.dimensions = sourceItem.location.dimensions;
                    if (sourceItem.location.exact_location) targetItem.location.exact_location = sourceItem.location.exact_location;
                }
                
                result.geocoded = true;
            } else {
                throw new Error('Geocoding returned no result');
            }
        } catch (error) {
            result.error = error.message;
            
            // Fall back to copying original coordinates if available
            if (sourceItem.location && sourceItem.location.gps_latitude && sourceItem.location.gps_longitude) {
                targetItem.location = JSON.parse(JSON.stringify(sourceItem.location));
                result.fallback = true;
            }
        }
    } else {
        // Legacy mode: just copy the location object
        if (sourceItem.location) {
            targetItem.location = JSON.parse(JSON.stringify(sourceItem.location));
        }
    }
    
    // Add mock flags
    targetItem.location_mock = true;
    targetItem.location_mock_source = sourceItem.name;
    
    if (useGeocoding) {
        targetItem.location_mock_geocoded = result.geocoded;
        if (result.fallback) targetItem.location_mock_fallback = true;
        if (result.error) targetItem.location_mock_error = result.error;
    }
    
    return result;
}

test("Geocoder Initialization", function(t) {
    var geocoder = new Geocoder(layout);
    t.ok(geocoder, "Geocoder should initialize with layout");
    
    // Test basic geocoding works
    var point = geocoder.forward("D & 3:45");
    t.ok(point, "Should geocode basic location string");
    t.ok(point.geometry, "Result should have geometry");
    t.ok(point.geometry.coordinates, "Result should have coordinates");
    
    t.end();
});

test("Mock Locations - Exact Name Matching", function(t) {
    var geocoder = new Geocoder(layout);
    var matchThreshold = 0.8;
    
    // Test exact match: "Mindless Movement"
    var targetItem = JSON.parse(JSON.stringify(targetData[0])); // Deep copy
    var match = findBestMatch(targetItem, sourceData, matchThreshold);
    
    t.ok(match, "Should find match for exact name");
    t.equal(match.score, 1, "Exact match should have score of 1");
    t.equal(match.item.name, "Mindless Movement", "Should match correct source item");
    
    // Test geocoding with exact match
    var result = copyLocationData(targetItem, match.item, true, geocoder);
    
    t.ok(result.geocoded, "Should successfully geocode location string");
    t.equal(targetItem.location_string, "D & 3:45", "Should copy location string");
    t.ok(targetItem.location, "Should create location object");
    t.ok(targetItem.location.gps_latitude, "Should have latitude");
    t.ok(targetItem.location.gps_longitude, "Should have longitude");
    t.ok(targetItem.location_mock, "Should mark as mock data");
    t.equal(targetItem.location_mock_source, "Mindless Movement", "Should record source");
    
    t.end();
});

test("Mock Locations - Fuzzy Name Matching", function(t) {
    var matchThreshold = 0.8;
    
    // Test fuzzy match: "Dark Sparkles" -> "Dark Sparkle"
    var targetItem = JSON.parse(JSON.stringify(targetData[1])); // Deep copy
    var match = findBestMatch(targetItem, sourceData, matchThreshold);
    
    t.ok(match, "Should find fuzzy match");
    t.ok(match.score > 0.8 && match.score < 1, "Fuzzy match should have score between 0.8 and 1");
    t.equal(match.item.name, "Dark Sparkle", "Should match 'Dark Sparkle' source item");
    
    // Verify the similarity calculation
    var expectedScore = calculateSimilarity("Dark Sparkles", "Dark Sparkle");
    t.equal(match.score, expectedScore, "Score should match manual calculation");
    
    t.end();
});

test("Mock Locations - No Match Found", function(t) {
    var matchThreshold = 0.8;
    
    // Test no match: "Completely Different Camp"
    var targetItem = JSON.parse(JSON.stringify(targetData[2])); // Deep copy
    var match = findBestMatch(targetItem, sourceData, matchThreshold);
    
    t.notOk(match, "Should not find match for completely different name");
    
    t.end();
});

test("Mock Locations - Coordinate Bounds Validation", function(t) {
    var geocoder = new Geocoder(layout);
    
    // Black Rock City coordinate bounds (approximate)
    var minLat = 40.77;
    var maxLat = 40.80;
    var minLon = -119.23;
    var maxLon = -119.18;
    
    // Test multiple location strings to ensure coordinates are within BRC
    var testLocations = ["D & 3:45", "E & 8:15", "D & 6:45"];
    
    testLocations.forEach(function(locationString) {
        var point = geocoder.forward(locationString);
        if (point && point.geometry && point.geometry.coordinates) {
            var lon = point.geometry.coordinates[0];
            var lat = point.geometry.coordinates[1];
            
            t.ok(lat >= minLat && lat <= maxLat, 
                "Latitude " + lat + " should be within BRC bounds for " + locationString);
            t.ok(lon >= minLon && lon <= maxLon, 
                "Longitude " + lon + " should be within BRC bounds for " + locationString);
        }
    });
    
    t.end();
});

test("Mock Locations - Geocoding Fallback Behavior", function(t) {
    var geocoder = new Geocoder(layout);
    
    // Test item with invalid location string but valid coordinates
    var targetItem = JSON.parse(JSON.stringify(targetData[3])); // Deep copy
    var match = findBestMatch(targetItem, sourceData, 0.8);
    
    t.ok(match, "Should find match for test camp");
    t.equal(match.item.name, "Test Camp No Coords", "Should match test camp");
    
    // This should fail geocoding and have no fallback coordinates
    var result = copyLocationData(targetItem, match.item, true, geocoder);
    
    t.notOk(result.geocoded, "Should fail to geocode invalid location string");
    t.notOk(result.fallback, "Should not have fallback coordinates");
    t.ok(result.error, "Should have error message");
    t.ok(targetItem.location_mock_error, "Should record error in target item");
    
    t.end();
});

test("Mock Locations - Legacy Mode (Copy Coordinates)", function(t) {
    var geocoder = new Geocoder(layout);
    
    // Test exact match with legacy mode (no geocoding)
    var targetItem = JSON.parse(JSON.stringify(targetData[0])); // Deep copy  
    var match = findBestMatch(targetItem, sourceData, 0.8);
    
    var result = copyLocationData(targetItem, match.item, false, geocoder); // useGeocoding = false
    
    t.notOk(result.geocoded, "Should not attempt geocoding in legacy mode");
    t.notOk(result.fallback, "Should not use fallback in legacy mode");
    t.ok(targetItem.location, "Should copy location object");
    t.equal(targetItem.location.gps_latitude, 40.77739788580608, "Should copy original latitude");
    t.equal(targetItem.location.gps_longitude, -119.1988706062086, "Should copy original longitude");
    t.equal(targetItem.location_string, "D & 3:45", "Should copy location string");
    
    t.end();
});

test("Mock Locations - Full Pipeline Statistics", function(t) {
    var geocoder = new Geocoder(layout);
    var matchThreshold = 0.8;
    
    var stats = {
        exactMatches: 0,
        fuzzyMatches: 0, 
        noMatches: 0,
        totalProcessed: 0,
        geocodingSuccessful: 0,
        geocodingFailed: 0,
        geocodingFallback: 0
    };
    
    var results = [];
    
    // Process all target items like the real script
    targetData.forEach(function(targetItem) {
        stats.totalProcessed++;
        var processedItem = JSON.parse(JSON.stringify(targetItem)); // Deep copy
        
        var match = findBestMatch(processedItem, sourceData, matchThreshold);
        
        if (match) {
            if (match.score === 1) {
                stats.exactMatches++;
            } else {
                stats.fuzzyMatches++;
            }
            
            var geocodingResult = copyLocationData(processedItem, match.item, true, geocoder);
            
            if (geocodingResult.geocoded) {
                stats.geocodingSuccessful++;
            } else if (geocodingResult.fallback) {
                stats.geocodingFallback++;
            } else {
                stats.geocodingFailed++;
            }
        } else {
            stats.noMatches++;
        }
        
        results.push(processedItem);
    });
    
    // Validate statistics
    t.equal(stats.totalProcessed, 4, "Should process all 4 target items");
    t.equal(stats.exactMatches, 2, "Should have 2 exact matches (Mindless Movement, Test Camp)");
    t.equal(stats.fuzzyMatches, 1, "Should have 1 fuzzy match (Dark Sparkles)");
    t.equal(stats.noMatches, 1, "Should have 1 no match (Completely Different Camp)");
    
    var totalWithMatches = stats.exactMatches + stats.fuzzyMatches;
    t.equal(totalWithMatches, 3, "Should have 3 total matches");
    
    // Geocoding stats (will vary based on what actually works)
    t.ok(stats.geocodingSuccessful >= 2, "Should have at least 2 successful geocoding results");
    t.equal(stats.geocodingSuccessful + stats.geocodingFailed + stats.geocodingFallback, totalWithMatches, 
        "All matched items should have geocoding results");
    
    // Validate result structure
    t.equal(results.length, 4, "Should return all processed items");
    
    // Check that matched items have proper mock flags
    results.forEach(function(item) {
        if (item.location_mock) {
            t.ok(item.location_mock_source, "Mock items should have source attribution");
            t.ok(typeof item.location_mock_geocoded === 'boolean', "Should have geocoding flag");
        }
    });
    
    t.end();
});