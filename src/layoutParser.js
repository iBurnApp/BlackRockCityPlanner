/**
 * Created by david on 6/21/16.
 */
var Distance = require('./distance');
var Range = require('./range');
var Clock = require('./clock');

var createStreetLookupDict = function(json) {
    var lookupDict = {};
    json.cStreets.forEach(function(item){
        lookupDict[item.ref] = new Distance(item.distance,'ft');
    });
    return lookupDict;
}

var LayoutParser = function(json) {
    this.center = json.center;
    this.bearing = json.bearing;
    this.streetLookupDistance = createStreetLookupDict(json);
};

LayoutParser.prototype.generateClock = function() {
    return new Clock(this.center,this.bearing);
};




module.exports = LayoutParser;