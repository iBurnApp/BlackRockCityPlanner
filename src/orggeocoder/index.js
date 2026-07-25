var OrgGeocoder = require('./geocoder.js');

// Browserify entry point. The require is static so browserify inlines the
// data; the apps ship one self-contained file and do no I/O at runtime.
//
// geocoder-data.json is built from BMorg's official GeoJSON plus the year's
// config by src/cli/build_geocoder_data.js — regenerate it whenever the GIS
// submodule or the config changes. The year appears here only.
var orgData = require('../../../../data/2026/geocoder/geocoder-data.json');

/**
 * Building the geocoder walks every official street centerline, so make it
 * once and reuse it. The instance is stateless once built.
 *
 * Matches the legacy bundle's interface exactly (window.prepare /
 * reverseGeocode / forwardGeocode), so iOS JavaScriptCore and Android J2V8
 * need no changes to swap bundles.
 */
global.prepare = function() {
  return new OrgGeocoder(orgData);
};

global.reverseGeocode = function(coder, lat, lon) {
  return coder.reverse(lat, lon);
};

global.forwardGeocode = function(coder, locationString) {
  return coder.forward(locationString);
};
