describe('unifiedSearchDirective', function() {
  var element, scope, compiledElement, configService, serverService, mapService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_addlayers'));
  beforeEach(module('addlayers/partials/registryLayers.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _configService_,
                            _serverService_, _mapService_) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-unifiedlayers></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    configService = _configService_;
    serverService = _serverService_;
    mapService = _mapService_;
  }));
  describe('keyword search', function() {
    it('searchs with a keyword', function() {
      var keyword = 'new york';
      compiledElement.scope().keyword = keyword;
      expect(compiledElement.scope().getSearchParams()).toEqual(jasmine.objectContaining({
        owner: [],
        category: [],
        text: keyword
      }));
    });
  });
  describe('search', function() {
    var searchSpy;
    beforeEach(function() {
      searchSpy = spyOn(compiledElement.scope(), 'search');
    });
    describe('#defaultSearch', function() {
      it('calls search', function() {
        compiledElement.scope().search();
        expect(searchSpy).toHaveBeenCalled();
      });
    });
  });
  describe('#search', function() {
  });
  describe('#resetCategoryFilters', function() {
    beforeEach(function() {
      compiledElement.scope().owners = [
        {username: 'test', first_name: 'test', last_name: 'user'}
      ];
      compiledElement.scope().categories = [
        {id: 0, gn_description: 'Test category', identifier: 'test'}
      ];
    });
    it('clears owners', function() {
      // ensure the 0th element is checked
      compiledElement.scope().toggleFilter(compiledElement.scope().owners[0]);
      // clear the list
      compiledElement.scope().clear('owner');
      // check to ensure the list was cleared and is not returning any values.
      expect(compiledElement.scope().getSearchParams().owner.length).toEqual(0);
    });
    it('clears categories', function() {
      compiledElement.scope().toggleFilter(compiledElement.scope().categories[0]);
      compiledElement.scope().clear('category');
      expect(compiledElement.scope().getSearchParams().category.length).toEqual(0);
    });
  });
  describe('#previewLayer', function() {
    it('adds a feature to the bbox layer', function() {
      var spy = spyOn(mapService, 'createLayerWithFullConfig');
      var layerConfig = { CRS: 'Test', Name: 'Test', extent: [-45, -45, 45, 45]};
      compiledElement.scope().previewBbox(layerConfig);
      expect(compiledElement.scope().bboxes.getFeatures().length).toEqual(1);
    });
  });
  describe('#addLayers', function() {
    var layerConfig, minimalConfig, addLayerSpy, zoomToExtentForProjectionSpy, server;
    beforeEach(function() {
      layerConfig = {
        uuid: 'abcdef',
        subtype: 'remote',
        type: 'layer',
        add: true,
        name: 'Test',
        title: 'TestTitle',
        typeName: 'test',
        extent: [], CRS: ['EPSG:4326']
      };
      scope.$digest();
      server = serverService.getRegistryLayerConfig();

      minimalConfig = { source: 0,
                        name: layerConfig.title,
                        registry: true,
                        registryConfig: layerConfig
                      };

      compiledElement.scope().selectedLayers = {
        'abcdef' : layerConfig
      };

      // compiledElement.scope().configureServers();

      addLayerSpy = spyOn(mapService, 'addVirtualLayer');
      zoomToExtentForProjectionSpy = spyOn(mapService, 'zoomToExtentForProjection');
    });
    it('adds the layer via mapService addVirtualLayer', function() {
      // compiledElement.scope().addLayers();
      compiledElement.scope().addRemoteLayer(layerConfig).then(function() {
        expect(addLayerSpy).toHaveBeenCalledWith(minimalConfig, layerConfig, server);
      });
    });
    it('zooms to extent via mapService zoomToExtentForProjection', function() {
      // compiledElement.scope().addLayers();
      compiledElement.scope().addRemoteLayer(layerConfig).then(function() {
        expect(zoomToExtentForProjectionSpy).toHaveBeenCalled();
      });
    });
    it('layer should have extent and CRS', function() {
      // compiledElement.scope().addLayers(layerConfig);
      compiledElement.scope().addRemoteLayer(layerConfig).then(function() {
        expect(zoomToExtentForProjectionSpy).toHaveBeenCalledWith([], ol.proj.get('EPSG:4326'));
      });
    });
    it('clears the cart', function() {
      compiledElement.scope().clearSelectedLayers();
      expect(compiledElement.scope().getSelectedLayerCount()).toEqual(0);
    });
  });
  describe('#addToCart', function() {
    it('cart is empty by default', function() {
      expect(compiledElement.scope().getSelectedLayerCount()).toEqual(0);
    });
    it('add an item to the cart', function() {
      var layerConfig = { add: true, uuid: 'abcdef', extent: [], CRS: 'EPSG:4326' };
      compiledElement.scope().toggleLayer(layerConfig);
      expect(compiledElement.scope().getSelectedLayerCount()).toEqual(1);
    });
    it('adding again removes the cart', function() {
      var layerConfig = { add: true, uuid: 'abcdef', Title: 'Test', extent: [], CRS: 'EPSG:4326' };
      compiledElement.scope().toggleLayer(layerConfig);
      compiledElement.scope().toggleLayer(layerConfig);
      expect(compiledElement.scope().getSelectedLayerCount()).toEqual(0);
    });
    describe('with results', function() {
      var layerConfig = { uuid: 'abcdef', Title: 'Test', add: true, extent: [], CRS: 'EPSG:4326' };
      beforeEach(function() {
        spyOn(compiledElement.scope(), 'getResults').and.returnValue([layerConfig]);
        scope.$digest();
      });
      it('click on a result adds it to cart', function() {
        compiledElement.find('div.layer').click();
        expect(compiledElement.scope().getSelectedLayerCount()).toEqual(1);
      });
      it('click on Cart remove layer', function() {
        compiledElement.scope().toggleLayer(layerConfig);
        scope.$digest();
        compiledElement.find('div.selected-layer i').click();
        expect(compiledElement.scope().getSelectedLayerCount()).toEqual(0);
      });
    });
  });
  describe('#isInCart', function() {
    beforeEach(function() {
      compiledElement.scope().selectedLayers = {
        'abcdef' : {}
      };
    });
    it('returns true if in cart', function() {
      expect(compiledElement.scope().isLayerSelected({uuid: 'abcdef'})).toEqual(true);
    });
    it('returns false if not in cart', function() {
      expect(compiledElement.scope().isLayerSelected({uuid: 'qwerty'})).toEqual(false);
    });
  });
  describe('#clearCart', function() {
    it('clears the cart', function() {
      // select a layer
      compiledElement.scope().selectedLayers = {
        'abcdef' : {}
      };
      compiledElement.scope().clearSelectedLayers();
      expect(compiledElement.scope().getSelectedLayerCount()).toEqual(0);
    });
  });
});
