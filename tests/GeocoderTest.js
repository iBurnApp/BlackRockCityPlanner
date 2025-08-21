var test = require('tape');
var Geocoder = require('../src/geocoder/geocoder.js');
var Parser = require('../src/geocoder/geocodeParser.js');
var layout2025 = require('./layout2025.json');
var turf = require('@turf/turf');
var dmz = require('../src/dmz.js');

test ('StreetIntersection', function(t) {

    var coder = new Geocoder(layout2025);

    var testSearches = [
        // Valid 2025 layout intersections with actual calculated coordinates
        turf.point([ -119.21173504230462, 40.78518066835633 ],{street:"Esplanade", time:'7:00'}),
        turf.point([ -119.21173789102401, 40.788727941781985 ],{street:"Esplanade", time:'8:00'}),
        turf.point([ -119.20065385787962, 40.78033825584541 ],{street:'Esplanade',time:"4:00"}),
        turf.point([ -119.20181388989756, 40.780163702358266 ],{street:'Esplanade',time:"4:15"}),
        turf.point([ -119.202994, 40.780105176635516 ],{street:'Esplanade',time:"4:30"}),
        turf.point([ -119.21123208306095, 40.78071337870547 ],{street:'Bradbury',time:"6:00"}),
        turf.point([ -119.2188674450434, 40.78373042425029 ],{street:'Farmer',time:"7:00"}),
        turf.point([ -119.20071638873063, 40.773845012623305 ],{street:"Gibson",time:"4:15"})
    ];

    for (var i =0; i < testSearches.length; i++) {
        var testIntersection = testSearches[i];
        var intersection = coder.forwardStreetIntersection(testIntersection.properties.time,testIntersection.properties.street);
        if (!intersection) {
            t.fail("No intersection found for " + testIntersection.properties.time + " & " + testIntersection.properties.street);
            continue;
        }
        var distanceDifference = turf.distance(intersection,testIntersection, {units: 'kilometers'});
        t.ok(distanceDifference < 0.001, "Intersection should be close "+distanceDifference+" expected: "+testIntersection.geometry.coordinates+" got: "+intersection.geometry.coordinates);

        intersection = coder.forward(testIntersection.properties.street +' & '+testIntersection.properties.time);
        if (!intersection) {
            t.fail("No intersection found for forward: " + testIntersection.properties.street +' & '+testIntersection.properties.time);
            continue;
        }
        distanceDifference = turf.distance(intersection,testIntersection, {units: 'kilometers'});
        t.ok(distanceDifference < 0.001, "Intersection should be close "+distanceDifference);

        intersection = coder.forward(testIntersection.properties.time +' & '+testIntersection.properties.street);
        if (!intersection) {
            t.fail("No intersection found for forward: " + testIntersection.properties.time +' & '+testIntersection.properties.street);
            continue;
        }
        distanceDifference = turf.distance(intersection,testIntersection, {units: 'kilometers'});
        t.ok(distanceDifference < 0.001, "Intersection should be close "+testIntersection.properties.street+" "+distanceDifference);
    }

    t.end();
});

test("geocode",function(t){
    var coder = new Geocoder(layout2025);

    var testSearches = [
        // Working hardcoded locations 
        turf.point([ -119.21067070108234, 40.781144870450696],{first:"Center Camp Plaza",second:"",type:""}),
        turf.point([ -119.21067070108234, 40.781144870450696],{first:"Café",second:"",type:""}),
        turf.point([ -119.21067070108234, 40.781144870450696],{first:"Rod's Road",second:"",type:""}),
        
        // Plaza + time test cases - coordinates are on plaza perimeter, not exact points
        turf.point([ -119.21127932628995, 40.78182829562119],{first:"Center Camp Plaza",second:"7:30",type:"@", tolerance: 0.1}),
        turf.point([ -119.21019518741666, 40.781854531091085],{first:"Center Camp Plaza",second:"10:30",type:"@", tolerance: 0.1})
        
        // TODO: Support geocoding two streets where one is not a time street
        //turf.point([ -119.213835, 40.780169 ],{first:"Rod\'s Road",second:"C",type:"&"}),
        // turf.point([ -119.212253,  40.778853],{first:"5:30",second:"Ballyhoo",type:"&"}),
        // turf.point([ -119.212253,  40.778853],{first:"5:30", second:"B",type:"&"}), //Normal time street and circlular street
        // turf.point([ -119.212253,  40.778853],{first:"B",second:"5:30",type:"&"}),
        // turf.point([ -119.2139388, 40.7787117],{first:"Rod's Road",second:"4:30",type:"@"}), // Special center camp addresss, time starts from center camp Center
        // turf.point([ -119.195000, 40.795000],{first:"9:00 portal",second:"",type:""})
    ];

    testSearches.forEach(function(item){
        // Handle empty type and second for simple hardcoded locations
        var fullAddressString;
        if (item.properties.type === "" && item.properties.second === "") {
            fullAddressString = item.properties.first;
        } else {
            fullAddressString = item.properties.first+" "+item.properties.type+" "+item.properties.second;
        }
        var fullStringIntersection = coder.forward(fullAddressString);
        var twoStringIntersection = coder.forward(item.properties.first,item.properties.second);

        t.ok(fullStringIntersection, "Checking valid intersection returned for: "+JSON.stringify(item.properties));
        t.ok(twoStringIntersection, "Checking valid intersection returned for: "+JSON.stringify(item.properties));

        if (fullStringIntersection) {
            var fullStringDistance = turf.distance(item,fullStringIntersection, {units: 'kilometers'});
            var tolerance = item.properties.tolerance || 0.001;
            t.ok(fullStringDistance < tolerance, "Full string intersection should be close "+fullStringDistance+ " "+JSON.stringify(fullStringIntersection));
        }

        if (twoStringIntersection) {
            var twoStringDistace = turf.distance(item,twoStringIntersection, {units: 'kilometers'});
            var tolerance = item.properties.tolerance || 0.001;
            t.ok(twoStringDistace < tolerance, "Two string intersection should be close "+twoStringDistace+ " "+JSON.stringify(twoStringIntersection));
        }

    });

    t.end();
});

