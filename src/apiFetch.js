var request = require('request');
var fs = require('fs');

var nopt = require("nopt"), 
    path = require("path"),
    knownOpts = {
        "key": String,
        "type" : [ "art", "camp", "event" ],
        "year" : String,
        "out" : path
    },
    shortHands = {
        "k": ["--key"]
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);



var url = "https://api.burningman.org/api/v1/" + parsed.type + "?year=" + parsed.year

console.log(url)


request.get(url, {
  'auth': {
    'user': parsed.key,
    'sendImmediately': false
  }
}, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    if (parsed.out) {
        fs.writeFile(parsed.out,body,function(err){});
    } else {
        console.log(body);
    }
  } else {
    console.log(respnose.statusCode + ": " + error);
  }
});