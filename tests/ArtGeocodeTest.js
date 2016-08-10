var test = require('tape');
var turf = require('turf');
var Geocoder = require('../src/Geocoder/geocoder');
var Parser = require('../src/Geocoder/geocodeParser.js');
var Utils = require('../src/utils');

var artJSON = require('./new-2015-art.json');
var layout = require('./layout2015.json');
var centerPoint = layout.center;


test('geocodingArtStringJSON', function(t) {

	var coder = new Geocoder(layout);

	var ultraFailed = []

	artJSON.forEach(function(item){

		if (item.location.string) {

			var realPoint = turf.point([item.location.gps_longitude,item.location.gps_latitude])

			//Parse Test
			console.log("Geocoding: "+item.uid + " "+ item.location.string);
			var parseResult = Parser.parse(item.location.string);
			t.equal(item.location.distance,parseResult.distance,"Parsed correct distance "+parseResult.distance);
			var arr = Utils.splitTimeString(parseResult.time);
			var hour = parseInt(arr[0]);
			var min = parseInt(arr[1]);
			t.equal(item.location.hour,hour,"Correct hour "+hour);
			t.equal(item.location.minute,min,"Correct minute "+min);


			//Geocoding Test
			var point = coder.forward(item.location.string);
			t.ok(point,"Found point "+point.geometry.coordinates);
			var lat = point.geometry.coordinates[1];
	        var lon = point.geometry.coordinates[0];

	        t.ok(typeof lat == "number","Latitude is number");
	        t.ok(typeof lon == "number","Longitude is number");




	        var distance = turf.distance(point,realPoint);
	        //t.ok(distance < .001, "Distance is close enough "+ (distance*1000.0) +" meters");
			if (distance > .001) {
				var testError = {};
				testError.id = item.uid;
				testError.locationString = item.location.string;
				testError.calculatedDistanceFeet = Math.round(Utils.milesToFeet(turf.distance(centerPoint,point,'miles')),2);
				testError.theirDistanceFeet = Math.round(Utils.milesToFeet(turf.distance(centerPoint,realPoint,'miles')));
				testError.ourBearing = turf.bearing(centerPoint,point);
				testError.theirBearing = turf.bearing(centerPoint,realPoint);
				testError.timeString = Utils.degreesToTime(testError.theirBearing,layout.bearing);
				
				ultraFailed.push(testError);
			}
		} else {
			console.log("Skipping Art: "+item.uid);
		}

		

	});

	if (ultraFailed.length > 0) {
		console.log("|id|iBurn Calcluated Distance|Playa Events Calculated Distance|iBurn Calculated Bearing|Playa Events Calculated Bearing|Playa Events Calculated Time|Playa Events API time string|")
	}
	ultraFailed.forEach(function(item){
		console.log("|%s|%s|%s|%d|%d|%s|%s|",item.id,item.calculatedDistanceFeet,item.theirDistanceFeet,item.ourBearing,item.theirBearing,item.timeString,item.locationString)
	});

	t.end();
});













