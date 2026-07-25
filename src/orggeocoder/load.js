var fs = require('fs');
var path = require('path');

/**
 * Node-side loader for the org geocoder's inputs. Not used by the browserified
 * bundle (see index.js, which requires the files statically so browserify can
 * inline them).
 *
 * @param options.gisDir  path to bmorg/innovate-GIS-data/<year>/GeoJSON
 * @param options.config  path to the year's geocoder config.json
 */
module.exports = function(options) {
  function read(name) {
    return JSON.parse(fs.readFileSync(path.join(options.gisDir, name), 'utf8'));
  }

  return {
    streetLines: read('street_lines.geojson'),
    plazas: read('plazas.geojson'),
    cpns: read('cpns.geojson'),
    fence: read('trash_fence.geojson'),
    config: JSON.parse(fs.readFileSync(options.config, 'utf8'))
  };
};

/** Convenience: resolve the standard layout of an iBurn-Data checkout. */
module.exports.forYear = function(dataRoot, year) {
  return module.exports({
    gisDir: path.join(dataRoot, 'bmorg', 'innovate-GIS-data', String(year), 'GeoJSON'),
    config: path.join(dataRoot, 'data', String(year), 'geocoder', 'config.json')
  });
};
