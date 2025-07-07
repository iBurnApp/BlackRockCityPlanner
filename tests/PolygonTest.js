var Polygons = require('../src/polygons.js');
var test = require('tape');
var layout2015 = require('./layout2015.json');
var turf = require('@turf/turf');
var StreetPlanner = require('../src/streetplanner');
var streetPlanner = new StreetPlanner(layout2015);

test("Create Center Camp Area",function(t){
    var result = Polygons.centerCampPolygon(streetPlanner);
    t.ok(result,"Created polygon");
    t.ok(turf.area(result) > 5, "Has area")


    t.end();
});

test("Create Inner Playa Polygon",function(t){
    var result = Polygons.innerPlaya(streetPlanner);
    t.ok(result,"Created polygon");
    t.equal(result.geometry.coordinates.length,1,"One outer polygon");
    t.ok(turf.area(result) > 5, "Has area");

    t.end();
});

test("Create Streets Polygon",function(t){
    var result = Polygons.streetsArea(streetPlanner);

    t.ok(result,"Created polygon");
    t.equal(result.geometry.coordinates.length,1,"One outer polygon");
    t.ok(turf.area(result) > 5, "Has area");

    t.end();
});

test("Create Outer Playa Polygon",function(t){
    var result = Polygons.outerPlaya(streetPlanner);

    t.ok(result,"Created polygon");
    t.equal(result.geometry.coordinates.length,2,"Cut out polygon");
    t.ok(turf.area(result) > 5, "Has area");

    t.end();
});

test("Create Plazas",function(t){
    var result = Polygons.plazas(streetPlanner);

    t.ok(result,"Created plazas");
    t.equal(result.features.length,8,"There are 8 plazas total calculated here");
    t.ok(turf.area(result.features[0]) > 5, "the plazas have an area");

    t.end();
});

test("Create Portals",function(t){
    var result = Polygons.portals(streetPlanner);

    t.ok(result,"Created portals");
    t.equal(result.features.length,5,"there are the right amount of portals");
    t.end();
});

test("Create Center Camp Polygons",function(t){
    var result = Polygons.centerCampPolygons(streetPlanner);
    t.ok(result,"Created polygons");
    t.equal(result.features.length,2,"Should have 2 features");
    t.end();
});

test("Create all polygons",function(t){
    var result = Polygons.allPolygons(streetPlanner);
    t.ok(result,"Created all polygons");
    t.equal(result.features.length,15,"Should be 15 polygons");
    t.end();
});

test("Create Street Outline", function(t){
    var result = Polygons.streetsOutline(streetPlanner);
    t.ok(result,"Created streets outline");
    t.ok(result.geometry.coordinates.length > 250,"Should have many coordinates for street outline");
    t.ok(turf.area(result) > 1000, "make sure has some area");
    t.end()
});

test("Create city polygon outline",function(t){
    var result = Polygons.cityOutline(streetPlanner);
    t.ok(result,"Created city outline");
    t.ok(result.features[0].geometry.coordinates.length > 250,"Should have many coordinates for city outline");
    t.ok(turf.area(result) > 1000, "make sure has some area");
    t.end();
})