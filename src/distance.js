var math = require('mathjs');

var Distance = function(value,units) {
    if (typeof value === 'string' || value instanceof String) {
        this.value = value;
    } else {
        if (!units) {
            units = 'ft';
        }

        this.distance = math.unit(value,units);
    }

}

//Lookup dictionary should be dict with keys as string ref and value as `Distance`
Distance.prototype.toMiles = function(lookupDictionary) {
    return this.mathObject(lookupDictionary).toNumber('miles');
}

Distance.prototype.toFeet = function(lookupDictionary) {
    return this.mathObject(lookupDictionary).toNumber('ft');
}

Distance.prototype.mathObject = function(lookupDictionary) {
    if(this.distance) {
        return this.distance;
    } else {
        return lookupDictionary[this.value].mathObject(lookupDictionary);
    }
};

module.exports = Distance;