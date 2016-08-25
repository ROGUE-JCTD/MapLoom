describe('registryLayersDirective', function() {
  var element, scope, compiledElement, configService, serverService, mapService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_addlayers'));
  beforeEach(module('addlayers/partials/registryLayers.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _configService_,
                            _serverService_, _mapService_) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-registrylayers></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    configService = _configService_;
    serverService = _serverService_;
    mapService = _mapService_;
  }));
  describe('#addRegistryLayersFromSavedMap', function() {
    var addLayerSpy;
    beforeEach(function() {
      layerConfig = { add: true,
                      Name: 'Test',
                      extent: [],
                      CRS: ['EPSG:4326'] };
      minimalConfig = { source: 0,
                        name: layerConfig.Name,
                        registry: true,
                        registryConfig: layerConfig
                      };
      configService.configuration.map['layers'] = [minimalConfig];
      addLayerSpy = spyOn(compiledElement.scope(), 'addLayers');
    });
    it('should add layers to map stored in config map object', function() {
      compiledElement.scope().addRegistryLayersFromSavedMap(configService.configuration.map['layers']);
      expect(addLayerSpy).toHaveBeenCalled();
    });
  });
  describe('default search', function() {
    it('changes the filterOptions', function() {
      compiledElement.find('ul.nav-tabs li:nth-child(2) a').click();
      compiledElement.find('ul.nav-tabs li:nth-child(1) a').click();
      expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
        owner: null
      }));
    });
  });
  describe('search', function() {
    var searchSpy;
    beforeEach(function() {
      searchSpy = spyOn(compiledElement.scope(), 'search');
    });
    describe('#searchMyFavorites', function() {
      it('resets filterOptions', function() {
        compiledElement.scope().filterOptions.text = 'Ocean Beach';
        compiledElement.scope().searchMyFavorites();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null
        }));
      });
    });
    describe('#defaultSearch', function() {
      it('resets text in the filterOptions', function() {
        compiledElement.scope().filterOptions.text = 'Ocean Beach';
        compiledElement.scope().defaultSearch();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null
        }));
      });
      it('resets owner in the filterOptions', function() {
        compiledElement.scope().filterOptions.owner = 'Djikstra';
        compiledElement.scope().defaultSearch();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          owner: null
        }));
      });
      it('calls search', function() {
        compiledElement.scope().defaultSearch();
        expect(searchSpy).toHaveBeenCalled();
      });
    });
    describe('#next page', function() {
      it('sets from', function() {
        compiledElement.scope().nextPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          docsPage: 2,
          size: 10
        }));
      });
      it('next page if from is set', function() {
        compiledElement.scope().filterOptions.docsPage = 2;
        compiledElement.scope().nextPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          docsPage: 3,
          size: 10
        }));
      });
      it('calls search', function() {
        compiledElement.scope().nextPage();
        expect(searchSpy).toHaveBeenCalled();
      });
    });
    describe('#hasNext', function() {
      it('returns true if has next', function() {
        compiledElement.scope().pagination.pages = 2;
        compiledElement.scope().pagination.currentPage = 1;
        expect(compiledElement.scope().hasNext()).toEqual(true);
      });
      it('returns false if result size is less than the search size', function() {
        compiledElement.scope().pagination.pages = 1;
        compiledElement.scope().pagination.currentPage = 1;
        expect(compiledElement.scope().hasNext()).toEqual(false);
      });
    });
    describe('#hasPrevious', function() {
      it('returns true if has previous', function() {
        compiledElement.scope().filterOptions.docsPage = 2;
        expect(compiledElement.scope().hasPrevious()).toEqual(true);
      });
      it('returns false if result is first page', function() {
        compiledElement.scope().filterOptions.docsPage = 1;
        expect(compiledElement.scope().hasPrevious()).toEqual(false);
      });
    });
    describe('#previous page', function() {
      it('sets docsPage', function() {
        compiledElement.scope().previousPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          docsPage: 1,
          size: 10
        }));
      });
      it('previous page if from is set', function() {
        compiledElement.scope().filterOptions.docsPage = 20;
        compiledElement.scope().previousPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          docsPage: 19,
          size: 10
        }));
      });
      it('previous is first page set to 1', function() {
        compiledElement.scope().filterOptions.docsPage = 2;
        compiledElement.scope().previousPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          docsPage: 1,
          size: 10
        }));
      });
      it('calls search', function() {
        compiledElement.scope().previousPage();
        expect(searchSpy).toHaveBeenCalled();
      });
    });
  });
  describe('#search', function() {
    describe('#searchMyFavorites', function() {
      it('calls addSearchResultsForFavorites', function() {
        var spy = spyOn(serverService, 'addSearchResultsForFavorites');
        compiledElement.scope().searchMyFavorites();
        expect(spy).toHaveBeenCalled();
      });
    });
    describe('#defaultSearch', function() {
      it('calls populateLayersConfigElastic', function() {
        var spy = spyOn(serverService, 'populateLayersConfigElastic');
        compiledElement.scope().defaultSearch();
        expect(spy).toHaveBeenCalled();
      });
    });
    describe('#searchMyUploads', function() {
      it('calls populateLayersConfigElastic', function() {
        var spy = spyOn(serverService, 'populateLayersConfigElastic');
        compiledElement.scope().searchMyUploads();
        expect(spy).toHaveBeenCalled();
      });
    });
  });
  describe('#resetOwner', function() {
  });
  describe('#previewLayer', function() {
    it('calls createLayer', function() {
      var spy = spyOn(mapService, 'createLayerWithFullConfig');
      var layerConfig = { CRS: 'Test', Name: 'Test' };
      compiledElement.scope().previewLayer(layerConfig);
      expect(spy).toHaveBeenCalled();
    });
    it('previewLayers includes the created layer', function() {
      var createdLayer = { name: 'Test' };
      compiledElement.scope().currentServerId = 0;
      spyOn(mapService, 'createLayerWithFullConfig').and.returnValue(createdLayer);
      var layerConfig = { CRS: 'Test', Name: 'Test' };
      compiledElement.scope().previewLayer(layerConfig);
      expect(compiledElement.scope().previewLayers).toContain(createdLayer);
    });
    it('resets the CRS to an array', function() {
      spyOn(mapService, 'createLayerWithFullConfig');
      var layerConfig = { CRS: 'Test', Name: 'Test' };
      compiledElement.scope().previewLayer(layerConfig);
      expect(layerConfig.CRS).toEqual(['EPSG:4326']);
    });
  });
  describe('#addLayers', function() {
    var layerConfig, minimalConfig, addLayerSpy, zoomToExtentForProjectionSpy, server;
    beforeEach(function() {
      layerConfig = { add: true, name: 'Test', title: 'TestTitle', extent: [], CRS: ['EPSG:4326'] };
      server = angular.copy(serverService.getRegistryLayerConfig());
      compiledElement.scope().cart = [layerConfig];
      scope.$digest();
      minimalConfig = { source: 0,
                        name: layerConfig.title,
                        registry: true,
                        registryConfig: layerConfig
                      };
      addLayerSpy = spyOn(mapService, 'addVirtualLayer');
      zoomToExtentForProjectionSpy = spyOn(mapService, 'zoomToExtentForProjection');
    });
    it('adds the layer via mapService addVirtualLayer', function() {
      compiledElement.scope().addLayers();
      expect(addLayerSpy).toHaveBeenCalledWith(minimalConfig, layerConfig, server);
    });
    it('zooms to extent via mapService zoomToExtentForProjection', function() {
      compiledElement.scope().addLayers();
      expect(zoomToExtentForProjectionSpy).toHaveBeenCalled();
    });
    it('layer should have extent and CRS', function() {
      compiledElement.scope().addLayers(layerConfig);
      expect(zoomToExtentForProjectionSpy).toHaveBeenCalledWith([], ol.proj.get('EPSG:4326'));
    });
    it('clears the cart', function() {
      compiledElement.scope().addLayers();
      expect(compiledElement.scope().cart.length).toEqual(0);
    });
  });
  describe('#addToCart', function() {
    it('cart is empty by default', function() {
      expect(compiledElement.scope().cart.length).toEqual(0);
    });
    it('add an item to the cart', function() {
      var layerConfig = { add: true, extent: [], CRS: 'EPSG:4326' };
      compiledElement.scope().addToCart(layerConfig);
      expect(compiledElement.scope().cart.length).toEqual(1);
    });
    it('adding again removes the cart', function() {
      var layerConfig = { add: true, Title: 'Test', extent: [], CRS: 'EPSG:4326' };
      compiledElement.scope().addToCart(layerConfig);
      compiledElement.scope().addToCart(layerConfig);
      expect(compiledElement.scope().cart.length).toEqual(0);
    });
    describe('with results', function() {
      var layerConfig = { Title: 'Test', add: true, extent: [], CRS: 'EPSG:4326' };
      beforeEach(function() {
        spyOn(compiledElement.scope(), 'getResults').and.returnValue([layerConfig]);
        scope.$digest();
      });
      it('click on a result adds it to cart', function() {
        compiledElement.find('tr.result').click();
        expect(compiledElement.scope().cart.length).toEqual(1);
      });
      it('click on Cart remove layer', function() {
        compiledElement.scope().addToCart(layerConfig);
        scope.$digest();
        compiledElement.find('tr.result span').click();
        expect(compiledElement.scope().cart.length).toEqual(0);
      });
    });
  });
  describe('#clearCart', function() {
    it('clears the cart', function() {
      compiledElement.scope().cart = [1];
      compiledElement.scope().clearCart();
      expect(compiledElement.scope().cart.length).toEqual(0);
    });
  });
  describe('#isInCart', function() {
    beforeEach(function() {
      cartLayerId = [1];
    });
    it('returns true if in cart', function() {
      expect(compiledElement.scope().isInCart({'layerId':1})).toEqual(true);
    });
    it('returns false if not in cart', function() {
      expect(compiledElement.scope().isInCart({'layerId':2})).toEqual(false);
    });
  });
});
