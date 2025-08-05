var test = require('tap').test;
var Geocoder = require('../src/geocoder/geocoder.js');
var turf = require('@turf/turf');
var layout = require('../../../data/2025/layouts/layout.json');

test('Plaza Geocoding - Camp Addresses', function(t) {
    var coder = new Geocoder(layout);
    
    // Test cases with obfuscated camp names
    var plazaCamps = [
        {
            name: "Test Camp Alpha",
            address: "4:30 G Plaza @ 2:15",
            expectedPlaza: "4:30 G Plaza",
            expectedTime: "2:15"
        },
        {
            name: "Test Camp Beta", 
            address: "4:30 G Plaza @ 7:00",
            expectedPlaza: "4:30 G Plaza",
            expectedTime: "7:00"
        },
        {
            name: "Test Camp Gamma",
            address: "4:30 B Plaza @ 1:00",
            expectedPlaza: "4:30 B Plaza",
            expectedTime: "1:00"
        },
        {
            name: "Test Camp Delta",
            address: "4:30 G Plaza @ 5:15",
            expectedPlaza: "4:30 G Plaza",
            expectedTime: "5:15"
        },
        {
            name: "Test Camp Epsilon",
            address: "4:30 B Plaza @ 7:00",
            expectedPlaza: "4:30 B Plaza",
            expectedTime: "7:00"
        },
        {
            name: "Test Camp Zeta",
            address: "7:30 G Plaza @ 10:30",
            expectedPlaza: "7:30 G Plaza",
            expectedTime: "10:30"
        }
    ];
    
    plazaCamps.forEach(function(camp) {
        var result = coder.forward(camp.address);
        t.ok(result, camp.name + " should geocode: " + camp.address);
        
        if (result) {
            // Verify it returns valid coordinates within city bounds
            t.ok(result.geometry.coordinates[0] < -119.18 && result.geometry.coordinates[0] > -119.23, 
                camp.name + " longitude should be within city bounds");
            t.ok(result.geometry.coordinates[1] > 40.77 && result.geometry.coordinates[1] < 40.81, 
                camp.name + " latitude should be within city bounds");
            
            // Log bearing for debugging
            var cityCenter = layout.center;
            var bearingToResult = turf.bearing(cityCenter, result);
            t.comment(camp.name + " bearing: " + bearingToResult + "° for " + camp.address);
        }
    });
    
    t.end();
});

test('Plaza Distance Validation - Camps at correct radial distance', function(t) {
    var coder = new Geocoder(layout);
    var manCenter = layout.center;
    
    // Get street distances from layout
    var bStreetDistance = 3220; // feet - from layout
    var gStreetDistance = 4825; // feet - from layout
    var plazaRadius = 100; // feet - half of 200 feet diameter from layout
    
    // Test cases: camps at G Plaza should be ~4825 feet from Man
    var gPlazaCamps = [
        { name: "Test Camp G1", address: "4:30 G Plaza @ 2:15" },
        { name: "Test Camp G2", address: "4:30 G Plaza @ 7:00" },
        { name: "Test Camp G3", address: "7:30 G Plaza @ 10:30" },
        { name: "Test Camp G4", address: "3:00 G Plaza @ 3:30" }
    ];
    
    gPlazaCamps.forEach(function(camp) {
        var result = coder.forward(camp.address);
        t.ok(result, camp.name + " should geocode");
        
        if (result) {
            var distance = turf.distance(manCenter, result, {units: 'feet'});
            var expectedDistance = gStreetDistance;
            var tolerance = plazaRadius + 50; // Allow for plaza radius plus some tolerance
            
            t.ok(Math.abs(distance - expectedDistance) < tolerance,
                camp.name + " should be at G street distance (~" + expectedDistance + " feet). " +
                "Actual: " + distance.toFixed(0) + " feet");
        }
    });
    
    // Test cases: camps at B Plaza should be ~3220 feet from Man
    var bPlazaCamps = [
        { name: "Test Camp B1", address: "4:30 B Plaza @ 1:00" },
        { name: "Test Camp B2", address: "4:30 B Plaza @ 7:00" },
        { name: "Test Camp B3", address: "7:30 B Plaza @ 3:45" },
        { name: "Test Camp B4", address: "3:00 B Plaza @ 2:00" }
    ];
    
    bPlazaCamps.forEach(function(camp) {
        var result = coder.forward(camp.address);
        t.ok(result, camp.name + " should geocode");
        
        if (result) {
            var distance = turf.distance(manCenter, result, {units: 'feet'});
            var expectedDistance = bStreetDistance;
            var tolerance = plazaRadius + 50;
            
            t.ok(Math.abs(distance - expectedDistance) < tolerance,
                camp.name + " should be at B street distance (~" + expectedDistance + " feet). " +
                "Actual: " + distance.toFixed(0) + " feet");
        }
    });
    
    t.end();
});

