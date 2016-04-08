describe('featuremanager/FeatureManagerService', function() {
  var featureManagerService, $httpBackend;
  var mapService = {};
  var createLayer = function(id, config) {
    data = {
      uniqueID: id,
      config: config
    };
    return {
      metadata: data,
      get: function(key) {
        return this.metadata;
      }
    };
  };
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_feature_manager'));

  beforeEach(inject(function(_featureManagerService_, _$httpBackend_) {
    featureManagerService = _featureManagerService_;
    $httpBackend = _$httpBackend_;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });
  describe('#getSelectedItemProperties', function() {
    var feature, layerSpy;
    beforeEach(function() {
      feature = { properties: { name: 'Ocean Beach' }};
      var layer = createLayer(1, {});
      layerSpy = spyOn(featureManagerService, 'getSelectedItemLayer');
      layerSpy.andReturn({layer: layer});
    });
    it('returns the properties properties', function() {
      featureManagerService.show(feature);
      expect(featureManagerService.getSelectedItemProperties()).toEqual([ ['name', 'Ocean Beach']]);
    });
    describe('has saved maskings', function() {
      beforeEach(function() {
        var layer = createLayer(1, { maskings: { name: { alias: 'Feature Name', show: true }}});
        layerSpy.andReturn({layer: layer});
      });
      it('returns the properties properties', function() {
        featureManagerService.show(feature);
        expect(featureManagerService.getSelectedItemProperties()).toEqual([ ['Feature Name', 'Ocean Beach']]);
      });
      describe('hides feature', function() {
        beforeEach(function() {
          var layer = createLayer(1, { maskings: { name: { alias: 'Feature Name', show: false }}});
          layerSpy.andReturn({layer: layer});
        });
        it('does not return the feature', function() {
          featureManagerService.show(feature);
          expect(featureManagerService.getSelectedItemProperties()).toEqual([ ]);
        });
      });
    });
  });

});
