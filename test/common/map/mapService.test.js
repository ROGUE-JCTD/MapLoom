describe('MapService', function(){
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_map_service'));
  beforeEach(module('loom_config_service'));

  beforeEach(inject(function(_mapService_, _configService_){
    mapService = _mapService_;
    configService = _configService_;
    map = mapService.map;
  }));

  it('getMapViewParams should return a valid parameter object', function() {
    var testView = new ol.View(mapService.getMapViewParams());
    var expectedResult = goog.isDefAndNotNull(testView);

    expect(expectedResult).toBe(true);
  });

  it('map should have the same CRS as the config service', function() {
    var actualProjection = map.getView().getProjection().code_; 
    var expectedProjection = configService.configuration.map.projection;

    expect(expectedProjection).toBe(actualProjection);
  });

});