test('parseTimeTest',function(t){
    t.equal(Parser.parseTimeString("11:30"),"11:30","Parseing 11:30");
    t.notOk(Parser.parseTimeString("800"),"Do not parse numbers as time");
    t.end();
});

test ('parserTimeDistance', function(t) {
    var artString = "11:55 6600\', Open Playa";
    var result = Parser.parse(artString);
    t.ok(result.time === '11:55' ,"Time string should be equal");
    t.ok(result.distance === 6600, "Distance should be equal");
    t.end();
});

test ("timeStringMan", function(t) {
    var coder = new Geocoder(layout2025);
    var artString = "12:00 0\'";
    var result = coder.forward(artString);
    var distance = turf.distance(result,layout2025.center,{units: 'miles'});
    t.ok(distance < .001 ,"Should be about equal");
    t.end();
});

test ('parseStreetTime', function(t) {
    var campString =  "Cinnamon & 5:15"
    var result = Parser.parse(campString);
    t.ok(result.time === '5:15' ,"Time string should be equal")
    t.ok(result.feature === 'cinnamon', "Street should be equal")
    t.end();
});

test('plazaTimeGeocoding', function(t) {
    var coder = new Geocoder(layout2025);
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
            t.ok(Math.abs(distance - plazaRadius) < 0.001, 
                test.address + " should be at plaza radius. Distance: " + distance + ", Expected: " + plazaRadius);
            
            // Check bearing is correct
            var actualBearing = turf.bearing(centerCampCenter, result);
            var bearingDiff = Math.abs(actualBearing - test.expectedBearing);
            // Handle wrap-around at 180/-180
            if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
            t.ok(bearingDiff < 1, 
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
            // Just verify it returns valid coordinates within city bounds
            t.ok(result.geometry.coordinates[0] < -119.19 && result.geometry.coordinates[0] > -119.22, 
                address + " longitude should be within city bounds");
            t.ok(result.geometry.coordinates[1] > 40.77 && result.geometry.coordinates[1] < 40.80, 
                address + " latitude should be within city bounds");
        }
    });
    
    // Test invalid plaza
    var invalidResult = coder.forward("Nonexistent Plaza @ 6:00");
    t.notOk(invalidResult, "Should return undefined for non-existent plaza");
    
    t.end();
});


//// Reverse geocoder

test('reverseGeocode',function(t) {
    var coder = new Geocoder(layout2025);

    // Updated for 2025 layout with properly calculated coordinates
    var result = coder.reverse(40.786958, -119.202994);
    t.equal(result,"10:30 & 0' Inner Playa","Center coordinates test");
    
    result = coder.reverse(40.787858, -119.204994);
    t.equal(result,"8:31 & 643' Inner Playa","Inner Playa coordinates test");
    
    result = coder.reverse(40.78518066835633, -119.21173504230462);
    t.equal(result,"7:00 & 2500' Inner Playa","Esplanade intersection test");
    
    result = coder.reverse(40.79, -119.2);
    t.equal(result,"11:43 & 1384' Inner Playa","Northern area test");
    
    result = coder.reverse(40.78, -119.22);
    t.equal(result,"6:33 & Ishiguro","Street intersection test");
    
    result = coder.reverse(40.659,-119.363);
    t.equal(result, "Outside Black Rock City","Outside city test");
    
    t.end();
});


test('dmzArc', function(t){
    //https://eplaya.burningman.com/viewtopic.php?f=65&t=74372
    var dmzGeo = dmz.frontArc(layout2025);
    var distance = turf.length(dmzGeo,{units: 'miles'});
    t.ok(Math.abs(distance - 0.3309) < .1,"Should have correct arc distance " + distance);
    t.end();
});

test('dmzArea', function(t){
    var dmzGeo = dmz.area(layout2025);
    var area = turf.area(dmzGeo);
    t.ok(area > 0,"Should have correct arc area " + area);
    t.end();
});

test('dmzToilets', function(t){
    var toilets = dmz.toilets(layout2025);
    t.equal(toilets.features.length,2,"Two toilets please")
    t.end();
});
