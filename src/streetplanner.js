var Grid = require('./grid.js');
var Streets = require('./streets.js');
var Time = require('./time.js');
var Clock = require('./clock.js');
var Utils = require('./utils.js');
var turf = require('@turf/turf');
var Geo = require('./geo.js');
var Fence = require('./fence');
var CenterCampStreetPlanner = require('./centercampstreetplanner.js');
turf.multilinestring = require('turf-multilinestring');

var StreetPlanner = function(jsonFile) {
    this.layoutFile = jsonFile;
    this.grid = new Grid(this.layoutFile.center,this.layoutFile.bearing,this.layoutFile.cStreets,'miles');

    var distance = Utils.feetToMiles(this.layoutFile.center_camp.distance);
    var bearing = this.grid.clock.bearing(6,0);
    var centerCampCenter = turf.destination(this.layoutFile.center, distance, bearing, 'miles');

    this.streetLookup = {};
    var ARoadName = null;
    //best guess in case something goes wrong fetching it
    var portalAngle = 30;
    this.layoutFile.cStreets.forEach(function(street){
        this.streetLookup[street.ref] = Utils.feetToMiles(street.distance)
        if (street.ref === 'a') {
            ARoadName = street.name;
        }
    },this);

    this.layoutFile.portals.forEach(function(portal){
        if (portal.ref === '6portal') {
            portalAngle = portal.angle;
        }
    },this);

    this.minFrequency = 5;
    this.bearingFrequency = 360.0/(60.0/this.minFrequency*12.0)

    this.centerCampGrid = new Grid(centerCampCenter,this.layoutFile.bearing);
    //Pre calculate All Streets
    // 1. Generate All Arc Streets
    this.generateArcStreets();

    if (this.layoutFile.center_camp.rod_road_distance) {
        // 2. Remove Arc Street Points inside Rod's Road
        this.removePointsInsideRodRoad();
        // 3. Add Intersection Points with Rod's Road back in
        var intersections = this.generateRodRoadIntersections();
    }
    // 4. Add Radial Streets
    this.generateRadialStreets();
    // 5. Remove Radial Streets piece inside center camp plaza
    this.removePointsInsideCenterCampPlaza();
    // 6. Add Intersection points
    this.generateCenterCampPlazaIntersections();
    // 7. Generate entrance road intersections
    // Don't calculate again (on get) or pull form grid since it's strange and intersections are already saved
    this.entranceRoad = this.generateEntranceRoad();
    this.centerCampStreetPlanner = new CenterCampStreetPlanner(centerCampCenter,this.layoutFile.center_camp,this.layoutFile.bearing,intersections,ARoadName,portalAngle);
};

/////////////////////////////
// Use for saving points to the grid

StreetPlanner.prototype.generateArcStreets = function() {
    var arcPoints = Streets.generateArcStreetsPoints(this.layoutFile,this.minFrequency);
    arcPoints.forEach(function(arcArray) {
        arcArray.forEach(function(item) {
            item.forEach(function(point){
                //need to fix distance decimal numbers to limit to 6 decimal places
                this.grid.saveWithBearing(point.properties.bearing,point.properties.distance,point.geometry.coordinates);
            },this);
        },this);
    },this);
};

/**
 * This adds points to the grid for the begining and ends of the radial streets. When we go to fetch we'll fill in intermediate points
 *
 */
StreetPlanner.prototype.generateRadialStreets = function() {
    var points = Streets.generateRadialStreetsPoints(this.layoutFile);

    points.forEach(function(segment){
        segment.forEach(function(item){
            item.forEach(function(point){
                //need to fix distance decimal numbers to limit to 6 decimal places
                this.grid.saveWithBearing(point.properties.bearing,point.properties.distance,point.geometry.coordinates);
            },this);
        },this)
    },this);
};

