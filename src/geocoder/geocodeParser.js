


var parseTimeString = function(timeString) {
  //Time Regex 12:00
  var timeRegEx = new RegExp("([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]");
  var timeArray = timeRegEx.exec(timeString);
  if (timeArray != null && timeArray.length > 0) {
    return timeArray[0];
  }
  return null;
}

var parseDistanceString = function(distanceString) {
  //Distance regex 100'
  var feetRegEx = new RegExp("[0-9]*(?=')");
  var feet = -1;
  var feetArray = feetRegEx.exec(distanceString);
  if (feetArray != null && feetArray.length > 0) {
    if (feetArray[0].length > 0) {
      feet = Number(feetArray[0]);
    }
  }
  return feet;
};

var parseFeatureString = function(featureString) {
  //featureRegEx captures streets A-L Rod's road and plazas when they begin the string and are followed by ' &' or are at the end
  var featureRegEx = new RegExp("(^[a-l|rod|p].*)|(^.*plaza.*$)|(^.*portal.*$)");
  // Lower case string to handle A & a street names
  let lowerCaseFeatureString = featureString.toLowerCase();
  var featureArray = featureRegEx.exec(lowerCaseFeatureString);
  var feature;
  if (featureArray != null && featureArray.length > 0) {
    feature = featureArray[0];
  }
  return feature;
};


/**
 This parses the location string into it seperate pieces
 timeString eg 12:00 11:43
 feet is number from the format 100'
 feature is either a street, plaza or portal,

 @param string The string to be parsed
 @param callback a function with 3 parameters: timeString, feet, feature
 @return
 */

var parse = function(string1,string2) {
  if (string1 === undefined) {
    return;
  }

  if (string2 !== undefined) {
    return parseFeatures(string1,string2);
  }

  var string = string1.trim()
  string = string.toLowerCase()


  var split = string.split(/(?: @|&)/);
  if (split.length > 1) {
    var result = {"distance":-1};
    split.forEach(function(item){
      var newResult = parse(item.trim());
      if (newResult.time) {
        result.time = newResult.time;
      }

      if (newResult.distance >- 0) {
        result.distance = newResult.distance;
      }

      if (newResult.feature) {
        result.feature = newResult.feature
      }
    });
    return result;
  } else {
    var timeString = parseTimeString(string);

    var feet = parseDistanceString(string);

    var feature  = parseFeatureString(string);

    var result = {"time": timeString, "distance": feet, "feature": feature};
    return result;
  }
};

var parseFeatures = function(feature1,feature2) {
    var result1 = parse(feature1);
    var result2 = parse(feature2);
    for (var key in result2) {
      if (result2[key]) {
        result1[key] = result2[key];
      }

    }
    return result1;
  }


module.exports.parseTimeString     = parseTimeString;
module.exports.parseDistanceString = parseDistanceString;
module.exports.parseFeatureString  = parseFeatureString;
module.exports.parse               = parse;
module.exports.parseFeatures       = parseFeatures;
