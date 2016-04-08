describe('featuremanager/FeatureManagerService', function() {
  var featureManagerService, $httpBackend;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_feature_manager'));

  beforeEach(function() {
    module(function($provide) {
      $provide.value('mapService', mapService);
    });
  });
  beforeEach(inject(function(_featureManagerService_, _$httpBackend_) {
    featureManagerService = _featureManagerService_;
    $httpBackend = _$httpBackend_;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });
  describe('#show', function() {
    it('returns true', function() {
      expect(featureManagerService.show()).toEqual(true);
    });
  });

});
