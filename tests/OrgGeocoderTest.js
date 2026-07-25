var test = require('tape');
var fs = require('fs');
var path = require('path');
var turf = require('@turf/turf');
var load = require('../src/orggeocoder/load.js');
var OrgGeocoder = require('../src/orggeocoder/geocoder.js');

// These tests run against BMorg's official GeoJSON, which lives in the parent
// iBurn-Data checkout rather than in this repo — that's the whole point of the
// org geocoder, so we read the real thing instead of duplicating it here. In a
// standalone clone of BlackRockCityPlanner the data isn't present and the
// suite skips rather than fails.
var DATA_ROOT = path.join(__dirname, '..', '..', '..');

function orgDataAvailable(year) {
  return fs.existsSync(path.join(DATA_ROOT, 'bmorg', 'innovate-GIS-data', String(year), 'GeoJSON', 'street_lines.geojson')) &&
         fs.existsSync(path.join(DATA_ROOT, 'data', String(year), 'geocoder', 'config.json'));
}

function coderFor(year) {
  return new OrgGeocoder(load.forYear(DATA_ROOT, year));
}

test('orgReverseStreetIntersections2026', function(t) {
    if (!orgDataAvailable(2026)) {
        t.skip('iBurn-Data org GeoJSON not available');
        return t.end();
    }
    var coder = coderFor(2026);

    // Every intersection of an official radial with an official ring should
    // reverse to exactly that address. Ground truth is computed from the org
    // geometry itself, so this is a true conformance check rather than a
    // comparison against our own generated city.
    var data = load.forYear(DATA_ROOT, 2026);
    var streetNames = data.config.street_names;
    var annulars = data.streetLines.features.filter(function(f) {
        return f.properties.source === 'annular';
    });
    var radials = data.streetLines.features.filter(function(f) {
        return f.properties.source === 'radial' && /^\d{1,2}:\d{2}$/.test(f.properties.name);
    });

    var checked = 0;
    var exact = 0;
    var insidePlaza = 0;
    var wrong = [];

    radials.forEach(function(radial) {
        annulars.forEach(function(annular) {
            var streetName = streetNames[String(annular.properties.name).toUpperCase()];
            if (!streetName) {
                return;
            }
            var crossings = turf.lineIntersect(radial, annular);
            if (!crossings.features.length) {
                return;
            }
            var coords = crossings.features[0].geometry.coordinates;
            var result = coder.reverse(coords[1], coords[0]);
            checked++;
            if (result === radial.properties.name + ' & ' + streetName) {
                exact++;
            } else if (/Plaza|Center Camp/.test(result)) {
                // Plazas sit on top of some intersections; naming the plaza
                // there matches the official map.
                insidePlaza++;
            } else {
                wrong.push(radial.properties.name + ' & ' + streetName + ' -> ' + result);
            }
        });
    });

    t.ok(checked > 400, 'checked ' + checked + ' official intersections');
    t.equal(wrong.length, 0, 'no mis-geocoded intersections' + (wrong.length ? ': ' + wrong.slice(0, 5).join('; ') : ''));
    t.ok(exact > 450, exact + ' exact street matches, ' + insidePlaza + ' inside plazas');
    t.end();
});

test('orgReverseLandmarks2026', function(t) {
    if (!orgDataAvailable(2026)) {
        t.skip('iBurn-Data org GeoJSON not available');
        return t.end();
    }
    var coder = coderFor(2026);

    t.equal(coder.reverse(40.77742887048405, -119.21554727164684), 'Center Camp Plaza',
        'Center Camp Plaza polygon');

    // Inside the Center Camp keyhole: Esplanade has a gap here, so this is
    // neither a street nor open playa.
    t.equal(coder.reverse(40.7784, -119.2150), 'Center Camp', 'Center Camp keyhole');

    t.equal(coder.reverse(40.659, -119.363), 'Outside Black Rock City', 'far outside the fence');

    // Deep playa must stay playa — the keyhole rule must not leak out here,
    // where there are no rings at all at this bearing.
    var deepPlaya = coder.reverse(40.795, -119.195);
    t.ok(/Playa$/.test(deepPlaya), 'deep playa stays playa: ' + deepPlaya);

    var manward = coder.reverse(40.7815, -119.2079);
    t.ok(/Inner Playa$/.test(manward), 'between the Man and Esplanade is Inner Playa: ' + manward);

    t.end();
});

test('orgForwardRoundTrip2026', function(t) {
    if (!orgDataAvailable(2026)) {
        t.skip('iBurn-Data org GeoJSON not available');
        return t.end();
    }
    var coder = coderFor(2026);

    ['3:00 & Ararat', '7:30 & Delphi', '9:15 & Iroko', '4:45 & Great Oak', '2:30 & Ceiba']
        .forEach(function(address) {
            var parts = address.split(' & ');
            var point = coder.forward(address);
            if (!point) {
                return t.fail('no forward result for ' + address);
            }
            var back = coder.reverse(point.geometry.coordinates[1], point.geometry.coordinates[0]);
            t.equal(back, address, 'round trip ' + address);
        });

    t.end();
});

