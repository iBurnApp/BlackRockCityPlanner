var fs = require('fs');
var path = require('path');
var load = require('./load.js');
var OrgGeocoder = require('./geocoder.js');
var LegacyGeocoder = require('../geocoder/geocoder.js');

/**
 * Builds the geocoder the data pipeline should use.
 *
 * BMorg's official GeoJSON is the source of truth wherever it exists. The CLI
 * tools still take `--layout path/to/data/<year>/layouts/layout.json`, so the
 * year and checkout root are inferred from that path and the org data is used
 * when present; years predating the GIS drops fall back to the layout-driven
 * geocoder so old data stays reproducible.
 */

/** Org-backed geocoder for a year, or null if that year has no org data. */
function forYear(dataRoot, year) {
  var gisDir = path.join(dataRoot, 'bmorg', 'innovate-GIS-data', String(year), 'GeoJSON');
  var config = path.join(dataRoot, 'data', String(year), 'geocoder', 'config.json');
  if (!fs.existsSync(path.join(gisDir, 'street_lines.geojson')) || !fs.existsSync(config)) {
    return null;
  }
  return new OrgGeocoder(load({gisDir: gisDir, config: config}));
}

/** Org-backed geocoder implied by a `data/<year>/layouts/layout.json` path. */
function forLayoutPath(layoutPath) {
  if (!layoutPath) {
    return null;
  }
  var resolved = path.resolve(layoutPath);
  var match = /^(.*)[\\/]data[\\/](\d{4})[\\/]/.exec(resolved);
  if (!match) {
    return null;
  }
  return forYear(match[1], match[2]);
}

/**
 * The geocoder to use for a layout path: org-backed when available, otherwise
 * the legacy layout-driven one. Logs which, since the two can differ slightly.
 */
function forLayout(layoutPath, layoutData) {
  var org = forLayoutPath(layoutPath);
  if (org) {
    console.log('Geocoding against official BMorg GIS data (' + org.dict.config.year + ')');
    return org;
  }
  console.log('No official GIS data for this year; geocoding from ' + layoutPath);
  return new LegacyGeocoder(layoutData);
}

module.exports = {
  forYear: forYear,
  forLayoutPath: forLayoutPath,
  forLayout: forLayout
};
