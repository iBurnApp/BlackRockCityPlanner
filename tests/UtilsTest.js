var utils = require('../src/utils');
var test = require('tape');

test('Test angle compare', function(t) {
    
    t.ok(!utils.bearingCompare(360,45),"Compare 360 to 45");
    t.ok(!utils.bearingCompare(0,45),"compare 45 to 360");
    t.end()
});