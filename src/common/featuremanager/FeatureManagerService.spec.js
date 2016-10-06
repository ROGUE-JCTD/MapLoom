describe('FeatureManagerService', function() {
  var featureMgrService;
  var mapService;
  var serverService;
  var configService;
  var exclusiveModeService;
  var translateService;
  var q;
  var defer;
  var rootScope;
  var httpBackend;
  var dialogService;
  var window;

  //include the whole application to initialize all services and modules
  beforeEach(module('MapLoom'));

  beforeEach(inject(function (_featureManagerService_, _mapService_, _serverService_, _exclusiveModeService_, _configService_, _dialogService_,$translate, $httpBackend, $q, $rootScope, $window) {
    featureMgrService = _featureManagerService_;
    mapService = _mapService_;
    serverService = _serverService_;
    configService = _configService_;
    translateService = $translate;
    exclusiveModeService = _exclusiveModeService_;
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
      spyOn(exclusiveModeService, 'startExclusiveMode');
      defer = q.defer();
      defer.resolve();
      mapService.loadLayers();
      rootScope.$apply();
      mapService.map.getLayers().getArray()[0].values_.metadata.schema = {geom: {_name:'geom', _type:'gml:PointPropertyType' } };
    });

    it('shoud call hide on the current layer', function() {
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      expect(featureMgrService.hide).toHaveBeenCalled();
    });

    it('should disable double-click zoom interaction on the map since the user is about to draw', function() {
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      expect(mapService.map.interactions_.array_[1].values_.active).toBe(false);
    });

    it('should start exclusive mode and set exclusiveModeService.addMode to true', function() {
      //expect(mapService.editLayer.getSource().getFeatures().length).toBe(0);
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      expect(exclusiveModeService.startExclusiveMode).toHaveBeenCalled();
      expect(exclusiveModeService.addMode).toBe(true);
    });

    it('should set the internal selected layer to the layer provided as a parameter', function() {
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      expect(featureMgrService.getSelectedLayer()).toBe(mapService.map.getLayers().getArray()[0]);
    });

    it('shoud add the edit layer to the map for editing', function() {
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      var found = false;
      for(var i = 0; i < mapService.map.getLayers().getArray().length; i++) {
        if(mapService.editLayer == mapService.map.getLayers().getArray()[i]) {
          found = true;
        }
      }
      expect(found).toBe(true);
    });

    it('should call mapService.addDraw if the layer geometry is homogenous', function() {
      spyOn(mapService,'addDraw');
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      expect(mapService.addDraw).toHaveBeenCalled();
    });

    it('should show a dialog with different geometry types to draw if the layer geometry is NOT homogenous', function() {
      spyOn($.fn,'modal');
      mapService.map.getLayers().getArray()[0].values_.metadata.schema = {geom: {_name:'geom', _type:'gml:GeometryPropertyType' } };
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      expect($.fn.modal).toHaveBeenCalled();
    });

    it('should broadcast to other components that startFeatureInsert has been called', function() {
      spyOn(rootScope, '$broadcast');
      featureMgrService.startFeatureInsert(mapService.map.getLayers().getArray()[0]);
      expect(rootScope.$broadcast).toHaveBeenCalledWith('startFeatureInsert');
    });
  });

  describe('endFeatureInsert', function() {
    beforeEach(function() {
      defer = q.defer();
      defer.resolve();
      mapService.loadLayers();
      rootScope.$apply();
    });

    it('should re-enable double-click zoom interaction on the map', function() {
      featureMgrService.endFeatureInsert();
      expect(mapService.map.interactions_.array_[1].values_.active).toBe(true);
    });

    describe('(save = true)', function() {
      beforeEach(function() {
        //spy on this service to stub the call without the actual implementation being called
        spyOn(mapService, 'addToEditLayer');
        //spyOn so we can return the value we want
        spyOn(featureMgrService, 'getSelectedItemLayer').and.returnValue({layer:mapService.map.getLayers().array_[0]});

        //fudge some data for the various calls so we can make it all the way through,
        //note that the value of geometry coordinates in the following line affects test outcomes
        //also note that selectedItem_ (in the service) will be mapService.map.getLayers().array_[0]
        mapService.map.getLayers().array_[0].properties = 1;
        mapService.map.getLayers().array_[0].geometry = {coordinates:[55,55]};
        mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();

        var feature1 = new ol.Feature({
          geometry: new ol.geom.Point([90, 45]),
          labelPoint: new ol.geom.Point([90, 45]),
          name: 'My Polygon'
        });
        mapService.editLayer.getSource().featuresCollection_.push(feature1);

        var feature = new ol.Feature({
          geometry: new ol.geom.Point([90, 45]),
          labelPoint: new ol.geom.Point([90, 45]),
          name: 'My Polygon'

        });
        mapService.editLayer.getSource().addFeature(feature);

        //call show to initialize some internal private vars to the service
        featureMgrService.show(mapService.map.getLayers().array_[0]);
      });

      describe('coordinates of the feature (selectedItem_) are identical to the one\'s provided to the method', function() {
        it('should add the geometry of the feature to the map\'s edit layer', function () {
          //todo mock this in the object itself and remove the method from the feature service
          //something like this - mapService.map.getLayers().array_[0].values_.metadata.schema = [{0: 'evento'}, {0: 'situacion_crit'}];
          var props = [{0: 'evento'}, {0: 'situacion_crit'}];
          featureMgrService.setSelectedItemProperties(props);
          featureMgrService.endFeatureInsert(true, props, [55, 55]);

          expect(mapService.addToEditLayer).toHaveBeenCalled();
          expect(mapService.addToEditLayer.calls.mostRecent().args[0]).toBe(mapService.map.getLayers().array_[0].geometry);
          expect(mapService.addToEditLayer.calls.count()).toBe(2);
        });

        it('should issue a WFS post message with the updated attribute and geometry data', function() {

          //add some data to ensure http request indludes the values
          mapService.map.getLayers().array_[0].values_.metadata.nativeName = 'freedom';
          mapService.map.getLayers().array_[0].values_.metadata.name = 'map:sixpoint';

          //intercept the http request and hold onto the url and data for validity checks below
          var wfsURL;
          var wfsData;
          httpBackend.when('POST').respond(function(method, url, data, headers, params){
            wfsData = data;
            wfsURL = url;
            return {'status': 200};
          });

          var props = [{0: 'evento'}, {0: 'situacion_crit'}];
          featureMgrService.setSelectedItemProperties(props);
          featureMgrService.endFeatureInsert(true, props, [55, 55]);
          httpBackend.flush();
          httpBackend.expectPOST();

          expect(wfsURL.indexOf('wfs')).not.toBe(-1);
          expect(wfsData.indexOf('wfs')).not.toBe(-1);
          expect(wfsData.indexOf('Insert')).not.toBe(-1);
          expect(wfsData.indexOf('sixpoint')).not.toBe(-1);
          expect(wfsData.indexOf('freedom')).not.toBe(-1);
        });
      });

      describe('coordinates of the feature (selectedItem_) are NOT identical to the one\'s provided to the method', function() {
        var origGeomCoords;
        var newGeomCoords;
        beforeEach(function() {
          origGeomCoords = mapService.editLayer.getSource().getFeatures()[0].getGeometry().getCoordinates();
          spyOn(mapService.map.getView(),'setCenter');

          //todo mock this in the object itself and remove the method from the feature service
          //something like this - mapService.map.getLayers().array_[0].values_.metadata.schema = [{0: 'evento'}, {0: 'situacion_crit'}];
          var props = [{0: 'evento'}, {0: 'situacion_crit'}];
          featureMgrService.setSelectedItemProperties(props);

          //call the actual method to test
          featureMgrService.endFeatureInsert(true, props, [0, 0]);
          //keep track of the coordinates to see if the method made any changes to them
          newGeomCoords = mapService.editLayer.getSource().getFeatures()[0].getGeometry().getCoordinates();
        });

        it('should NOT add the geometry of the feature to the map\'s edit layer', function () {
          expect(mapService.addToEditLayer.calls.count()).toBe(1);
        });

        it('should update the feature in the edit layer i.e. transform it by the new coordinates',function() {
          expect(newGeomCoords).not.toBe(origGeomCoords);
        });

        it('should pan the map to the new feature position', function() {
          expect(mapService.map.getView().setCenter).toHaveBeenCalledWith(newGeomCoords);
        });
      });
    });

    describe('(save = false)', function() {
      beforeEach(function() {
         //spy on this service to stub the call without the actual implementation being called
        spyOn(mapService, 'addToEditLayer');
        //spyOn so we can return the value we want
        spyOn(featureMgrService, 'getSelectedItemLayer').and.returnValue({layer:mapService.map.getLayers().array_[0]});

        //fudge some data for the various calls so we can make it all the way through,
        //also note that selectedItem_ (in the service) will be mapService.map.getLayers().array_[0]
        mapService.map.getLayers().array_[0].properties = 1;
        mapService.map.getLayers().array_[0].geometry = {coordinates:[55,55]};
        mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();

        var feature1 = new ol.Feature({
          geometry: new ol.geom.Point([90, 45]),
          labelPoint: new ol.geom.Point([90, 45]),
          name: 'My Polygon'
        });
        mapService.editLayer.getSource().featuresCollection_.push(feature1);

        var feature = new ol.Feature({
          geometry: new ol.geom.Point([90, 45]),
          labelPoint: new ol.geom.Point([90, 45]),
          name: 'My Polygon'

        });
        mapService.editLayer.getSource().addFeature(feature);

        //call show to initialize some internal private vars to the service
        featureMgrService.show(mapService.map.getLayers().array_[0]);
      });

      it('should just call hide() on the service and stop displaying the pop-up', function() {
        spyOn(featureMgrService, 'hide');
        featureMgrService.endFeatureInsert(false, null, [55, 55]);
        expect(featureMgrService.hide).toHaveBeenCalled();
      });
    });

  });
  describe('startGeometryEditing', function() {
    beforeEach(function() {
      spyOn(rootScope, '$broadcast');
      spyOn(mapService,'addSelect');
      spyOn(mapService, 'addModify');
      spyOn(mapService,'selectFeature');
      spyOn(exclusiveModeService,'startExclusiveMode');

      mapService.map.layers = null;
      defer = q.defer();
      defer.resolve();
      mapService.loadLayers();
      rootScope.$apply();

      //fudge some data for the various calls so we can make it all the way through,
      mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();
      var feature = new ol.Feature({
        geometry: new ol.geom.MultiPoint([[90, 45], [120,120]]),
        labelPoint: new ol.geom.Point([90, 45]),
        name: 'My Polygon'
      });
      mapService.editLayer.getSource().featuresCollection_.push(feature);
    });

    it('should broadcast to other components that startGeometryEditing has been called', function() {
      featureMgrService.getSelectedItem().geometry = {coordinates:[55,55], type:'point'};
      featureMgrService.startGeometryEditing();
      expect(rootScope.$broadcast).toHaveBeenCalledWith('startGeometryEdit');
    });

    it('should clear the edit layer and split the geometry into separate features for editing, if the geometry is \'multi\' type', function() {
      //get the array of coordinates for the multi type;
      var multiCoords = mapService.editLayer.getSource().getFeatures()[0].getGeometry().getCoordinates();
      var numCoords = multiCoords.length;
      multiCoords =[multiCoords[numCoords-1]];
      spyOn(window, 'transformGeometry');
      spyOn(mapService.editLayer.getSource(), 'clear');
      spyOn(mapService.editLayer.getSource(), 'addFeature');
      featureMgrService.getSelectedItem().geometry = {coordinates:[55,55], type:'Multi'};

      //call the actual method
      featureMgrService.startGeometryEditing();

      expect(mapService.editLayer.getSource().clear).toHaveBeenCalled();
      expect(window.transformGeometry.calls.mostRecent().args[0].type).toBe('Multi');
      expect(window.transformGeometry.calls.mostRecent().args[0].coordinates).toEqual(multiCoords);
      expect(mapService.editLayer.getSource().addFeature).toHaveBeenCalled();
      expect(mapService.editLayer.getSource().addFeature.calls.count()).toBe(numCoords);
    });

    it('should clear the edit layer and split the geometry into separate features for editing, if the geometry is \'collection\' type', function() {
      //clear the edit layer ourselves and add a new feature comprised of multiple geometry (3 points)
      mapService.editLayer.getSource().featuresCollection_.clear();
      var featureNew = new ol.Feature({
        geometry: new ol.geom.GeometryCollection([new ol.geom.Point([90, 90]),new ol.geom.Point([66, 66]), new ol.geom.Point([45, 45])]),
        labelPoint: new ol.geom.Point([90, 45]),
        name: 'My Polygon'
      });
      mapService.editLayer.getSource().featuresCollection_.push(featureNew);

      spyOn(window, 'transformGeometry');
      spyOn(mapService.editLayer.getSource(), 'clear');
      spyOn(mapService.editLayer.getSource(), 'addFeature');
      featureMgrService.getSelectedItem().geometry = {coordinates:[55,55], type:'geometrycollection'};

      //call the actual method
      featureMgrService.startGeometryEditing();

      expect(mapService.editLayer.getSource().clear).toHaveBeenCalled();
      expect(window.transformGeometry.calls.mostRecent().args[0].type).toBe('Point');
      expect(window.transformGeometry.calls.mostRecent().args[0].coordinates).toEqual([45, 45]);
      expect(mapService.editLayer.getSource().addFeature).toHaveBeenCalled();

      //expect the number of calls to be 3 because we are dealing with 3 points
      expect(mapService.editLayer.getSource().addFeature.calls.count()).toBe(3);
    });

    it('should start the exclusive mode with \'editing_geometry\' as the main parameter', function() {
      featureMgrService.getSelectedItem().geometry = {coordinates:[55,55], type:'point'};
      featureMgrService.startGeometryEditing();
      expect(exclusiveModeService.startExclusiveMode.calls.mostRecent().args[0]).toBe(translateService.instant('editing_geometry'));
    });

    it('should call mapService.addSelect', function() {
      featureMgrService.getSelectedItem().geometry = {coordinates:[55,55], type:'point'};
      featureMgrService.startGeometryEditing();
      expect(mapService.addSelect).toHaveBeenCalled();
    });

    it('should call mapService.addModify', function() {
      featureMgrService.getSelectedItem().geometry = {coordinates:[55,55], type:'point'};
      featureMgrService.startGeometryEditing();
      expect(mapService.addModify).toHaveBeenCalled();
    });

    it('should call mapService.selectFeature', function() {
      featureMgrService.getSelectedItem().geometry = {coordinates:[55,55], type:'point'};
      featureMgrService.startGeometryEditing();
      expect(mapService.selectFeature).toHaveBeenCalled();
    });
  });
  describe('endGeometryEditing', function() {
    beforeEach(function() {
      spyOn(rootScope, '$broadcast');
      spyOn(window,'transformGeometry').and.callThrough();
      spyOn(mapService.editLayer.getSource(),'addFeature');

      mapService.map.layers = null;
      defer = q.defer();
      defer.resolve();
      mapService.loadLayers();
      rootScope.$apply();

      //fudge some data for the various calls so we can make it all the way through,
      mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();
      var feature = new ol.Feature({
        geometry: new ol.geom.MultiPoint([[90, 45], [120,120]]),
        labelPoint: new ol.geom.Point([90, 45]),
        name: 'My Polygon'
      });
      mapService.editLayer.getSource().featuresCollection_.push(feature);
    });
    describe('(save = true)', function() {
      describe('selectedItem_ geoemtry is a \'multi\' type such as ol.geom.MultiPoint etc', function() {
        beforeEach(function() {
          //trick the selectedItem_ into thinking it is a 'multi' type
          featureMgrService.getSelectedItem().geometry = {type:'MultiPoint'};

          //add 3 separate features to the edit layer that will be merged together
          mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();
          for(var i = 0; i < 3; i++)
          {
            var feature = new ol.Feature({
              geometry: new ol.geom.MultiPoint([[i*10, i*10]]),
              name: 'MyPoint'+i
            });
            mapService.editLayer.getSource().featuresCollection_.push(feature);
          }
          //call the actual method
          featureMgrService.endGeometryEditing(true);
        });

        it('should merge the separate coordinates/features from mapService.editLayer into one feature/geometry', function() {
          //make sure the merged coordinates match the separate ones we added earlier
          var mergedCoords = mapService.editLayer.getSource().addFeature.calls.mostRecent().args[0].getGeometry().getCoordinates();
          expect(mergedCoords[0]).toEqual([0,0]);
          expect(mergedCoords[1]).toEqual([10,10]);
          expect(mergedCoords[2]).toEqual([20,20]);
        });

        it('should call the global method transformGeometry with the separate coordinates to be merged', function() {
           //ensure transformGeometry was called with the correct parameters matching the data we cooked up
          var mergedCoords = mapService.editLayer.getSource().addFeature.calls.mostRecent().args[0].getGeometry().getCoordinates();
          expect(window.transformGeometry.calls.mostRecent().args[0].type).toBe('MultiPoint');
          expect(window.transformGeometry.calls.mostRecent().args[0].coordinates).toEqual(mergedCoords);
        });

        it('should issue a WFS post message with the \'update\' parameter and updated feature', function () {
          var wfsData, wfsURL;
          httpBackend.when('POST').respond(function(method, url, data, headers, params){
            wfsData = data;
            wfsURL = url;
            return {'status': 200};
          });
          httpBackend.flush();

          httpBackend.expectPOST();

          //ensure all of our cooked up coordinates made it into the xml data
          expect(wfsData.indexOf('0,0')).not.toBe(-1);
          expect(wfsData.indexOf('10,10')).not.toBe(-1);
          expect(wfsData.indexOf('20,20')).not.toBe(-1);

          //ensure that the feature type makes it into the xml as well
          expect(wfsData.indexOf('MultiPoint')).not.toBe(-1);
        });
      });

      describe('selectedItem_ geoemtry is a \'collection\' type (ol.geom.GeometryCollection)', function() {
        beforeEach(function() {
          //trick the selectedItem_ into thinking it is a 'geometrycollection' type
          featureMgrService.getSelectedItem().geometry = {type: 'GeometryCollection'};

          //add 3 separate features to the edit layer that will be merged together
          mapService.editLayer.getSource().featuresCollection_ = new ol.Collection();
          for (var i = 0; i < 3; i++) {
            var feature = new ol.Feature({
              geometry: new ol.geom.Point([i * 10, i * 10]),
              name: 'MyPoint' + i
            });
            mapService.editLayer.getSource().featuresCollection_.push(feature);
          }
          //call the actual method
          featureMgrService.endGeometryEditing(true);
        });

        it('should merge the separate geometries into a single feature, if the selectedItem type is a geometry \'collection\'', function () {
          //make sure the merged geometry coordinates match the coords from the separate features/geoms
          var mergedGeoms = mapService.editLayer.getSource().addFeature.calls.mostRecent().args[0].getGeometry().getGeometries();
          expect(mergedGeoms[0].getCoordinates()).toEqual([0, 0]);
          expect(mergedGeoms[1].getCoordinates()).toEqual([10, 10]);
          expect(mergedGeoms[2].getCoordinates()).toEqual([20, 20]);
        });

        it('should call the global method transformGeometry with the separate geometries passed in the \'coordinates\' property', function() {
           //ensure transformGeometry was called with the correct parameters matching the data we cooked up
          expect(window.transformGeometry.calls.mostRecent().args[0].type).toBe('multigeometry');

          var mergedGeoms = mapService.editLayer.getSource().addFeature.calls.mostRecent().args[0].getGeometry().getGeometries();
          //note that the coordinates property passed to the method is actually an ol.geometry object
          expect(window.transformGeometry.calls.mostRecent().args[0].coordinates[0].getCoordinates()).toEqual(mergedGeoms[0].getCoordinates());
          expect(window.transformGeometry.calls.mostRecent().args[0].coordinates[1].getCoordinates()).toEqual(mergedGeoms[1].getCoordinates());
          expect(window.transformGeometry.calls.mostRecent().args[0].coordinates[2].getCoordinates()).toEqual(mergedGeoms[2].getCoordinates());
        });

        it('should issue a WFS post message with the \'update\' parameter and updated feature', function () {
          var wfsData, wfsURL;
          httpBackend.when('POST').respond(function(method, url, data, headers, params){
            wfsData = data;
            wfsURL = url;
            return {'status': 200};
          });
          httpBackend.flush();

          httpBackend.expectPOST();

          //ensure all of our cooked up coordinates made it into the xml data
          expect(wfsData.indexOf('0,0')).not.toBe(-1);
          expect(wfsData.indexOf('10,10')).not.toBe(-1);
          expect(wfsData.indexOf('20,20')).not.toBe(-1);

          //ensure that the feature type makes it into the xml as well
          expect(wfsData.indexOf('MultiGeometry')).not.toBe(-1);
        });
      });
    });

    describe('(save = false)', function() {
      beforeEach(function() {
        spyOn(mapService, 'clearEditLayer');
        spyOn(mapService, 'addToEditLayer');

        //call the actual method
        featureMgrService.endGeometryEditing(false);
      });

      it('should clear mapService.editLayer', function() {
        expect(mapService.clearEditLayer).toHaveBeenCalled();
      });

      it('should add the selectedItem_ geometry back to the mapService.editLayer', function() {
        expect(mapService.addToEditLayer).toHaveBeenCalled();
        expect(mapService.addToEditLayer.calls.mostRecent().args[0]).toBe(featureMgrService.getSelectedItem().geometry);
      });

      it('should NOT issue a WFS post message', function() {
        httpBackend.verifyNoOutstandingRequest();
      });
    });
  });
});
