var test = require('tape');
var Geocoder = require('../src/geocoder/geocoder.js');
var Parser = require('../src/geocoder/geocodeParser.js');
var layout2015 = require('./layout2015.json');
var turf = require('turf');
var dmz = require('../src/dmz.js');

test ('StreetIntersection', function(t) {

    var coder = new Geocoder(layout2015);

    var testSearches = [
        turf.point([ -119.218315, 40.777443 ],{street:"Hankypanky", time:'6:00'}),
        turf.point([ -119.218315, 40.777443 ],{street:"Hanky Panky", time:'6:00'}),
        turf.point([ -119.215238, 40.784623 ],{street:'Esplanade',time:"7:00"}),
        turf.point([ -119.215421, 40.785265 ],{street:'Esplanade',time:"7:11"}),
        turf.point([ -119.212253, 40.778853 ],{street:'Ballyhoo',time:"5:30"}),
        turf.point([ -119.215857, 40.779313 ],{street:'Rod\'s Road',time:"6:00"}),
        turf.point([ -119.215857, 40.779313 ],{street:'Rod Road',time:"6:00"}),
        turf.point([ -119.213835, 40.780169 ],{street:"Inner Circle",time:"4:15"})
    ];

    for (var i =0; i < testSearches.length; i++) {
        var testIntersection = testSearches[i];
        var intersection = coder.forwardStreetIntersection(testIntersection.properties.time,testIntersection.properties.street);
        var distanceDifference = turf.distance(intersection,testIntersection);
        t.ok(distanceDifference < 0.001, "Intersection should be close "+distanceDifference+" expected: "+testIntersection.geometry.coordinates+" got: "+intersection.geometry.coordinates);

        intersection = coder.forward(testIntersection.properties.street +' & '+testIntersection.properties.time);
        distanceDifference = turf.distance(intersection,testIntersection);
        t.ok(distanceDifference < 0.001, "Intersection should be close "+distanceDifference);

        intersection = coder.forward(testIntersection.properties.time +' & '+testIntersection.properties.street);
        distanceDifference = turf.distance(intersection,testIntersection);
        t.ok(distanceDifference < 0.001, "Intersection should be close "+testIntersection.properties.street+" "+distanceDifference);
    }

    t.end();
});

test("geocode",function(t){
    var coder = new Geocoder(layout2015);

    var testSearches = [
        // TODO: Support geocoding two streets where one is not a time street
        //turf.point([ -119.213835, 40.780169 ],{first:"Rod\'s Road",second:"C",type:"&"}),
        // turf.point([ -119.212253,  40.778853],{first:"5:30",second:"Ballyhoo",type:"&"}),
        // turf.point([ -119.212253,  40.778853],{first:"5:30", second:"B",type:"&"}), //Normal time street and circlular street
        // turf.point([ -119.212253,  40.778853],{first:"B",second:"5:30",type:"&"}),
        // turf.point([ -119.2139388, 40.7787117],{first:"Rod's Road",second:"4:30",type:"@"}), // Special center camp addresss, time starts from center camp Center
        // turf.point([ -119.2145218, 40.7922306],{first:"9:00 Plaza",second:"1:00",type:"@"}), // Special case time starts from plaza
        turf.point([ -119.2144238, 40.7812450],{first:"Center Camp Plaza",second:"9:15",type:"@"}),
        turf.point([ -119.2135019, 40.7919587],{first:"9:00 portal",second:"",type:""})
    ];

    testSearches.forEach(function(item){
        var fullAddressString = item.properties.first+" "+item.properties.type+" "+item.properties.second;
        var fullStringIntersection = coder.forward(fullAddressString);
        var twoStringIntersection = coder.forward(item.properties.first,item.properties.second);

        t.ok(fullStringIntersection, "Checking valid intersection returned for: "+JSON.stringify(item.properties));
        t.ok(twoStringIntersection, "Checking valid intersection returned for: "+JSON.stringify(item.properties));

        var fullStringDistance = turf.distance(item,fullStringIntersection);
        var twoStringDistace = turf.distance(item,twoStringIntersection);

        t.ok(fullStringDistance < 0.001, "Full string intersection should be close "+fullStringDistance+ " "+JSON.stringify(fullStringIntersection));
        t.ok(twoStringDistace < 0.001, "Two string intersection should be close "+twoStringDistace+ " "+JSON.stringify(twoStringIntersection));

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
    var coder = new Geocoder(layout2015);
    var artString = "12:00 0\'";
    var result = coder.forward(artString);
    var distance = turf.distance(result,layout2015.center,'miles');
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


//// Reverse geocoder

test('reverseGeocode',function(t) {
    var coder = new Geocoder(layout2015);

    var result = coder.reverse(40.7873,-119.2101);
    t.equal(result,"8:07 & 1686' Inner Playa","Inner Playa test");
    result = coder.reverse(40.7931,-119.1978);
    t.equal(result,"11:59 & 5518' Outer Playa","Outer Playa test");
    result = coder.reverse(40.7808,-119.2140);
    t.equal(result, "Café","Cafe test");
    result = coder.reverse(40.7807,-119.2132);
    t.equal(result, "Center Camp Plaza","Center camp plaza test");
    result = coder.reverse(40.7901,-119.2199);
    t.equal(result, "8:10 & Ersatz","street test")
    result = coder.reverse(40.7826,-119.2132);
    t.equal(result, "11:04 & Rod's Road","rod Road test");
    result = coder.reverse(40.7821, -119.2140);
    t.equal(result, "10:26 & Route 66","route 66 test");
    result = coder.reverse(40.776184, -119.22);
    t.equal(result, "6:00 & Kook","Crossing hour test");
    result = coder.reverse(40.659,-119.363);
    t.equal(result, "Outside Black Rock City")
    result = coder.reverse(40.779819000011244, -119.21382886807997);
    t.equal(result, "4:20 & Inner Circle");
    t.end();
});


test('dmzArc', function(t){
    //https://eplaya.burningman.com/viewtopic.php?f=65&t=74372
    var dmzGeo = dmz.frontArc(layout2015);
    var distance = turf.lineDistance(dmzGeo,'miles');
    t.ok(Math.abs(distance - 0.3309) < .1,"Should have correct arc distance " + distance);
    t.end();
});

test('dmzArea', function(t){
    var dmzGeo = dmz.area(layout2015);
    var area = turf.area(dmzGeo);
    t.ok(area > 0,"Should have correct arc area " + area);
    t.end();
});

test('dmzToilets', function(t){
    var toilets = dmz.toilets(layout2015);
    t.equal(toilets.features.length,2,"Two toilets please")
    t.end();
});
