// Taken from ol3 before it was removed
// TODO: Once this is added back to ol3 remove this file
var regExes = {
  typeStr: /^\s*(\w+)\s*\(\s*(.*)\s*\)\s*$/,
  spaces: /\s+/,
  parenComma: /\)\s*,\s*\(/,
  doubleParenComma: /\)\s*\)\s*,\s*\(\s*\(/,
  trimParens: /^\s*\(?(.*?)\)?\s*$/,
  geomCollection: /,\s*([A-Za-z])/g,
  removeNewLine: /[\n\r]/g
};

var parsePoint_ = function(str) {
  var coords = goog.string.trim(str).split(regExes.spaces);
  return new ol.geom.Point(goog.array.map(coords, parseFloat));
};

var parseLineString_ = function(str) {
  var points = goog.string.trim(str).split(',');
  var coordinates = [];
  for (var i = 0, ii = points.length; i < ii; ++i) {
    coordinates.push(parsePoint_.apply(this,
        [points[i]]).getCoordinates());
  }
  return new ol.geom.LineString(coordinates);
};

var parseMultiPoint_ = function(str) {
  var point;
  var points = goog.string.trim(str).split(',');
  var parts = [];
  for (var i = 0, ii = points.length; i < ii; ++i) {
    point = points[i].replace(regExes.trimParens, '$1');
    parts.push(parsePoint_.apply(this, [point]).getCoordinates());
  }
  return new ol.geom.MultiPoint(parts);
};

var parseMultiLineString_ = function(str) {
  var line;
  var lines = goog.string.trim(str).split(regExes.parenComma);
  var parts = [];
  for (var i = 0, ii = lines.length; i < ii; ++i) {
    line = lines[i].replace(regExes.trimParens, '$1');
    parts.push(parseLineString_.apply(this, [line]).getCoordinates());
  }
  return new ol.geom.MultiLineString(parts);
};

var parsePolygon_ = function(str) {
  var ring, linestring;
  var rings = goog.string.trim(str).split(regExes.parenComma);
  var coordinates = [];
  for (var i = 0, ii = rings.length; i < ii; ++i) {
    ring = rings[i].replace(regExes.trimParens, '$1');
    linestring = parseLineString_.apply(this, [ring]).getCoordinates();
    coordinates.push(linestring);
  }
  return new ol.geom.Polygon(coordinates);
};

var parseMultiPolygon_ = function(str) {
  var polygon;
  var polygons = goog.string.trim(str).split(
      regExes.doubleParenComma);
  var parts = [];
  for (var i = 0, ii = polygons.length; i < ii; ++i) {
    polygon = polygons[i].replace(regExes.trimParens, '$1');
    parts.push(parsePolygon_.apply(this, [polygon]).getCoordinates());
  }
  return new ol.geom.MultiPolygon(parts);
};

var parseGeometryCollection_ = function(str) {
  // separate components of the collection with |
  str = str.replace(regExes.geomCollection, '|$1');
  var wktArray = goog.string.trim(str).split('|');
  var components = [];
  for (var i = 0, ii = wktArray.length; i < ii; ++i) {
    components.push(parse_.apply(this, [wktArray[i]]));
  }
  return new ol.geom.GeometryCollection(components);
};

var parse_ = function(wkt) {
  wkt = wkt.replace(regExes.removeNewLine, ' ');
  var matches = regExes.typeStr.exec(wkt);
  var geometry;
  if (matches) {
    var type = matches[1].toLowerCase();
    var str = matches[2];
    switch (type) {
      case 'point':
        geometry = parsePoint_(str);
        break;
      case 'multipoint':
        geometry = parseMultiPoint_(str);
        break;
      case 'linestring':
        geometry = parseLineString_(str);
        break;
      case 'multilinestring':
        geometry = parseMultiLineString_(str);
        break;
      case 'polygon':
        geometry = parsePolygon_(str);
        break;
      case 'multipolygon':
        geometry = parseMultiPolygon_(str);
        break;
      case 'geometrycollection':
        geometry = parseGeometryCollection_(str);
        break;
      default:
        throw new Error('Bad geometry type: ' + type);
    }
  }
  return geometry;
};

var read = function(str) {
  return parse_(str);
};

var readFeaturesFromString = function(str) {
  var geom = read(str);
  var obj = /** @type {ol.parser.ReadFeaturesResult} */
      ({});
  if (goog.isDef(geom)) {
    var feature = new ol.Feature();
    feature.setGeometry(geom);
    obj.features = [feature];
  }
  return obj;
};

var WKT = {
  read: function(str) {
    return read(str);
  }
};
