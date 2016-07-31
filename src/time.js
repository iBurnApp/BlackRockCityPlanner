

module.exports.timeString = function(hour, minutes) {
    minutes = (minutes < 10) ? ("0" + minutes) : minutes;

    var hours = Math.floor(hour)
    return hours+":"+minutes;
};

module.exports.timeFromString = function(timeString) {
    var result = timeString.split(":").map(function(x) {
        return parseInt(x, 10);
    });
    return result;
};