describe('FeatureManagerService', function() {
  var featureMgrService;
  var mapService;
  var serverService;
  var configService;
  var q;
  var defer;
  var rootScope;
  var httpBackend;
  var dialogService;
  var window;

  //include the whole application to initialize all services and modules
  beforeEach(module('MapLoom'));

  beforeEach(inject(function (_featureManagerService_, _mapService_, _serverService_, _configService_, _dialogService_, $httpBackend, $q, $rootScope, $window) {
    featureMgrService = _featureManagerService_;
    mapService = _mapService_;
    serverService = _serverService_;
    configService = _configService_;
    dialogService = _dialogService_;
    httpBackend = $httpBackend;
    q = $q;
    rootScope = $rootScope;
    window = $window;
  }));

  describe('show', function() {
    beforeEach(function() {
      //spyOn(rootScope, '$broadcast');
      defer = q.defer();
      defer.resolve();
      mapService.loadLayers();
      rootScope.$apply();
      spyOn(mapService, 'addToEditLayer');
      spyOn(featureMgrService, 'getSelectedItemLayer').and.returnValue({layer:mapService.map.getLayers().array_[0]});
      spyOn(featureMgrService, 'getSelectedItemMediaByProp');
    });

    it('should set state_ to \'layer\' and selectedItem_ should be set to the object passed as the parameter, if object has a defined property called features', function() {
      //set a features property on pre-existing layer
      mapService.map.getLayers().array_[0].features = 1;
      featureMgrService.show(mapService.map.getLayers().array_[0]);
      expect(featureMgrService.getState()).toBe('layer');
      expect(mapService.map.getLayers().array_[0]).toBe(featureMgrService.getSelectedItem());
    });

    it('should set state_ to \'feature\' and selectedItem_ should be set to the object passed as the parameter, if object has defined properties called features, properties, and geometry', function () {
      //cook up some data to make sure we can get through all function calls
      mapService.map.getLayers().array_[0].features = 1;
      mapService.map.getLayers().array_[0].properties = 1;
      mapService.map.getLayers().array_[0].geometry = 1;
      mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();

      var feature = new ol.Feature({
        geometry: new ol.geom.Circle([45,45], 10),
        labelPoint: new ol.geom.Point([90, 45]),
        name: 'My Polygon'
      });

      mapService.editLayer.getSource().featuresCollection_.push(feature);

      //call the actual method we are testing
      featureMgrService.show(mapService.map.getLayers().array_[0]);

      //run through assertions for dealing with a feature
      expect(featureMgrService.getState()).toBe('feature');
      expect(mapService.map.getLayers().array_[0]).toBe(featureMgrService.getSelectedItem());
      expect(featureMgrService.getSelectedItemLayer).toHaveBeenCalled();
      expect(mapService.addToEditLayer).toHaveBeenCalled();
      expect(featureMgrService.getSelectedItemMediaByProp).toHaveBeenCalled();
    });

    it('should set state_ to \'layers\' and selectedItem_ should be set to the object passed as the parameter, if the object is an array and elements have a defined property called features', function() {
      mapService.map.getLayers().array_[0].features = 1;
      featureMgrService.show(mapService.map.getLayers().array_);
      expect(featureMgrService.getState()).toBe('layers');
      expect(mapService.map.getLayers().array_).toBe(featureMgrService.getSelectedItem());
      expect(featureMgrService.getSelectedItemLayer).not.toHaveBeenCalled();
    });

    it('should not add anything to the edit layer if there is no geometry defined in the object that is passed as a parameter', function () {
      //cook up some data to make sure we can get through all function calls
      mapService.map.getLayers().array_[0].features = 1;
      mapService.map.getLayers().array_[0].properties = 1;
      mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();

      var feature = new ol.Feature({
        geometry: new ol.geom.Circle([45,45], 10),
        labelPoint: new ol.geom.Point([90, 45]),
        name: 'My Polygon'
      });

      mapService.editLayer.getSource().featuresCollection_.push(feature);

      //call the actual method we are testing
      featureMgrService.show(mapService.map.getLayers().array_[0]);

      //run through assertions for dealing with a feature
      expect(featureMgrService.getState()).toBe('feature');
      expect(mapService.map.getLayers().array_[0]).toBe(featureMgrService.getSelectedItem());
      expect(featureMgrService.getSelectedItemLayer).toHaveBeenCalled();
      expect(mapService.addToEditLayer).not.toHaveBeenCalled();
      expect(featureMgrService.getSelectedItemMediaByProp).toHaveBeenCalled();
    });
  });

  describe('hide', function() {
    beforeEach(function() {
      spyOn(mapService, 'clearEditLayer');
    });

    it('should reset private variables and call clearEditLayer', function() {
      featureMgrService.hide();
      expect(featureMgrService.getSelectedItem()).toBe(null);
      expect(featureMgrService.getState()).toBe(null);
      expect(featureMgrService.getSelectedItemLayer()).toBe(null);
      expect(featureMgrService.getSelectedItemProperties()).toBe(null);
      expect(featureMgrService.getSelectedItemMedia()).toBe(null);
      expect(mapService.clearEditLayer).toHaveBeenCalled();
    });
  });

  describe('startFeatureInsert', function() {
    beforeEach(function() {
      spyOn(featureMgrService, 'hide');
      featureMgrService.startFeatureInsert();
    });

    it('shoud call hide on the current layer', function() {

      expect(featureMgrService.hide).toHaveBeenCalled();
    });
  });
  describe('endFeatureInsert', function() {

  });
  describe('startGeometryEditing', function() {

  });
  describe('startGeometryEditing', function() {

  });
});