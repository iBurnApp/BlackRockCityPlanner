/**
 * Created by david on 6/21/16.
 */
var Distance = require('./distance');
var math = require('mathjs');

var Range = function(start,end) {
    this.start = start;
    this.end = end;
}

Range.prototype.midPoint = function(lookupDictionary) {
    var s = this.start.mathObject(lookupDictionary);
    var e = this.end.mathObject(lookupDictionary);
    var dist = math.multiply(math.add(s, e), 0.5);
    var result =  new Distance(0);
    result.distance = dist;
    return result;
};


module.exports = Range;