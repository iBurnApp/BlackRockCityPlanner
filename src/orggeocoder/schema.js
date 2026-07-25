/**
 * BMorg's GIS drop changes shape from year to year. Everything that reads a
 * property of an official feature goes through here so the rest of the
 * geocoder sees one stable schema.
 *
 * Observed so far:
 *   2024/2025  street_lines: {name, type: 'arc'|'radial', width}
 *              plazas:       {Name}
 *              street names are already themed ("Kilgore", "Gibson")
 *   2026       street_lines: {name, source: 'annular'|'radial'|'center_camp',
 *                             kind, width_ft}
 *              plazas:       {name}
 *              street names are letters ("K", "G", "ESP")
 */

/** First defined value among the given property names. */
function prop(properties, names) {
  if (!properties) {
    return undefined;
  }
  for (var i = 0; i < names.length; i++) {
    var value = properties[names[i]];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

/** Feature display name, whatever case the year happens to use. */
function name(properties) {
  var value = prop(properties, ['name', 'Name', 'NAME']);
  return value === undefined ? undefined : String(value).trim();
}

/** 'annular' (lettered rings), 'radial' (clock streets), or something else. */
function streetClass(properties) {
  var value = prop(properties, ['source', 'type']);
  if (value === undefined) {
    return 'other';
  }
  value = String(value).toLowerCase().trim();
  if (value === 'annular' || value === 'arc') {
    return 'annular';
  }
  if (value === 'radial') {
    return 'radial';
  }
  return 'other';
}

/** Street width in feet, falling back to the supplied default. */
function streetWidthFt(properties, fallback) {
  var value = prop(properties, ['width_ft', 'width']);
  var parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

module.exports = {
  prop: prop,
  name: name,
  streetClass: streetClass,
  streetWidthFt: streetWidthFt
};