test('orgForwardAddressFormats2026', function(t) {
    if (!orgDataAvailable(2026)) {
        t.skip('iBurn-Data org GeoJSON not available');
        return t.end();
    }
    var coder = coderFor(2026);
    var man = coder.dict.center;

    // Letters and themed names are interchangeable, as the BM API has used
    // both across years.
    var byName = coder.forward('3:00 & Ceiba');
    var byLetter = coder.forward('3:00 & C');
    t.ok(byName && byLetter, 'both spellings resolve');
    t.ok(turf.distance(byName, byLetter, {units: 'miles'}) * 5280 < 1, 'letter and name agree');

    // Time + distance
    var timeDistance = coder.forward("3:00 & 500'");
    var feet = turf.distance(man, timeDistance, {units: 'miles'}) * 5280;
    t.ok(Math.abs(feet - 500) < 5, "3:00 & 500' is 500' from the Man (" + Math.round(feet) + "')");

    // Every themed street resolves at 6:30 and lands on its own ring
    Object.keys(coder.dict.config.street_names).forEach(function(letter) {
        var streetName = coder.dict.config.street_names[letter];
        var point = coder.forward('6:30 & ' + streetName);
        if (!point) {
            return t.fail('no forward result for 6:30 & ' + streetName);
        }
        var back = coder.reverse(point.geometry.coordinates[1], point.geometry.coordinates[0]);
        t.ok(back.indexOf(streetName) >= 0 || /Plaza|Center Camp/.test(back),
            '6:30 & ' + streetName + ' round trips (' + back + ')');
    });

    // Landmarks
    var centerCamp = coder.forward('Center Camp Plaza');
    t.ok(centerCamp, 'Center Camp Plaza resolves');
    t.equal(coder.reverse(centerCamp.geometry.coordinates[1], centerCamp.geometry.coordinates[0]),
        'Center Camp Plaza', 'Center Camp Plaza round trips');

    // "<ring> & <time> Portal" is a street intersection, not the portal CPN
    var portalAndRing = coder.forward('3:00 Portal & Ararat');
    t.ok(portalAndRing, '3:00 Portal & Ararat resolves');
    var portalBack = coder.reverse(portalAndRing.geometry.coordinates[1], portalAndRing.geometry.coordinates[0]);
    t.ok(portalBack.indexOf('Ararat') >= 0 || /Plaza/.test(portalBack),
        '3:00 Portal & Ararat lands on Ararat (' + portalBack + ')');

    t.end();
});

test('orgNeverUndefined2026', function(t) {
    if (!orgDataAvailable(2026)) {
        t.skip('iBurn-Data org GeoJSON not available');
        return t.end();
    }
    var coder = coderFor(2026);

    var bad = 0;
    for (var lat = 40.75; lat <= 40.81; lat += 0.002) {
        for (var lon = -119.25; lon <= -119.17; lon += 0.002) {
            var result = coder.reverse(lat, lon);
            if (!result || String(result).indexOf('undefined') >= 0 || /Rod/.test(result)) {
                bad++;
                t.fail('bad result at ' + lat + ',' + lon + ': ' + result);
            }
        }
    }
    t.equal(bad, 0, 'no undefined or retired-street addresses across city sweep');
    t.end();
});

test('orgHandlesPriorYearSchema2025', function(t) {
    if (!orgDataAvailable(2025)) {
        t.skip('2025 org GeoJSON / config not available');
        return t.end();
    }
    // The 2025 drop uses a different schema than 2026 ({type, width} vs
    // {source, kind, width_ft}) and ships themed street names instead of
    // letters. The adapter should absorb both.
    var coder = coderFor(2025);

    t.equal(coder.dict.rings.length, 12, '12 rings parsed from the 2025 schema');
    var names = coder.dict.rings.map(function(ring) { return ring.name; });
    t.ok(names.indexOf('Esplanade') >= 0 && names.indexOf('Kilgore') >= 0,
        '2025 street names: ' + names.join(', '));

    // BMorg spelled J "Jemison" in the GIS data and "Jemisin" in the street
    // announcement; both, and the letter, must resolve.
    ['3:00 & J', '3:00 & Jemisin', '3:00 & Jemison'].forEach(function(address) {
        t.ok(coder.forward(address), address + ' resolves');
    });

    t.end();
});

test('orgForwardMatchesPublishedCampGps2025', function(t) {
    var campPath = path.join(DATA_ROOT, 'data', '2025', 'APIData', 'APIData.bundle', 'camp.json');
    if (!orgDataAvailable(2025) || !fs.existsSync(campPath)) {
        t.skip('2025 camp data not available');
        return t.end();
    }
    var coder = coderFor(2025);
    var camps = JSON.parse(fs.readFileSync(campPath, 'utf8')).filter(function(camp) {
        return camp.location_string && camp.location && camp.location.gps_latitude;
    });

    var errorsFt = [];
    var failed = [];
    camps.forEach(function(camp) {
        var point = coder.forward(camp.location_string);
        if (!point || !point.geometry) {
            failed.push(camp.location_string);
            return;
        }
        var resolved = point.geometry.type === 'Point' ? point : turf.centroid(point);
        var published = turf.point([camp.location.gps_longitude, camp.location.gps_latitude]);
        errorsFt.push(turf.distance(resolved, published, {units: 'miles'}) * 5280);
    });

    t.ok(camps.length > 1000, 'checked ' + camps.length + ' published camp addresses');
    t.equal(failed.length, 0, 'every published address resolves' +
        (failed.length ? ': ' + failed.slice(0, 5).join('; ') : ''));

    errorsFt.sort(function(a, b) { return a - b; });
    var median = errorsFt[Math.floor(errorsFt.length / 2)];
    var withinBlock = errorsFt.filter(function(ft) { return ft <= 150; }).length / errorsFt.length;
    t.ok(median < 50, 'median offset from published GPS is ' + Math.round(median) + "'");
    t.ok(withinBlock > 0.95, Math.round(withinBlock * 100) + '% within 150ft of published GPS');
    t.end();
});
