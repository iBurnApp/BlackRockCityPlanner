var test = require('tape');
var turf = require('@turf/turf');
var Geocoder = require('../src/geocoder/geocoder');
var Parser = require('../src/geocoder/geocodeParser.js');


var campJSON = require('./sample-2015-camp.json');
var layout = require('./layout2025.json');

test("Center Camp Plaza Geocode",function(t){

	var coder = new Geocoder(layout);
	//TODO: Why do I have to ref="a" features
	// A & 5:45 -- C & 5:45 this is not real this is somewhere inside center camp plaza
	//TODO: Check if plaza times are correct for 12 facing towards the man
	var first = coder.forward("C & 5:45");
	t.notok(first,"found center camp geocode point");
	var point = coder.forward("A & 5:45");
	t.notok(point,"found center camp geocode point");

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