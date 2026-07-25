#!/usr/bin/env node
/**
 * Package the official BMorg GeoJSON the geocoder needs, plus the year's
 * config, into a single JSON file.
 *
 * Two reasons this exists:
 *  - browserify can require .json but not .geojson, so the bundle needs one
 *    packaged file rather than five official ones;
 *  - it drops the layers and properties the geocoder never reads, which keeps
 *    the shipped bundle small.
 *
 * Usage:
 *   node src/cli/build_geocoder_data.js --data-root ../../ --year 2026 \
 *     --output ../../data/2026/geocoder/geocoder-data.json
 */
var fs = require('fs');
var path = require('path');
var nopt = require('nopt');
var load = require('../orggeocoder/load.js');
var schema = require('../orggeocoder/schema.js');

var COORD_DECIMALS = 7; // ~1cm; well past survey precision

var knownOpts = {
  'data-root': path,
  'year': Number,
  'output': path
};
var shortHands = {
  'r': ['--data-root'],
  'y': ['--year'],
  'o': ['--output']
};
var argv = nopt(knownOpts, shortHands, process.argv, 2);

if (!argv.year || !argv.output) {
  console.error('Usage: build_geocoder_data.js --data-root <iBurn-Data> --year <YYYY> --output <file.json>');
  process.exit(1);
}

var dataRoot = argv['data-root'] || path.join(__dirname, '..', '..', '..', '..');
var orgData = load.forYear(dataRoot, argv.year);

function roundCoords(coords) {
  if (typeof coords[0] === 'number') {
    return coords.map(function(value) {
      return parseFloat(value.toFixed(COORD_DECIMALS));
    });
  }
  return coords.map(roundCoords);
}

function trim(collection, keepProperties) {
  return {
    type: 'FeatureCollection',
    features: collection.features.map(function(feature) {
      var properties = {};
      keepProperties.forEach(function(key) {
        if (feature.properties && feature.properties[key] !== undefined) {
          properties[key] = feature.properties[key];
        }
      });
      return {
        type: 'Feature',
        properties: properties,
        geometry: {
          type: feature.geometry.type,
          coordinates: roundCoords(feature.geometry.coordinates)
        }
      };
    })
  };
}

// Only streets the geocoder can name: the lettered rings and clock radials.
var streetLines = {
  type: 'FeatureCollection',
  features: orgData.streetLines.features.filter(function(feature) {
    var streetClass = schema.streetClass(feature.properties);
    return (streetClass === 'annular' || streetClass === 'radial') && schema.name(feature.properties);
  })
};

var packaged = {
  streetLines: trim(streetLines, ['name', 'Name', 'NAME', 'source', 'type', 'kind', 'width_ft', 'width']),
  plazas: trim(orgData.plazas, ['name', 'Name', 'NAME']),
  cpns: trim(orgData.cpns, ['NAME', 'Name', 'name', 'TYPE']),
  fence: trim(orgData.fence, []),
  config: orgData.config
};

fs.writeFileSync(argv.output, JSON.stringify(packaged));

console.log('wrote ' + argv.output);
console.log('  streets: ' + packaged.streetLines.features.length +
  ' (from ' + orgData.streetLines.features.length + ')');
console.log('  plazas:  ' + packaged.plazas.features.length);
console.log('  cpns:    ' + packaged.cpns.features.length);
console.log('  size:    ' + fs.statSync(argv.output).size + ' bytes');
