var test = require('tape');
var Geocoder = require('../src/geocoder/geocoder.js');
var layout2026 = require('./layout2026.json');
var turf = require('@turf/turf');

// 2026 layout tests.
//
// The reverse-geocode intersection coordinates below are ground truth derived
// from BMorg's official GIS data (bmorg/innovate-GIS-data 2026/GeoJSON/
// street_lines.geojson @ e9e33e0): each point is the turf.lineIntersect of the
// named radial and annular street centerlines, with the annular letter mapped
// to its 2026 themed name via layout.json cStreets. They are hardcoded here so
// this repo's tests don't depend on the iBurn-Data checkout.
//
// Known boundary behavior (intentional, sub-GPS-accuracy): points exactly on
// the outermost (K) ring centerline or on the Esplanade centerline can fall a
// few feet outside the streets-area polygon and reverse to Outer/Inner Playa
// with the correct clock time. The Esplanade and Kundalini points below are
// nudged 20' along the radial into the street annulus to sit clear of that
// epsilon band.

test('reverse2026StreetIntersections', function(t) {
    var coder = new Geocoder(layout2026);

    var cases = [
        // [lat, lon, expected]
        [40.78145698, -119.21667355, "7:00 & Esplanade"],   // nudged 20' out from ESP centerline
        [40.77755093, -119.20039075, "3:00 & Ararat"],
        [40.78948685, -119.21609378, "9:00 & Bodhi"],
        [40.77845054, -119.19695545, "2:30 & Chomolungma"],
        [40.78324664, -119.22151539, "7:30 & Delphi"],
        [40.77210389, -119.20788409, "4:30 & Eternal"],
        [40.77847258, -119.19272273, "2:15 & Fulcrum"],
        [40.79548241, -119.21455273, "9:45 & Great Oak"],
        [40.78687259, -119.22569078, "8:00 & Heiau"],
        [40.77758987, -119.18992088, "2:15 & Iroko"],
        [40.76849343, -119.21308388, "5:00 & Jiba"],
        [40.79687906, -119.21824057, "9:30 & Kundalini"]    // nudged 20' in from K centerline
    ];

    cases.forEach(function(c) {
        t.equal(coder.reverse(c[0], c[1]), c[2], c[2]);
    });

    t.end();
});

test('reverse2026Landmarks', function(t) {
    var coder = new Geocoder(layout2026);

    // Golden Spike / the Man (layout.json center)
    var result = coder.reverse(40.783242, -119.207871);
    t.ok(result.indexOf("Inner Playa") >= 0, "Man is Inner Playa: " + result);
    t.ok(result.indexOf("0'") >= 0, "Man is at 0': " + result);

    // Center Camp center is the Café
    result = coder.reverse(40.77742887048405, -119.21554727164684);
    t.equal(result, "Café", "Center Camp center is Café");

    // 6:00 promenade between Center Camp and the Man is open playa
    result = coder.reverse(40.77900523, -119.21358625);
    t.ok(result.indexOf("Inner Playa") >= 0, "6:00 keyhole promenade is Inner Playa: " + result);
    t.ok(result.indexOf("6:0") >= 0, "6:00 keyhole promenade is at 6:00: " + result);

    result = coder.reverse(40.659, -119.363);
    t.equal(result, "Outside Black Rock City", "Far away is outside the city");

    t.end();
});

test('reverse2026RodsRoad', function(t) {
    var coder = new Geocoder(layout2026);

    // The Center Camp frontage arc is Rod's Road in 2026 (BMorg "Rods Road",
    // ring radius ~777' from Center Camp center, spanning the Man-facing arc).
    // Its clock time is computed from Center Camp center, 12:00 toward the Man.
    var ccCenter = turf.point([-119.21554727164684, 40.77742887048405]);
    var arcDistanceMiles = layout2026.center_camp.frontage_arc.distance / 5280;

    // True bearing 90° (due east of Center Camp) = 1:30 on the city clock
    var p = turf.destination(ccCenter, arcDistanceMiles, 90, {units: 'miles'});
    var result = coder.reverse(p.geometry.coordinates[1], p.geometry.coordinates[0]);
    t.equal(result, "1:30 & Rod's Road", "East point of frontage arc: " + result);

    // True bearing 0° (due north) = 10:30 on the city clock
    p = turf.destination(ccCenter, arcDistanceMiles, 0, {units: 'miles'});
    result = coder.reverse(p.geometry.coordinates[1], p.geometry.coordinates[0]);
    t.equal(result, "10:30 & Rod's Road", "North point of frontage arc: " + result);

    t.end();
});

test('reverse2026NeverUndefined', function(t) {
    var coder = new Geocoder(layout2026);

    // Sweep a grid across the whole city (and a margin beyond the fence);
    // no result may ever contain "undefined".
    var bad = 0;
    for (var lat = 40.75; lat <= 40.81; lat += 0.002) {
        for (var lon = -119.25; lon <= -119.17; lon += 0.002) {
            var result = coder.reverse(lat, lon);
            if (!result || String(result).indexOf("undefined") >= 0) {
                bad++;
                t.fail("Bad result at " + lat + "," + lon + ": " + result);
            }
        }
    }
    t.equal(bad, 0, "No undefined addresses across city sweep");
    t.end();
});

test('forward2026ThemedStreets', function(t) {
    var coder = new Geocoder(layout2026);
    var man = layout2026.center;

    // Every 2026 themed street should forward-geocode at 6:30 to a point
    // whose distance from the Man matches the ring's layout distance.
    layout2026.cStreets.forEach(function(street) {
        var intersection = coder.forward(street.name + " & 6:30");
        if (!intersection) {
            t.fail("No forward result for " + street.name + " & 6:30");
            return;
        }
        var feet = turf.distance(man, intersection, {units: 'miles'}) * 5280;
        t.ok(Math.abs(feet - street.distance) < 10,
            street.name + " & 6:30 at " + Math.round(feet) + "' (expected " + street.distance + "')");
    });

    t.end();
});

test('forward2026Plazas', function(t) {
    var coder = new Geocoder(layout2026);
    var man = layout2026.center;

    // The two plazas new for 2026
    ["2:00 B Plaza", "10:00 B Plaza"].forEach(function(name) {
        var result = coder.forward(name);
        if (!result) {
            t.fail("No forward result for " + name);
            return;
        }
        var feet = turf.distance(man, result, {units: 'miles'}) * 5280;
        // B ring is at 3215'
        t.ok(Math.abs(feet - 3215) < 200, name + " near B ring at " + Math.round(feet) + "'");
    });

    t.end();
});

test('forwardReverse2026RoundTrip', function(t) {
    var coder = new Geocoder(layout2026);

    // forward("time & street") then reverse() should return the same address
    ["3:00 & Ararat", "7:30 & Delphi", "9:15 & Iroko", "4:45 & Great Oak"].forEach(function(address) {
        var parts = address.split(" & ");
        var point = coder.forward(parts[1] + " & " + parts[0]);
        if (!point) {
            t.fail("No forward result for " + address);
            return;
        }
        var result = coder.reverse(point.geometry.coordinates[1], point.geometry.coordinates[0]);
        t.equal(result, address, "Round trip " + address);
    });

    t.end();
});
