describe('MapService', function() {
  var mapService;
  var serverService;
  var configService;
  var q;
  var defer;
  var rootScope;

  //include the whole application to initialize all services and modules
  beforeEach(module('MapLoom'));

  beforeEach(inject(function(_mapService_, _serverService_, _configService_, $q, $rootScope) {
    mapService = _mapService_;
    serverService = _serverService_;
    configService = _configService_;
    q = $q;
    rootScope = $rootScope;
  }));

  describe('service initialization', function() {
    it('should create the map object', function() {
      expect(mapService.map).not.toBe(null);
      expect(mapService.map).toBeDefined();
    });

    it('should create the edit layer', function() {
      expect(mapService.editLayer).not.toBe(null);
      expect(mapService.editLayer).toBeDefined();
    });
  });

  describe('createMap', function() {
    var map;
    beforeEach(function() {
      spyOn(ol, 'Map').and.returnValue(mapService.map);
      spyOn(ol, 'View').and.returnValue(mapService.map.view);
      map = mapService.createMap();
    });

    it('should instantiate a new ol.Map object', function() {
      expect(ol.Map).toHaveBeenCalled();
    });

    it('should set the \'target\' parameter of the ol.Map object to an element container called \'map\'', function() {
      expect(ol.Map.calls.mostRecent().args[0].target).toBe('map');
    });

    it('should instantiate an ol.View with map view params from the service', function() {
      expect(ol.View).toHaveBeenCalled();
      expect(ol.View.calls.mostRecent().args[0]).toEqual(mapService.getMapViewParams());
      expect(map.values_.view).not.toBe(null);
      expect(map.values_.view).toBeDefined();
    });

    it('should return a valid ol.Map object', function() {
      expect(map).not.toBe(null);
      expect(map).toBeDefined();
    });
  });

  describe('loadLayers', function() {
    beforeEach(function() {
      defer = q.defer();
      defer.resolve();
      spyOn(serverService, 'addServer').and.returnValue(defer.promise);
      spyOn(mapService, 'addLayer').and.callThrough();

      //clear out the layers so we can ensure default layers are indeed loaded
      mapService.map.layers = null;
      serverService.getServers().length = 0;
      mapService.loadLayers();
      rootScope.$apply();
    });

    it('should call addServer on serverService', function() {
      expect(serverService.addServer).toHaveBeenCalled();
    });

    it('should call addLayer, to add the layers from the added server', function() {
      expect(mapService.addLayer).toHaveBeenCalled();
    });

    it('should expect to have at least one default layer after it is called', function() {
      //we should have at least the one openstreetmap default layer
      expect(mapService.map.getLayers().values_.length).toBeGreaterThan(0);

      //ensure the number of servers loaded is equal to the number in the configService minus the default wms endpoint
      expect(serverService.getServers().length).toBe(configService.configuration.sources.length-1);
    });
  });

  describe('addLayer', function() {
    beforeEach(function() {
      spyOn(ol.layer, 'Tile');
      defer = q.defer();
      mapService.map.layers = null;
      serverService.getServers().length = 0;
      mapService.loadLayers();
    });

    it('should make a call to ol.layer.Tile', function() {
      defer.reject();
      rootScope.$apply();
      expect(ol.layer.Tile).toHaveBeenCalled();
    });

    it('should add a layer and return it', function() {
      defer.reject();
      rootScope.$apply();

      var minConfig = {
        name: serverService.getServers()[0].config.name,
        source: serverService.getServers()[0].id,
        ptype: serverService.getServers()[0].config.ptype
      };

      //store the original number of layers created thus far
      var origNumLayers = mapService.map.getLayers().values_.length;

      //call addLayer with preloaded data
      var layer = mapService.addLayer(minConfig);

      //make sure there is a change in the number of layers
      expect(mapService.map.getLayers().values_.length).toBeGreaterThan(origNumLayers);

      //make sure we got a layer object back
      expect(layer).not.toBe(null);
      expect(layer).toBeDefined();
    });

    it('should add a layer at an index if specified', function() {
      defer.reject();
      rootScope.$apply();

      var minConfig = {
        name: 'test1',
        source: serverService.getServers()[0].id,
        ptype: serverService.getServers()[0].config.ptype
      };

      //call addLayer with preloaded data and insert at a specified index
      var layer = mapService.addLayer(minConfig, 1);

      //ensure the layerOrder is valid in the metadata
      expect(layer.values_.metadata.layerOrder).toBe(1);

      minConfig.name = 'test2';
      layer = mapService.addLayer(minConfig, 0);

      //make sure the most recently added layer exists at the index we specified
      expect(layer.values_.metadata.name).toBe(mapService.getLayers(true, true)[0].values_.metadata.name);
    });
  });

  describe('getLayers', function() {
    beforeEach(function() {
      defer = q.defer();
      mapService.map.layers = null;
      serverService.getServers().length = 0;

      //we needs this spy so we can force a return of the promise
      //this way the call to loadLayers completes and gets a valid default layer added
      spyOn(serverService, 'addServer').and.returnValue(defer.promise);
      mapService.loadLayers();
    });

    it('should get all layers if including editable and hidden layers', function() {
      defer.reject();
      rootScope.$apply();
      var minConfig = {
        name: 'test1',
        source: serverService.getServers()[0].id,
        ptype: serverService.getServers()[0].config.ptype
      };

      //add a test layer
      var layer = mapService.addLayer(minConfig);
      var totalLayers = mapService.getLayers(true, true).length; //should equal 2
      expect(totalLayers).toBe(2);

      //turn off visibility
      layer.values_.visible = false;
      totalLayers = mapService.getLayers(true, true).length; //should equal 2
      expect(totalLayers).toBe(2);

      //turn on editable
      layer.values_.metadata.editable = true;
      totalLayers = mapService.getLayers(true, true).length; //should equal 2
      expect(totalLayers).toBe(2);
    });

    it('should NOT return layers that are hidden or editable if the arguments are not passed/defined', function() {
      defer.reject();
      rootScope.$apply();
      var minConfig = {
        name: 'test1',
        source: serverService.getServers()[0].id,
        ptype: serverService.getServers()[0].config.ptype
      };

      //add a test layer
      var layer = mapService.addLayer(minConfig);
      var totalLayers = mapService.getLayers(true, true).length; //should equal 2
      expect(totalLayers).toBe(2);

      //there are currently 2 layers now, one layer defined (the one we just created) and one undefined
      layer.values_.metadata.editable = false;
      layer.values_.visible = false;
      totalLayers = mapService.getLayers().length;
      expect(totalLayers).toBe(0);
    });

    it('should return only visible layers that are also editable if the arguments are not passed/defined', function() {
      defer.reject();
      rootScope.$apply();
      var minConfig = {
        name: 'test1',
        source: serverService.getServers()[0].id,
        ptype: serverService.getServers()[0].config.ptype
      };

      //add a test layer
      var layer = mapService.addLayer(minConfig);
      var totalLayers = mapService.getLayers(true, true).length; //should equal 2
      expect(totalLayers).toBe(2);

      layer.values_.metadata.editable = true;
      layer.values_.visible = false;
      totalLayers = mapService.getLayers().length;
      expect(totalLayers).toBe(0);

      layer.values_.metadata.editable = true;
      layer.values_.visible = true;
      totalLayers = mapService.getLayers().length;
      expect(totalLayers).toBe(1);
    });
  });
});

