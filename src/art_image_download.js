var fs = require('fs');
var http = require('http');
/*
    {
        "uid": "a2Id0000000cbObEAI",
        "year": 2016,
        "name": "Lord Snort",
        "url": null,
        "contact_email": "tedrickart@sbcglobal.net",
        "hometown": "Glen Ellen, CA",
        "description": "Lord Snort is a wild boar roughly 20' tall and 30' long which balances on a shaft, allowing it to rotate 360 degrees. Made of steel, it is rough and unbreakable and people can climb all over it. It will serve as a gathering point for unimagined interactions.",
        "artist": "Bryan Tedrick",
        "category": null,
        "program": "Honorarium",
        "donation_link": null,
        "images": [
            {
                "gallery_ref": 82828,
                "thumbnail_url": "http://galleries.burningman.org/include/../filestore/tmp/api_resource_cache/82828_bbe3408f7c71e6bcc6dc11bb9c5e3695.jpg"
            }
        ],
        "audio_tour_url": "https://iburn-data.iburnapp.com/2016/audio_tour/a2Id0000000cbObEAI.mp3"
    },
*/

var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "file": path,
        "out": path,
    },
    shortHands = {
        "f": ["--file"], // art.json file
        "o": ["--out"], // output directory for art images
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

// http://stackoverflow.com/a/22907134
var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

var art = JSON.parse(fs.readFileSync(parsed.file, 'utf8'));
var out_dir = parsed.out;
var count = 0;

art.map(function(item) {
    var images = item["images"];
    if (images && images.length > 0) {
        var image_url = images[0].thumbnail_url;
        var uid = item.uid;
        var filename = uid + '.jpg';
        var filepath = path.join(out_dir, filename);
        console.log('Downloading ' + image_url + ' to ' + filepath);
        download(image_url, filepath, function(err) {console.log(err);});
        count++;
    }
});

console.log('count: ' + count);