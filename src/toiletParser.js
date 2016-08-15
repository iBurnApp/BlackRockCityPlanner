/**
 * Created by david on 6/21/16.
 */
var Distance = require('./distance.js');
var Range = require('./range.js');
var Time = require('./time');
var turf = require('turf');

var Toilet = function(bearing, offset, distance, orientation){
    this.bearing = bearing;
    this.offset = offset;
    this.distance = distance;
    this.orientation = orientation;
}

var parseToiletDict = function(bearing,item) {
    var dist = null;
    if (Array.isArray(item.distance)) {
        var start = new Distance(item.distance[0]);
        var end = new Distance(item.distance[1]);
        dist = new Range(start,end);
    } else {
        dist = new Distance(item.distance);
    }

    var offset = new Distance(item.offset);

    return new Toilet(bearing,offset,dist,item.orientation);
}

var boxGeoJSON  = function(width,height,center,bearing,units) {
    var halfSidePont = turf.destination(center,width/2.0,bearing-90,units);
    var firstCorner = turf.destination(halfSidePont,height/2.0,bearing,units);
    var secondCorner = turf.destination(firstCorner,width,bearing+90,units);
    var thirdCorner = turf.destination(secondCorner,height,bearing+180,units);
    var finalCorner = turf.destination(thirdCorner,width,bearing-90,units);
    var points = [firstCorner,secondCorner,thirdCorner,finalCorner,firstCorner];
    points = points.map(function(item){
        return item.geometry.coordinates;
    })
    return turf.polygon([points]);
}

var toiletGeoJSON = function(layoutParser, width, height, toilet) {
    
    var clock = layoutParser.generateClock();
    var bearingNum = toilet.bearing;
    if (typeof bearingNum === 'string' || bearingNum instanceof String) {
        var timeArray = Time.timeFromString(bearingNum);
        bearingNum = clock.bearing(timeArray[0],timeArray[1]);
    }
    var distance = toilet.distance;
    if (Range.prototype.isPrototypeOf(distance)) {
        distance = distance.midPoint(layoutParser.streetLookupDistance);
    }
    var centerPoint = clock.pointFromDegrees(bearingNum,distance.toMiles(layoutParser.streetLookupDistance),'miles');
    centerPoint = turf.destination(centerPoint,toilet.offset.toMiles(),bearingNum+90,'miles');

    //Would be really great to have affine transform here
    //anyways here we go
    var bearing = 0;
    switch(toilet.orientation) {
        case "center":
            bearing = turf.bearing(centerPoint,layoutParser.center)
            break;
        case "city":
            bearing = layoutParser.bearing;
            break;
        case "perp":
            bearing = turf.bearing(centerPoint,layoutParser.center) + 90
            break;
    };
    var boxJSON = boxGeoJSON(width.toMiles(),height.toMiles(),centerPoint,bearing,'miles');
    return boxJSON;
};

var ToiletParser = function(json) {
    this.width = new Distance(json.size[0],'ft');
    this.height = new Distance(json.size[1],'ft');

    this.toiletsInfo = [];
    json.location.forEach(function(item){
        if (Array.isArray(item.bearing)) {
            item.bearing.forEach(function(bearing){
                this.toiletsInfo.push(parseToiletDict(bearing,item))
            },this);
        } else {
            this.toiletsInfo.push(parseToiletDict(item.bearing,item))
        }

    },this);
}

ToiletParser.prototype.polygons = function(layoutParser) {
    var features = this.toiletsInfo.map(function(toilet){
        return toiletGeoJSON(layoutParser,this.width,this.height,toilet);
    },this);
    return turf.featureCollection(features);
};

ToiletParser.prototype.points = function(layoutParser) {
    var polygons = this.polygons(layoutParser);
    var points = polygons.features.map(function(square){
       return turf.centroid(square);
    });
    return turf.featureCollection(points);
}

module.exports = ToiletParser;