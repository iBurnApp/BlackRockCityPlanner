var https = require('https');
var tj = require('togeojson'),
    // node doesn't have xml parsing or a dom. use jsdom
    jsdom = require('jsdom').jsdom;

module.exports.kmlToGeoJSON = function(url,callback) {
  var request = https.get(url, function(response){
    var xml = [];
    response.on('data', function(data) {

      xml.push(data);

    }).on('end', function() {
      var kml = jsdom(xml);
      var converted = tj.kml(kml,{ styles: true });
      callback(converted);
    });


  });
};