test('Plaza Geocoding - All Plaza Formats', function(t) {
    var coder = new Geocoder(layout);
    
    // Test all plaza types defined in layout
    var allPlazas = [
        // B Street Plazas
        { plaza: "9:00 B Plaza", times: ["1:00", "5:00", "8:15", "9:45"] },
        { plaza: "3:00 B Plaza", times: ["2:00", "3:45", "4:30", "12:45"] },
        { plaza: "4:30 B Plaza", times: ["1:00", "7:00", "8:15", "9:45"] },
        { plaza: "7:30 B Plaza", times: ["3:45", "5:15", "6:45", "9:45", "10:45"] },
        
        // G Street Plazas  
        { plaza: "3:00 G Plaza", times: ["2:00", "3:30", "7:00", "8:30", "11:15", "12:45"] },
        { plaza: "4:30 G Plaza", times: ["2:15", "4:00", "5:15", "7:00", "8:15", "9:45", "11:00"] },
        { plaza: "7:30 G Plaza", times: ["2:30", "4:30", "7:30", "9:15", "10:30"] },
        { plaza: "9:00 G Plaza", times: ["1:00", "6:45", "8:15"] },
        { plaza: "6:00 G Plaza", times: ["2:00", "3:45", "8:15", "9:45"] },
        
        // Center Camp Plaza
        { plaza: "Center Camp Plaza", times: ["1:00", "1:30", "1:45", "3:30", "4:45", "5:45", "6:45", "7:00", "7:30", "9:00", "9:15", "10:45", "12:30"] }
    ];
    
    allPlazas.forEach(function(plazaData) {
        plazaData.times.forEach(function(time) {
            var address = plazaData.plaza + " @ " + time;
            var result = coder.forward(address);
            t.ok(result, "Should geocode: " + address);
            
            if (result) {
                // Check coordinates are valid - with wider bounds for edge plazas
                t.ok(result.geometry.coordinates[0] < -119.18 && result.geometry.coordinates[0] > -119.23, 
                    address + " longitude should be within city bounds");
                t.ok(result.geometry.coordinates[1] > 40.77 && result.geometry.coordinates[1] < 40.81, 
                    address + " latitude should be within city bounds");
            }
        });
    });
    
    t.end();
});

test('Plaza Geocoding - Different Separators', function(t) {
    var coder = new Geocoder(layout);
    
    // Test both @ and & separators
    var separatorTests = [
        "4:30 G Plaza @ 2:15",
        "4:30 G Plaza & 2:15",
        "center camp plaza @ 7:30",
        "Center Camp Plaza & 7:30",
        "7:30 B PLAZA @ 10:45",  // Test case variations
        "7:30 b plaza & 10:45"
    ];
    
    separatorTests.forEach(function(address) {
        var result = coder.forward(address);
        t.ok(result, "Should geocode with different separators: " + address);
    });
    
    t.end();
});

