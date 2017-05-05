describe('search/SearchService', function() {
  var searchService, mapService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_search'));

  beforeEach(inject(function(_searchService_, _mapService_) {
    searchService = _searchService_;
    mapService = _mapService_;
  }));

  describe('convertLatLonToBbox', function() {
    var mock_coordinates = [-88.433333, 17.983333];
    it('converts coordinates to a 2KM EPSG:4326 boundingbox', function() {
      bbox = searchService.convertLatLonToBbox(mock_coordinates);
      // the coordinates should be less than 1 difference to the bbox values
      expect(bbox[0]).toBeCloseTo(mock_coordinates[1], 0);
      expect(bbox[1]).toBeCloseTo(mock_coordinates[1], 0);
      expect(bbox[2]).toBeCloseTo(mock_coordinates[0], 0);
      expect(bbox[3]).toBeCloseTo(mock_coordinates[0], 0);
    });
  });

  describe('populateSearchLayer', function() {
    it('should populate the map with search results layer', function() {
      // make mock results and call populate
      var mock_results = [{
        location: [-0.1276473, 51.5073219],
        boundingbox: [51.2867602, 51.6918741, -0.510375, 0.3340155],
        name: 'London'
      }];
      // the only thing we can really compare is the location
      var feature_location = ol.proj.transform(
        mock_results[0].location, 'EPSG:4326', mapService.map.getView().getProjection()
      );
      searchService.populateSearchLayer(mock_results);
      // make sure the location matches after populating it
      expect(feature_location).toEqual(
        mapService.map.getLayers().item(0).getSource().getFeatures()[0].getGeometry().getCoordinates()
      );
      // replace with a new search layer
      mock_results = [{
        location: [-81.2466429, 42.988576],
        boundingbox: [42.828576, 43.148576, -81.4066429, -81.0866429],
        name: 'notLondon'
      }];
      feature_location = ol.proj.transform(
        mock_results[0].location, 'EPSG:4326', mapService.map.getView().getProjection()
      );
      // make sure before populating it doesn't match
      expect(feature_location).not.toEqual(
        mapService.map.getLayers().item(0).getSource().getFeatures()[0].getGeometry().getCoordinates()
      );
      // make sure the location matches after populating it
      searchService.populateSearchLayer(mock_results);
      expect(feature_location).toEqual(
        mapService.map.getLayers().item(0).getSource().getFeatures()[0].getGeometry().getCoordinates()
      );
    });
  });

  describe('clearSearchLayer', function() {
    it('should remove the search results layer from the map', function() {
      // make mock results and call populate
      var mock_results = [{
        location: [-0.1276473, 51.5073219],
        boundingbox: [51.2867602, 51.6918741, -0.510375, 0.3340155],
        name: 'London'
      }];
      // the only thing we can really compare is the location
      var feature_location = ol.proj.transform(
        mock_results[0].location, 'EPSG:4326', mapService.map.getView().getProjection()
      );
      searchService.populateSearchLayer(mock_results);
      // make sure the location matches after populating it
      expect(feature_location).toEqual(
        mapService.map.getLayers().item(0).getSource().getFeatures()[0].getGeometry().getCoordinates()
      );
      expect(mapService.map.getLayers().getLength()).toBe(1);
      searchService.clearSearchLayer();
      // mapService should be empty after cleared
      expect(mapService.map.getLayers().getLength()).toBe(0);
    });
  });
});