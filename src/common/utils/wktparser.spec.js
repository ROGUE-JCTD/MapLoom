/** Tests for the WKT Parser
 *
 */
describe('wktparser', function() {
  beforeEach(module('MapLoom'));

  // don't ever test with 0 0 or -1 -1 as that
  // can occasionally show up as default behaviour.
  var test_point = 'POINT(2 2)';

  it('parses a simple point', function() {
    var g = WKT.read(test_point);
    var wkt_out = (new ol.format.WKT()).writeGeometry(g);
    expect(wkt_out).toEqual(test_point);
  });
  it('handles a feature in an array', function() {
    var g = WKT.read([test_point]);
    var wkt_out = (new ol.format.WKT()).writeGeometry(g);
    expect(wkt_out).toEqual(test_point);
  });
});

