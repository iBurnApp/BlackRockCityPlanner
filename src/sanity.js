
var Geocoder = require("./geocoder/geocoder.js");
var fs = require('fs');
var turf = require('turf');


var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "layout": path,
        "file": path
    },
    shortHands = {
        "l": ["--layout"],
        "f": ["--file"]
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

var layout = JSON.parse(fs.readFileSync(parsed.layout, 'utf8'));
var jsonFile = JSON.parse(fs.readFileSync(parsed.file, 'utf8'));

var coder = new Geocoder(layout);


var apiSanity = function(json) {
	var missingLocationString = [];
	var failedGeocoding = [];
	var success = []
	var features = []
	json.forEach(function(item){
		var location_string = item.location_string;
		if(location_string === undefined || location_string === null) {
			missingLocationString.push(item.uid);
		} else {
			var point = coder.forward(item.location_string);
			var originalPoint = null;
			if (item.location.gps_longitude) {
				originalPoint = turf.point([item.location.gps_longitude,item.location.gps_latitude])
			}

			if (point) {
				success.push(item.uid);
				point.properties = item
				features.push(point);
				if (originalPoint) {
					var distance = turf.distance(point,originalPoint);
					if (distance*1000 > 10) {
						failedGeocoding.push(item.uid + ": " + item.location_string );
					}
				}
				//check point if can
			} else {
				point = coder.forward(item.location.frontage,item.location.intersection)
				if (point) {
					console.log("2 string method")
					if (originalPoint) {
						var distance = turf.distance(point,originalPoint);
						if (distance*1000 > 10) {
							failedGeocoding.push(item.uid + ": " + item.location_string );
						}
					}
				} else {
					failedGeocoding.push(item.uid + ": " + item.location_string );
				}
			}
		}



	});
	return {
		missingLocation: missingLocationString,
		failedGeocoding: failedGeocoding,
		features:features,
		success:success
	}
}

var result = apiSanity(jsonFile)
console.log(JSON.stringify(turf.featureCollection(result.features),null,4))
//console.log(result.success.length);