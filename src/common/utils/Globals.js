var coordinateDisplays = {
  DMS: 'degree_minute_second',
  DD: 'decimal_degrees',
  Other: 'other'
};

var settings = {
  coordinateDisplay: coordinateDisplays.DMS,
  DDPrecision: 8,
  WFSVersion: '1.1.0',
  WMSVersion: '1.1.1',
  WPSVersion: '1.0.0'
};

var forEachArrayish = function(arrayish, funct) {
  if (goog.isArray(arrayish)) {
    goog.array.forEach(arrayish, funct);
  } else {
    funct(arrayish);
  }
};

var ignoreNextScriptError = false;

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
    case 'geometry': {
      newGeom = new ol.geom.Geometry($.extend(true, [], geometry.coordinates));
    } break;
    case 'multigeometry': {
      newGeom = new ol.geom.GeometryCollection($.extend(true, [], geometry.coordinates));
    } break;
    case 'geometrycollection': {
      var geometries = [];
      for (var index = 0; index < geometry.geometries.length; index++) {
        geometries.push(transformGeometry(geometry.geometries[index]));
      }
      newGeom = new ol.geom.GeometryCollection($.extend(true, [], geometries));
    } break;
    default: {
      console.log(geometry.type, 'Not a valid geometry type');
      return;
    }
  }
  if (goog.isDefAndNotNull(crsFrom) && goog.isDefAndNotNull(crsTo)) {
    newGeom.transform(crsFrom, crsTo);
  }
  return newGeom;
};

var validateInteger = function(property) {
  var numbers = /^[-+]?[0-9]*$/;
  return numbers.test(property);
};

var validateDouble = function(property) {
  var numbers = /^[-+]?[0-9]*\.?[0-9]+$/;
  return property == null || property === '' || numbers.test(property);
};


//  Secure Hash Algorithm (SHA1)
//  http://www.webtoolkit.info/

var sha1 = function(msg) {

  var rotate_left = function(n, s) {
    return (n << s) | (n >>> (32 - s));
  };

  var cvt_hex = function(val) {
    var str = '';
    var i;
    var v;

    for (i = 7; i >= 0; i--) {
      v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }
    return str;
  };


  var utf8Encode = function(string) {
    string = string.replace(/\r\n/g, '\n');
    var utftext = '';

    for (var n = 0; n < string.length; n++) {

      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }

    }
    return utftext;
  };

  var blockstart;
  var i, j;
  var W = new Array(80);
  var H0 = 0x67452301;
  var H1 = 0xEFCDAB89;
  var H2 = 0x98BADCFE;
  var H3 = 0x10325476;
  var H4 = 0xC3D2E1F0;
  var A, B, C, D, E;
  var temp;

  msg = utf8Encode(msg);

  var msg_len = msg.length;

  var word_array = [];
  for (i = 0; i < msg_len - 3; i += 4) {
    j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
        msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
    word_array.push(j);
  }

  switch (msg_len % 4) {
    case 0:
      i = 0x080000000;
      break;
    case 1:
      i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
      break;

    case 2:
      i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
      break;

    case 3:
      i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 |
          msg.charCodeAt(msg_len - 1) << 8 | 0x80;
      break;
  }

  word_array.push(i);

  while ((word_array.length % 16) != 14) {
    word_array.push(0);
  }

  word_array.push(msg_len >>> 29);
  word_array.push((msg_len << 3) & 0x0ffffffff);


  for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {

    for (i = 0; i < 16; i++) {
      W[i] = word_array[blockstart + i];
    }
    for (i = 16; i <= 79; i++) {
      W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    }

    A = H0;
    B = H1;
    C = H2;
    D = H3;
    E = H4;

    for (i = 0; i <= 19; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 20; i <= 39; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 40; i <= 59; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 60; i <= 79; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    H0 = (H0 + A) & 0x0ffffffff;
    H1 = (H1 + B) & 0x0ffffffff;
    H2 = (H2 + C) & 0x0ffffffff;
    H3 = (H3 + D) & 0x0ffffffff;
    H4 = (H4 + E) & 0x0ffffffff;

  }

  var localtemp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

  return localtemp.toLowerCase();

};


// give http://myip/geoserver/wms, ir will return http://myip/geoserver
// it handles extra slash at the end of the url if it has one
var removeUrlLastRoute = function(urlWithRoutes) {
  var newUrl = null;

  if (goog.isDefAndNotNull(urlWithRoutes)) {
    if (urlWithRoutes.lastIndexOf('/') === urlWithRoutes.length - 1) {
      urlWithRoutes = urlWithRoutes.substring(0, urlWithRoutes.lastIndexOf('/'));
    }

    newUrl = urlWithRoutes.substring(0, urlWithRoutes.lastIndexOf('/'));
  }

  return newUrl;
};
