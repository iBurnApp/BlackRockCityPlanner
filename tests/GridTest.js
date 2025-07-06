var layout2015 = require('./layout2015.json');
var Grid = require('../src/grid.js');
var test = require('tape');
var Time = require('../src/time.js')
var testUtils = require('./testUtils.js');
var turf = require('@turf/turf')

test('Grid-Save', function(t) {

  var grid = new Grid(layout2015.center,layout2015.bearing,layout2015.cStreets);

  grid.save(1,0,5,"1:00-5");
  grid.save(1,0,6,"1:00-6");
  grid.save(2,0,6,"2:00-6");
  grid.save(2,0,5,"2:00-5");
  grid.save(3,0,5,"3:00-5");


  t.equal(grid.fetch(1,0,5),"1:00-5");
  t.equal(grid.fetch(1,0,6),"1:00-6");
  t.equal(grid.fetch(2,0,6),"2:00-6");
  t.equal(grid.fetch(2,0,5),"2:00-5");
  t.equal(grid.fetch(3,0,5),"3:00-5");

  t.end();
});

test('Grid get points along distance',function (t) {
  var grid = new Grid(layout2015.center, layout2015.bearing, layout2015.cStreets);

  grid.save(4,0,5,"4:00-5");
  grid.save(4,0,6,"4:00-6");
  grid.save(2,0,6,"2:00-6");
  grid.save(2,0,5,"2:00-5");
  grid.save(3,0,5,"3:00-5");

  var result = grid.allPointsAlongDistance(5);
  t.end();
});

test('Generate Grid', function(t) {
  var grid = new Grid(layout2015.center,layout2015.bearing,layout2015.cStreets);
  var timeArray = ["9:00","3:30"];
  var distanceArray = [0.5,1.2];

  timeArray.forEach(function(time, index, array){
    distanceArray.forEach(function(distance, index, array){
      var hour = Time.timeFromString(time)[0];
      var minute = Time.timeFromString(time)[1];
      var point = grid.point(hour,minute,distance);
      console.log("Testing: "+time+" "+distance);
      t.ok(point.geometry.coordinates[0],"Valid point");
      t.ok(point.geometry.coordinates[1],"Valid point");
      var pointAgain = grid.point(hour,minute,distance);
      t.ok(testUtils.arraysEqual(point.geometry.coordinates,pointAgain),"Checking Equal Coordinates")
    });
  });

  t.end();
});

test('Remove within polygon',function(t){
  var polygon = turf.polygon([[[-119.2042350769043, 40.79431840216349], [-119.22672271728516, 40.778591629746124], [-119.18964385986327, 40.7737818731648], [-119.2042350769043, 40.79431840216349]]]);
  var pointInside = turf.point([-119.20663833618163, 40.78405093143805]);
  var pointOutside = turf.point([-119.18346405029297, 40.791849155467695]);

  var grid = new Grid(layout2015.center,layout2015.bearing,layout2015.cStreets);
  grid.save(5,0,5,pointInside.geometry.coordinates);
  grid.save(6,0,6,pointOutside.geometry.coordinates);
  grid.removePoints(polygon);
  var noPoint = grid.fetch(5,0,5);
  var point = grid.fetch(6,0,6);
  t.notok(noPoint);
  t.ok(point);
  t.end();
})