StreetPlanner.prototype.generateRodRoadIntersections = function() {
    var arcStreets = Streets.generateArcStreets(this.layoutFile,1);
    var rodRoad = this.rodRoad();
    var finalIntersections = [];
    arcStreets.features.forEach(function(item){
        var intersections = turf.lineIntersect(rodRoad,item);
        if (intersections) {
            intersections.geometry.coordinates.forEach(function(coordinate){
                var point =  turf.point(coordinate,{ref:item.properties.ref});
                finalIntersections.push(point);
                var bearing = turf.bearing(this.layoutFile.center,point)
                var distance = this.streetLookup[item.properties.ref]
                this.grid.saveWithBearing(bearing,distance,coordinate)
            },this);
        }
    },this);
    return finalIntersections;
};

StreetPlanner.prototype.generateCenterCampPlazaIntersections = function() {
    var centerCampdistance = (this.layoutFile.center_camp.cafe_plaza_radius - this.layoutFile.center_camp.cafe_radius)/2.0 + this.layoutFile.center_camp.cafe_radius;
    var distance1 = Utils.feetToMiles(this.layoutFile.center_camp.distance + centerCampdistance);
    var distance2 = Utils.feetToMiles(this.layoutFile.center_camp.distance - centerCampdistance);
    var bearing = this.grid.clock.bearing(6,0);
    var point1 = turf.destination(this.layoutFile.center, distance1, bearing, 'miles');
    var point2 = turf.destination(this.layoutFile.center, distance2, bearing, 'miles');
    this.grid.saveWithBearing(bearing,distance1,point1.geometry.coordinates);
    this.grid.saveWithBearing(bearing,distance2,point2.geometry.coordinates);
}

StreetPlanner.prototype.rodRoad = function() {
    var centerCampCenter = this.centerCampGrid.layout.center;
    var radius = Utils.feetToMiles(this.layoutFile.center_camp.rod_road_distance);
    var rodRoad = Streets.centerCamp.rodRoad(centerCampCenter,radius,1);
    return rodRoad
};

StreetPlanner.prototype.centerCampPlazaCenterline=function() {
    var distance = (this.layoutFile.center_camp.cafe_plaza_radius - this.layoutFile.center_camp.cafe_radius)/2.0 + this.layoutFile.center_camp.cafe_radius;
    distance = Utils.feetToMiles(distance);
    return Geo.arc(this.centerCampGrid.layout.center,distance,'miles',0,360,this.bearingFrequency)
};


StreetPlanner.prototype.removePointsInsideRodRoad = function() {
    var rodRoad = this.rodRoad();
    var rodRoadPolygon = turf.polygon([rodRoad.geometry.coordinates]);
    this.grid.removePoints(rodRoadPolygon);
};

StreetPlanner.prototype.removePointsInsideCenterCampPlaza = function() {
    var plazaRoad = this.centerCampPlazaCenterline()
    var plazaRoadPolygon = turf.polygon([plazaRoad.geometry.coordinates]);
    this.grid.removePoints(plazaRoadPolygon);
};

StreetPlanner.prototype.generateEntranceRoad = function() {
    var entranceRoadLength = Utils.feetToMiles(this.layoutFile.entrance_road.distance);
    var entranceRoadAngle = this.layoutFile.entrance_road.angle;
    var fence = Fence.fence(this.layoutFile).features[0];

    //Create Straight segment
    var longSix = turf.lineString([this.layoutFile.center.geometry.coordinates,this.grid.clock.point(6,0,5,'miles').geometry.coordinates])
    var intersectionPoint = turf.lineIntersect(fence,longSix).features[0];
    var splitPoint = turf.destination(intersectionPoint,entranceRoadLength,this.layoutFile.bearing,{units: 'miles'});
    var segments = [[intersectionPoint.geometry.coordinates,splitPoint.geometry.coordinates]];

    //Create forked segment
    var bearing1 = this.layoutFile.bearing + entranceRoadAngle/2;
    var bearing2 = this.layoutFile.bearing - entranceRoadAngle/2;
    //temp roads to find intersections;
    var entrance1 = turf.lineString([splitPoint.geometry.coordinates,turf.destination(splitPoint,0.5,bearing1,'miles').geometry.coordinates]);
    var entrance2 = turf.lineString([splitPoint.geometry.coordinates,turf.destination(splitPoint,0.5,bearing2,'miles').geometry.coordinates]);
    //most outer street
    var outerStreet = Utils.filter(this.getArcStreets().features,'ref','k')[0];
    var intersectionPoint1 = turf.lineIntersect(outerStreet,entrance1).features[0];
    var intersectionPoint2 = turf.lineIntersect(outerStreet,entrance2).features[0];
    var bearing1 = turf.bearing(this.layoutFile.center,intersectionPoint1);
    var bearing2 = turf.bearing(this.layoutFile.center,intersectionPoint2);
    var distance = this.streetLookup['k']
    this.grid.saveWithBearing(bearing1,distance,intersectionPoint1.geometry.coordinates);
    this.grid.saveWithBearing(bearing2,distance,intersectionPoint2.geometry.coordinates);

    segments.push([splitPoint.geometry.coordinates,intersectionPoint1.geometry.coordinates]);
    segments.push([splitPoint.geometry.coordinates,intersectionPoint2.geometry.coordinates]);

    return turf.multilinestring(segments,{
        'ref': 'entrance',
        'name': 'Entrance Road'
    });
};

