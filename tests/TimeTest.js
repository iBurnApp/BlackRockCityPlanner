var test = require('tape');
var Time = require('../src/time.js');
var testUtils = require('./testUtils.js');

var data = {
    "12:00":[12,0],
    "0:00":[0,0],
    "1:00":[1,0],
    "6:45":[6,45]
};


test('string to array',function(t){
    for (var time in data) {
        var result = Time.timeFromString(time)
        t.ok(testUtils.arraysEqual(result,data[time]), "Checking conversion "+time+" to "+data[time])
    }
    t.end();
});

test('hour minute to string',function(t){
    for (var time in data) {
        var hour = data[time][0];
        var min = data[time][1];
        var result = Time.timeString(hour,min);
        t.equal(time,result, "Checking conversion "+data[time]+" to "+ time)
    }
    t.end();
});
