var coordinateDisplays = {
  DMS: 'Degrees Minutes Seconds',
  DD: 'Decimal Degrees'
};

var settings = {
  coordinateDisplay: coordinateDisplays.DMS,
  DDPrecision: 8
};

var forEachArrayish = function(arrayish, funct) {
  if (goog.isArray(arrayish)) {
    goog.array.forEach(arrayish, funct);
  } else {
    funct(arrayish);
  }
};

var getScrollbarWidth = function() {
  var parent, child, width;

  if (width === undefined) {
    parent = $('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');
    child = parent.children();
    width = child.innerWidth() - child.height(99).innerWidth();
    parent.remove();
  }

  return width;
};

var clean = function(array, deleteValue) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] == deleteValue) {
      array.splice(i, 1);
      i--;
    }
  }
  return array;
};

var transformGeometry = function(geometry, crsFrom, crsTo) {
  var newGeom;
  switch (geometry.type.toLowerCase()) {
    case 'point': {
      newGeom = new ol.geom.Point($.extend(true, [], geometry.coordinates));
    } break;
    case 'linestring': {
      newGeom = new ol.geom.LineString($.extend(true, [], geometry.coordinates));
    } break;
    case 'polygon': {
      newGeom = new ol.geom.Polygon($.extend(true, [], geometry.coordinates));
    } break;
    case 'multipoint': {
      newGeom = new ol.geom.MultiPoint($.extend(true, [], geometry.coordinates));
    } break;
    case 'multilinestring': {
      newGeom = new ol.geom.MultiLineString($.extend(true, [], geometry.coordinates));
    } break;
    case 'multipolygon': {
      newGeom = new ol.geom.MultiPolygon($.extend(true, [], geometry.coordinates));
    } break;
    default: {
      console.log(geometry.geometry.type, 'Not a valid geometry type');
    }
  }
  var transform = ol.proj.getTransform(crsFrom, crsTo);
  newGeom.transform(transform);
  return newGeom;
};
