var Clock = require('../src/clock.js');
var test = require('tape');
var layout = require('./layout2015.json');
var turf = require('@turf/turf');
var Time = require('../src/time.js');

var timeDict = {
  "12:00": 45,
  "3:00" : 135,
  "6:00" : -135,
  "9:00" : -45,
  "10:30": 0,
  "00:00": 45,
  "16:30": 180
};


test('Clock-Point', function(t){

  var clock = new Clock(layout.center,layout.bearing);

  var distance = 0.5;
  var unit = 'miles';

  for (var time in timeDict) {
    var hour = Time.timeFromString(time)[0];
    var min = Time.timeFromString(time)[1];

    var newPoint = clock.point(hour,min,distance,unit);
    var calculatedDistance = turf.distance(layout.center,newPoint, unit);
    var goodEnoughDistance = Math.abs(distance-calculatedDistance) < 0.001;
    var bearing = turf.bearing(layout.center,newPoint).toFixed(2);
    t.ok(bearing-timeDict[time] === 0,"Should be equal Bearing");
    t.ok(goodEnoughDistance,"Should be equal distance");
  }

  t.end();
});

test('Clock-Line', function(t){

  var clock = new Clock(layout.center,layout.bearing);

  var distance = 0.5;
  var unit = 'miles';

  for (var time in timeDict) {
    var hour = Time.timeFromString(time)[0];
    var min = Time.timeFromString(time)[1];

    var newLine = clock.line(hour,min,distance,unit);
    t.ok(newLine,"Created Clock Line");
  }

  t.end();
});

test("Clock-Arc", function(t) {
  var result = Clock.arcTimes(11,00,12,00,1);
  result = Clock.arcTimes(5,30,6,30,1);
  t.equal(result.length,61,"Check length");

  result = Clock.arcTimes(11,45,1,00,5);
  t.equal(result.length,16,"Check length");

  result = Clock.arcTimes(0,0,12,0,1);
  t.equal(result.length,721,"Total ring arc");

  t.end()
});
