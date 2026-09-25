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


// Basic auth with the API key as the username (what `request`'s auth option sent).
fetch(url, {
  headers: {
    'Authorization': 'Basic ' + Buffer.from(parsed.key + ':').toString('base64')
  }
}).then(function(response) {
  return response.text().then(function(body) {
    if (!response.ok) {
      throw new Error(response.status + ': ' + body);
    }
    if (parsed.out) {
      fs.writeFile(parsed.out, body, function(err) {});
    } else {
      console.log(body);
    }
  });
}).catch(function(error) {
  console.log(error.message);
});
