var Geo = require('../src/geo.js');
var test = require('tape');
var layout = require('./layout2015.json');
var turf = require('turf');


var verifyArc = function(t,arc,coordinatesCount,distanceExpected) {
    t.ok(arc,"Created arc");
    t.equal(arc.geometry.type ,'LineString',"Correct geometry type");
    t.equal(arc.geometry.coordinates.length, coordinatesCount,"Correct number of points")
    var distance = turf.lineDistance(arc,'miles');
    var error = Math.abs(distance - distanceExpected);
    t.ok(error < .001,"Correct Length");
};


test('test-arcs',function(t){

    var arc = Geo.arc(layout.center,1,'miles',45.0,90.0,1);
    verifyArc(t,arc,46,Math.PI/4.0);
    var arc1 = Geo.arc(layout.center,1,'miles',0,-180,1);
    verifyArc(t,arc1,181,Math.PI);
    var arc2 = Geo.arc(layout.center,1,'miles',0,180,1);
    verifyArc(t,arc2,181,Math.PI);
    t.deepEqual(arc1,arc2,"Equal arcs");
    var circle = Geo.arc(layout.center,1,'miles',0,360,1);
    verifyArc(t,circle,361,2*Math.PI);
    t.end();
})
