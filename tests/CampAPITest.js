var test = require('tape');
var turf = require('@turf/turf');
var Geocoder = require('../src/geocoder/geocoder');
var Parser = require('../src/geocoder/geocodeParser.js');


var campJSON = require('./sample-2015-camp.json');
var layout = require('./layout2025.json');

test("Center Camp Street Intersections",function(t){

	var coder = new Geocoder(layout);
	// Test that street intersections A & 5:45 and C & 5:45 work correctly
	// These are valid intersections in the 2025 layout
	var first = coder.forward("C & 5:45");
	t.ok(first,"found C & 5:45 intersection");
	var point = coder.forward("A & 5:45");
	t.ok(point,"found A & 5:45 intersection");

	t.end();
});

test("Center Camp Plaza Geocode",function(t){

	var coder = new Geocoder(layout);
	// Test hardcoded Center Camp Plaza location
	var point = coder.forward("Center Camp Plaza");
	t.ok(point,"found center camp plaza geocode point");
	
	// Also test basic time/distance geocode works
	var centerPoint = coder.forward("12:00 0'");
	t.ok(centerPoint,"found center geocode point");

	t.end();
});

test("Parsing Location String",function(t){

	var coder = new Geocoder(layout);

	var gSuccessCount = 0

	campJSON.forEach(function(camp){
		var locationString = camp.location_string;

		//Parse test
		if (locationString.length === 0) {
			return;
		}


		var parseResult = Parser.parse(locationString);
		if (parseResult) {
			if(parseResult.feature && parseResult.time) {

			} else {
				console.log("Parser Failed: "+camp.uid+" "+locationString);
			}

			//t.ok(parseResult.feature,"Found Feature: "+parseResult.feature);
			//t.ok(parseResult.time,"Found Time: "+parseResult.time);
		} else {
			
			t.ok(parseResult);
		}

		//Geocoder test
		var point = coder.forward(locationString);
		if(point) {
			gSuccessCount += 1;
		} else {
			console.log("Geocoder Failed: "+camp.uid+" "+locationString);
		}

		



	});
	console.log("Success: "+gSuccessCount/campJSON.length);
	t.end();
});