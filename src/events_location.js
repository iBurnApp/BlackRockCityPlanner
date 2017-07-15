var fs = require('fs');

var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "art": path,
        "camps": path,
        "events": path,
        "out": path,
    },
    shortHands = {
        "a": ["--art"], // art.json file
        "c": ["--camps"], // camps.json
        "e": ["--events"], // events.json
        "o": ["--out"], // outfile for events.json
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

var art = JSON.parse(fs.readFileSync(parsed.art, 'utf8'));
var camps = JSON.parse(fs.readFileSync(parsed.camps, 'utf8'));
var events = JSON.parse(fs.readFileSync(parsed.events, 'utf8'));

var art_dict = {};
var camps_dict = {};

art.map(function(item) {
    art_dict[item.uid] = item
});
camps.map(function(item) {
    camps_dict[item.uid] = item
});

console.log(art_dict);

events.map(function(item) {
    var camp_item = camps_dict[item.hosted_by_camp];
    var art_item = art_dict[item.located_at_art];

    console.log(camp_item + art_item);

    var location = null;
    var location_string = null;

    if (camp_item) {
        location = camp_item.location;
        location_string = camp_item.location_string;
    } else if (art_item) {
        location = art_item.location;
        location_string = art_item.location_string;
    }

    if (location) {
        item.location = location;
    }
    if (location_string) {
        item.location_string = location_string;
        console.log('found location_string' + location_string + item.uid);
    }
});

if (parsed.out) {
    fs.writeFile(parsed.out, JSON.stringify(events, null, 4), function(err) {});
} else {
    console.log(JSON.stringify(events));
}