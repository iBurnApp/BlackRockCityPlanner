var test = require('tape');
var ToiletParser = require('../src/toiletParser');
var LayoutParser = require('../src/layoutParser');
var toiletJSON = require('./toilets_layout_2015.json');
var layoutJSON = require('./layout2015.json');
var turf = require('@turf/turf');

var layoutParser = new LayoutParser(layoutJSON);

test('Toilet-Parser',function(t){
    var toiletParser = new ToiletParser(toiletJSON);

    t.ok(toiletParser,"created toilet parser");
    t.equal(toiletParser.toiletsInfo.length,37,"Correct number of toilets");

    var polygons = toiletParser.polygons(layoutParser);
    var points = toiletParser.points(layoutParser);

    t.equal(polygons.features.length,37,"Created toilets");

    polygons.features.forEach(function(item){
        var difference = Math.abs(turf.area(item)-930);
        t.ok(difference<1, "Check area of toilet box");
    });

    t.end();
});