test('Plaza Geocoding - plazaTimeToLatLon', function(t) {
    var coder = new Geocoder(layout);
    var centerCampCenter = turf.point([-119.21067070108234, 40.781144870450696]);
    var plazaRadius = 0.0606; // 320 feet in miles
    
    // Test Center Camp Plaza with various time positions
    var plazaTests = [
        { address: "Center Camp Plaza @ 12:00", expectedBearing: 45 }, // North
        { address: "Center Camp Plaza @ 3:00", expectedBearing: 135 }, // East
        { address: "Center Camp Plaza @ 6:00", expectedBearing: -135 }, // South
        { address: "Center Camp Plaza @ 9:00", expectedBearing: -45 }, // West
        { address: "Center Camp Plaza @ 7:30", expectedBearing: -90 }, // SW
        { address: "Center Camp Plaza & 7:30", expectedBearing: -90 }, // Test & separator
        { address: "center camp plaza @ 4:30", expectedBearing: 180 }, // Test case insensitive
    ];
    
    plazaTests.forEach(function(test) {
        var result = coder.forward(test.address);
        t.ok(result, "Should geocode: " + test.address);
        
        if (result) {
            // Check distance from center - should be plaza radius
            var distance = turf.distance(centerCampCenter, result, {units: 'miles'});
            t.ok(Math.abs(distance - plazaRadius) < 0.01, 
                test.address + " should be at plaza radius. Distance: " + distance + ", Expected: " + plazaRadius);
            
            // Check bearing is correct
            var actualBearing = turf.bearing(centerCampCenter, result);
            var bearingDiff = Math.abs(actualBearing - test.expectedBearing);
            // Handle wrap-around at 180/-180
            if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
            t.ok(bearingDiff < 2, 
                test.address + " should be at correct bearing. Actual: " + actualBearing + ", Expected: " + test.expectedBearing);
        }
    });
    
    // Test other plaza formats from layout
    var otherPlazaTests = [
        "3:00 B Plaza @ 5:00",
        "9:00 G Plaza @ 2:30", 
        "7:30 B Plaza @ 10:45",
        "4:30 G Plaza @ 8:15",
        "6:00 G Plaza @ 11:00"
    ];
    
    otherPlazaTests.forEach(function(address) {
        var result = coder.forward(address);
        t.ok(result, "Should geocode: " + address);
        
        if (result) {
            // Just verify it returns valid coordinates within city bounds - wider bounds
            t.ok(result.geometry.coordinates[0] < -119.18 && result.geometry.coordinates[0] > -119.23, 
                address + " longitude should be within city bounds");
            t.ok(result.geometry.coordinates[1] > 40.77 && result.geometry.coordinates[1] < 40.81, 
                address + " latitude should be within city bounds");
        }
    });
    
    // Test invalid plaza
    var invalidResult = coder.forward("Nonexistent Plaza @ 6:00");
    t.notOk(invalidResult, "Should return undefined for non-existent plaza");
    
    t.end();
});

test('Plaza Geocoding - Expected Coordinates Check', function(t) {
    var coder = new Geocoder(layout);
    
    // Test specific coordinates for known plaza locations
    // These are based on the plaza definitions in the layout
    var coordinateTests = [
        {
            address: "4:30 G Plaza @ 4:30",
            description: "Should be near plaza center (4:30 radial at G street)",
            // Plaza center should be at 4:30 time and G street distance
            expectedApproxLat: 40.773,
            expectedApproxLon: -119.203,
            tolerance: 0.005  // Increased tolerance for plaza radius
        },
        {
            address: "Center Camp Plaza @ 6:00",
            description: "Should be on plaza perimeter at 6:00 direction",
            expectedApproxLat: 40.780,
            expectedApproxLon: -119.211,
            tolerance: 0.002
        }
    ];
    
    coordinateTests.forEach(function(test) {
        var result = coder.forward(test.address);
        t.ok(result, test.description + " - " + test.address);
        
        if (result) {
            var lat = result.geometry.coordinates[1];
            var lon = result.geometry.coordinates[0];
            
            t.ok(Math.abs(lat - test.expectedApproxLat) < test.tolerance,
                test.address + " latitude should be approximately " + test.expectedApproxLat + " (got " + lat + ")");
            t.ok(Math.abs(lon - test.expectedApproxLon) < test.tolerance,
                test.address + " longitude should be approximately " + test.expectedApproxLon + " (got " + lon + ")");
        }
    });
    
    t.end();
});