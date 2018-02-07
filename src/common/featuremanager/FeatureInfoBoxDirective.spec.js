describe('FeatureInfoBoxDirective', function() {
  var featureMgrService, mapService, scope, element, compiledElement;

  //include the whole application to initialize all services and modules
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_feature_manager'));
  beforeEach(module('featuremanager/partial/featureinfobox.tpl.html'));

  beforeEach(inject(function ($rootScope, $compile, _featureManagerService_, _mapService_) {
    featureMgrService = _featureManagerService_;
    mapService = _mapService_;
    scope = $rootScope.$new();
    element = angular.element('<div loom-feature-info-box></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
  }));

  describe('pinFeature', function() {
    beforeEach(inject(function() {
      var searchLayer = new ol.layer.Vector({
        metadata: {
          title: 'search_results',
          internalLayer: true,
          searchLayer: true
        },
        source: new ol.source.Vector({
          parser: null
        }),
        style: function(feature, resolution) {
          return [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 8,
              fill: new ol.style.Fill({
                color: '#D6AF38'
              }),
              stroke: new ol.style.Stroke({
                color: '#000000'
              })
            })
          })];
        }
      });

      var mock_feature = new ol.Feature();
      mock_feature.setId('mock_feature');

      searchLayer.getSource().addFeature(mock_feature);

      spyOn(featureMgrService, 'getSelectedItem').and.returnValue(mock_feature);
      spyOn(featureMgrService, 'getSelectedLayer').and.returnValue(searchLayer);
    }));

    it('should add features to the searchResults layer', function() {
      element.scope().pinFeature();

      // expect mapservice map to contain searchResults which contains the mock feature
      var searchResults;
      mapService.map.getLayers().forEach(function(layer) {
        if (layer.get('metadata').searchResults) {
          searchResults = layer;
        }
      });
      expect(searchResults).toBeDefined();
      expect(searchResults.getSource().getFeatureById(featureMgrService.getSelectedItem().getId())).toBeDefined();
    });
  });

  describe('unpinFeature', function() {
    var searchResults, selectedItemSpy, selectedLayerSpy, mock_feature, searchLayer;

    beforeEach(inject(function() {
      searchLayer = new ol.layer.Vector({
        metadata: {
          title: 'search_results',
          internalLayer: true,
          searchLayer: true
        },
        source: new ol.source.Vector({
          parser: null
        }),
        style: function(feature, resolution) {
          return [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 8,
              fill: new ol.style.Fill({
                color: '#D6AF38'
              }),
              stroke: new ol.style.Stroke({
                color: '#000000'
              })
            })
          })];
        }
      });
      mock_feature = new ol.Feature();
      mock_feature.setId('mock_feature');
      searchLayer.getSource().addFeature(mock_feature);
      // mock up spies because we need to change the return value
      selectedItemSpy = jasmine.createSpy('getSelectedItemSpy').and.returnValue(mock_feature);
      selectedLayerSpy = jasmine.createSpy('getSelectedLayerSpy').and.returnValue(searchLayer);
      featureMgrService.getSelectedItem = selectedItemSpy;
      featureMgrService.getSelectedLayer = selectedLayerSpy;
    }));

    it('should remove features from the searchResults layer', function() {
      // prepare a pinned item
      element.scope().pinFeature();
      // grab the pinned layer
      mapService.map.getLayers().forEach(function(layer) {
        if (layer.get('metadata').searchResults) {
          searchResults = layer;
        }
      });
      // expect mapservice map to contain searchResults which contains the mock feature
      expect(searchResults).toBeDefined();
      expect(searchResults.getSource().getFeatureById(featureMgrService.getSelectedItem().getId())).toBeDefined();
      // update the search layer so we can unpin
      mock_feature.setId('P_mock_feature');
      // change the spies to reflect the pinned feature
      selectedItemSpy.and.returnValue(mock_feature);
      selectedLayerSpy.and.returnValue(searchResults);
      // should no longer contain the feature
      element.scope().unpinFeature();
      // gives null result when it does not exist
      expect(searchResults.getSource().getFeatureById(featureMgrService.getSelectedItem().getId())).toBe(null);
    });
  });
});
