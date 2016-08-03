var fs = require('fs');

var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "file": path,
        "audio_dir": path,
        "out": path,
        "base_url": String,
    },
    shortHands = {
        "f": ["--file"], // art.json file
        "a": ["--audio"], // audio tour mp3 files directory
        "o": ["--out"], // outfile for art.json
        "b": ["--base"] // base URL for audio URLs ending with '/' e.g. https://iburn-data.iburnapp.com/ 
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

var art = JSON.parse(fs.readFileSync(parsed.file, 'utf8'));
var key = parsed.key;
var base_url = parsed.base_url;
var audio_dir = parsed.audio_dir;
console.log('audio_dir ' + audio_dir);
var file_names = fs.readdirSync(parsed.audio_dir);
var key_name = "audio_tour_url";

var result = [];
art.map(function(item) {
    var filename = item.uid + '.mp3';
    var has_tour = (file_names.indexOf(filename) > -1);
    if (has_tour) {
        var audio_tour_url = base_url + filename;
        item[key_name] = audio_tour_url;
        console.log('audio tour for ' + item.name + ': ' + audio_tour_url);
    }
    result.push(item);
});

if (parsed.out) {
    fs.writeFile(parsed.out, JSON.stringify(result, null, 4), function(err) {});
} else {
    console.log(JSON.stringify(result));
}