//////////////////////////////////////////////

StreetPlanner.prototype.getArcStreets = function() {
    var features = [];

    this.layoutFile.cStreets.forEach(function(street){
        var points = [];
        street.segments.forEach(function(segment){
            var distance = Utils.feetToMiles(street.distance);
            var segmentPoints = this.grid.allPointsAlongDistance(distance,segment);
            points.push(segmentPoints);
        },this)
        var lineString;
        if (points.length === 1) {
            lineString = turf.lineString(points[0]);
        } else {
            lineString = turf.multilinestring(points);
        }
        lineString.properties = {ref:street.ref,name:street.name,type:"arc"};

        features.push(lineString);
    },this);


    return turf.featureCollection(features);
};

StreetPlanner.prototype.getRadialStreets = function() {
    var features = [];
    this.layoutFile.tStreets.forEach(function(tStreet){


        tStreet.refs.forEach(function(time){
            var timeArray = Utils.splitTimeString(time)
            var hour = timeArray[0];
            var minute = timeArray[1];
            var points = []
            tStreet.segments.forEach(function(segment) {
                segment = segment.map(function(dist){
                    if (typeof dist === 'number') {
                        return Utils.feetToMiles(dist);
                    } else {
                        return this.streetLookup[dist];
                    }
                },this);

                var segmentPoints = this.grid.allPointsAlongTime(hour,minute,segment[0],segment[1]);
                points.push(segmentPoints);
            },this);
            var lineString;
            if (points.length === 1) {
                lineString = turf.lineString(points[0]);
            } else {
                lineString = turf.multilinestring(points);
            }

            lineString.properties = {type:'radial',name:time};
            if (tStreet.width) {
                lineString.properties.width = tStreet.width;
            }
            features.push(lineString);
        },this)
    },this);
    return turf.featureCollection(features);
};

StreetPlanner.prototype.getAirportRoad = function() {
    var distance = 0;
    for (var key in this.streetLookup) {
        var value = this.streetLookup[key]
        if (value > distance) {
            distance = value;
        }
    }

    var startPoint = this.grid.point(5,0,distance);
    var fenceLine = Fence.fence(this.layoutFile).features[0];
    var points = [];
    fenceLine.geometry.coordinates.forEach(function(coordinate){
        points.push(turf.point(coordinate));
    });

    var nearest = turf.nearestPoint(startPoint,turf.featureCollection(points));
    return turf.lineString([startPoint.geometry.coordinates,nearest.geometry.coordinates],{
        'ref': 'airport',
        'name': 'Airport Road'
    })
};

StreetPlanner.prototype.getAllCityStreets = function() {
    var features = [];
    features = features.concat(this.getArcStreets().features);
    features = features.concat(this.getRadialStreets().features);
    features = features.concat(this.centerCampStreetPlanner.getAllStreets().features);
    features.push(this.entranceRoad);
    features.push(this.getAirportRoad());

    return turf.featureCollection(features);
}

module.exports = StreetPlanner;