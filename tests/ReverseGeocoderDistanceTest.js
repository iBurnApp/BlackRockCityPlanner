var test = require('tape');
var Geocoder = require('../src/geocoder/geocoder.js');
var layout2025 = require('./layout2025.json');
var turf = require('@turf/turf');
var utils = require('../src/utils.js');

test('Distance calculations use correct units (miles not kilometers)', function(t) {
    var coder = new Geocoder(layout2025);
    
    // Test known locations with their expected distances from the Man
    var testCases = [
        // ARTery should be about 2400' from the Man
        { location: "10:30 & 2400'", expectedFeet: 2400, tolerance: 50 },
        // Point 2 should be about 8337' from the Man
        { location: "3:00 & 8337'", expectedFeet: 8337, tolerance: 50 },
        // Test various distances
        { location: "6:00 & 1500'", expectedFeet: 1500, tolerance: 50 },
        { location: "9:00 & 2300'", expectedFeet: 2300, tolerance: 50 },
        { location: "12:00 & 500'", expectedFeet: 500, tolerance: 50 },
        { location: "4:30 & 1000'", expectedFeet: 1000, tolerance: 50 }
    ];
    
    testCases.forEach(function(testCase) {
        // Forward geocode the location
        var point = coder.forward(testCase.location);
        if (!point) {
            t.fail("Could not forward geocode: " + testCase.location);
            return;
        }
        
        // Calculate distance from the Man
        var distance = turf.distance(point, layout2025.center, {units: 'miles'});
        var calculatedFeet = Math.round(utils.milesToFeet(distance));
        
        // Check if the distance is correct (not multiplied by 1.6)
        var difference = Math.abs(calculatedFeet - testCase.expectedFeet);
        t.ok(difference <= testCase.tolerance, 
             testCase.location + " should be ~" + testCase.expectedFeet + "' from Man, " +
             "calculated: " + calculatedFeet + "' (diff: " + difference + "')");
    });
    
    t.end();
});

test('Reverse geocode distances match forward geocode', function(t) {
    var coder = new Geocoder(layout2025);
    
    var testLocations = [
        "10:30 & 2400'",
        "3:00 & 1500'", 
        "6:00 & 2000'",
        "9:00 & 3000'",
        "12:00 & 500'"
    ];
    
    testLocations.forEach(function(originalLocation) {
        // Forward geocode to get coordinates
        var point = coder.forward(originalLocation);
        if (!point) {
            t.fail("Could not forward geocode: " + originalLocation);
            return;
        }
        
        // Reverse geocode back to location string
        var reverseLocation = coder.reverse(
            point.geometry.coordinates[1], 
            point.geometry.coordinates[0]
        );
        
        // Extract distance from reverse geocoded string
        var match = reverseLocation.match(/(\d+)'/);
        if (match) {
            var reverseFeet = parseInt(match[1]);
            
            // Extract expected distance from original
            var expectedMatch = originalLocation.match(/(\d+)'/);
            if (expectedMatch) {
                var expectedFeet = parseInt(expectedMatch[1]);
                
                // Allow some tolerance due to rounding
                var difference = Math.abs(reverseFeet - expectedFeet);
                t.ok(difference <= 10, 
                     "Reverse geocode of " + originalLocation + " returned: " + reverseLocation + 
                     " (difference: " + difference + " feet)");
            }
        }
    });
    
    t.end();
});

test('turf.distance with old vs new syntax', function(t) {
    // This test validates that we're using the correct turf v7 syntax
    var point1 = turf.point([-119.2133, 40.7864]);
    var point2 = turf.point([-119.2033, 40.7864]);
    
    // Old syntax (returns kilometers in turf v7, even when 'miles' is specified)
    var distanceOldSyntax = turf.distance(point1, point2, 'miles');
    
    // New syntax (correctly returns miles)
    var distanceNewSyntax = turf.distance(point1, point2, {units: 'miles'});
    
    // The ratio should be ~1.609 (km to miles conversion)
    var ratio = distanceOldSyntax / distanceNewSyntax;
    
    t.ok(Math.abs(ratio - 1.609344) < 0.01, 
         "Old syntax returns kilometers (ratio should be ~1.609): " + ratio.toFixed(3));
    
    // Verify the new syntax returns the correct value in miles
    t.ok(distanceNewSyntax < distanceOldSyntax, 
         "New syntax should return smaller value (miles < km)");
    
    t.end();
});

test('Verify no 1.6x multiplication in playa distances', function(t) {
    var coder = new Geocoder(layout2025);
    
    // Test coordinates that are at known distances
    // These are approximate coordinates for testing
    var testPoints = [
        { 
            lat: 40.788, 
            lon: -119.206,
            maxExpectedFeet: 3000  // Should be less than 3000' from Man
        },
        { 
            lat: 40.790, 
            lon: -119.203,
            maxExpectedFeet: 4000  // Should be less than 4000' from Man
        }
    ];
    
    testPoints.forEach(function(testPoint) {
        var reverseResult = coder.reverse(testPoint.lat, testPoint.lon);
        
        // Extract distance from result
        var match = reverseResult.match(/(\d+)'/);
        if (match) {
            var feet = parseInt(match[1]);
            
            // Check that it's not multiplied by 1.6
            t.ok(feet < testPoint.maxExpectedFeet, 
                 "Distance at (" + testPoint.lat + ", " + testPoint.lon + ") " +
                 "should be < " + testPoint.maxExpectedFeet + "', got: " + feet + "'");
            
            // Also check it's not the 1.6x inflated value
            var inflatedValue = Math.round(testPoint.maxExpectedFeet * 1.6);
            t.ok(feet < inflatedValue / 2, 
                 "Distance should not be inflated by 1.6x");
        }
    });
    
    t.end();
});