var Streets = require('../src/streets.js');
var test = require('tape');
var turf = require('@turf/turf');
var StreetPlanner = require('../src/streetplanner.js');
var layout2015 = require('./layout2015.json');


test('creating an arc', function(t){
    var result = Streets.generateArcStreet(layout2015.center,1,[[0,90],[180,270]],1);
    t.equal(result.geometry.coordinates.length,2,"Generated two segments");
    t.equal(result.geometry.coordinates[0].length,181,"genearted 211 points");
    t.equal(result.geometry.coordinates[1].length,181,"genearted 211 points");
    var arc1 = turf.lineString(result.geometry.coordinates[0]);
    var arc2 = turf.lineString(result.geometry.coordinates[1]);
    var distance1 = turf.length(arc1,{units: 'miles'});
    var distance2 = turf.length(arc2,{units: 'miles'});
    var error = Math.abs(distance1-distance2);
    t.ok(error < 0.001,"Equal distance with error");
    error = Math.abs(distance1 - Math.PI/2.0);
    t.ok(error < 0.001,"Correct distance with error");
    t.end();
});

test('Get all arc streets', function(t){
    var planner = new StreetPlanner(layout2015);
    var result = planner.getArcStreets();
    t.equal(result.features.length,layout2015.cStreets.length,"Correct number of streets");
    t.end();
});

test("calculate radial", function(t){
    var planner = new StreetPlanner(layout2015);
    var result = planner.getRadialStreets();
    result.features.forEach(function(item){
        if(item.properties.name === "2:00") {
            t.equal(item.geometry.coordinates.length,12,"Correct Length")
        } else if(item.properties.name === "3:00") {
            t.equal(item.geometry.coordinates.length,14,"Correct Length")
        }
    });
    t.ok(result,"Calculating radial streets");
    t.equal(result.features.length,34,"Correct number of streets");
    t.end();
});

test("calculate All streets", function(t){
    var planner = new StreetPlanner(layout2015);
    var features = planner.getAllCityStreets();

    t.ok(features,"Calculating all streets");
    t.end();
});

test("calculate Rod Road", function(t){
    var planner = new StreetPlanner(layout2015);
    var rodRoad = planner.centerCampStreetPlanner.getRodRoad();
    t.ok(rodRoad,"Rod Road");
    var firstCoordinate = rodRoad.geometry.coordinates[0];
    var lastCoordinate = rodRoad.geometry.coordinates[rodRoad.geometry.coordinates.length-1];
    t.equal(firstCoordinate,lastCoordinate,"Complete circle for Rod's Road")
    t.ok(rodRoad.geometry.coordinates.length > 5, "Make sure there's some nodes in Rod's Road");
    t.end();
});



test("calculate Center Plaza Road",function(t){
    var planner = new StreetPlanner(layout2015);
    var result = planner.centerCampStreetPlanner.getCenterCampPlazaCenterline();
    t.ok(result,"Center Camp Plaza Road");
    t.ok(result.geometry.coordinates.length > 5, "Make sure there's some nodes in center camp plaza centerline");
    t.end();
});


test("Calculate A Street in Center Camp",function(t){
    var planner = new StreetPlanner(layout2015);
    var result = planner.centerCampStreetPlanner.getARoad();
    t.equal(result.geometry.coordinates.length,2,"Center camp A street");
    t.end();
});

test("Calculate Route 66",function(t){
    var planner = new StreetPlanner(layout2015);
    var result = planner.centerCampStreetPlanner.get66Road();
    t.ok(result,"created rt 66");
    t.equal(result.geometry.coordinates.length,3,"Created 3 arcs");
    t.end();
})

test("Create whole center camp",function(t){
    var planner = new StreetPlanner(layout2015);
    var result = planner.centerCampStreetPlanner.getAllStreets();
    t.ok(result,"created all streets");
    t.equal(result.features.length,4,"Created 4 roads");
    t.end();
});

test("Test Entrance Road",function(t){
    var planner = new StreetPlanner(layout2015);
    var result = planner.entranceRoad;
    t.ok(result,"created all streets");
    t.equal(result.geometry.coordinates.length,3,"Created 3 segments");
    t.end();
});