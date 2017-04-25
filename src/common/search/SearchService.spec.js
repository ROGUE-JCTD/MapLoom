describe('search/SearchService', function() {
  var searchService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_search'));

  beforeEach(inject(function(_searchService_) {
    searchService = _searchService_;
  }));

  describe('convertLatLonToBbox', function() {
    var mock_coordinates = [-88.433333, 17.983333];
    it('converts coordinates to a 2KM EPSG:4326 boundingbox', function() {
      bbox = searchService.convertLatLonToBbox(mock_coordinates);
      // The coordinates should be less than 1 difference to the bbox values
      expect(bbox[0]).toBeCloseTo(mock_coordinates[1], 0);
      expect(bbox[1]).toBeCloseTo(mock_coordinates[1], 0);
      expect(bbox[2]).toBeCloseTo(mock_coordinates[0], 0);
      expect(bbox[3]).toBeCloseTo(mock_coordinates[0], 0);
    });
  });
});
