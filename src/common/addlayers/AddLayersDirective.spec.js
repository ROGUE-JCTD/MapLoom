describe('StoryLegendDirective', function() {
  var element, scope, compiledElement, serverService, mapService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_addlayers'));
  beforeEach(module('addlayers/partials/addlayers.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _serverService_, _mapService_) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-addlayers></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    serverService = _serverService_;
    mapService = _mapService_;
  }));
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
          from: 10,
          size: 10
        }));
      });
      it('next page if from is set', function() {
        compiledElement.scope().filterOptions.from = 10;
        compiledElement.scope().nextPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          from: 20,
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
        spyOn(compiledElement.scope(), 'getResults').and.returnValue([1,1,1,1,1,1,1,1,1,1]);
        expect(compiledElement.scope().hasNext()).toEqual(true);
      });
      it('returns false if result size is less than the search size', function() {
        spyOn(compiledElement.scope(), 'getResults').and.returnValue([1]);
        expect(compiledElement.scope().hasNext()).toEqual(false);
      });
    });
    describe('#hasPrevious', function() {
      it('returns true if has previous', function() {
        compiledElement.scope().filterOptions.from = 10;
        expect(compiledElement.scope().hasPrevious()).toEqual(true);
      });
      it('returns false if result is first page', function() {
        compiledElement.scope().filterOptions.from = null;
        expect(compiledElement.scope().hasPrevious()).toEqual(false);
      });
    });
    describe('#previous page', function() {
      it('sets from', function() {
        compiledElement.scope().previousPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          from: null,
          size: 10
        }));
      });
      it('previous page if from is set', function() {
        compiledElement.scope().filterOptions.from = 20;
        compiledElement.scope().previousPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          from: 10,
          size: 10
        }));
      });
      it('previous is first page set to null', function() {
        compiledElement.scope().filterOptions.from = 10;
        compiledElement.scope().previousPage();
        expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
          text: null,
          owner: null,
          from: null,
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
    var layerConfig, minimalConfig, addLayerSpy, zoomToExtentForProjectionSpy;
    beforeEach(function() {
      layerConfig = { add: true, Name: 'Test', extent: [], CRS: 'EPSG:4326' };
      compiledElement.scope().cart = [layerConfig];
      scope.$digest();
      minimalConfig = { source: 0, name: layerConfig.Name };
      addLayerSpy = spyOn(mapService, 'addLayer');
      zoomToExtentForProjectionSpy = spyOn(mapService, 'zoomToExtentForProjection');
    });
    it('adds the layer via mapSerice addLayer', function() {
      compiledElement.scope().addLayers();
      expect(addLayerSpy).toHaveBeenCalledWith(minimalConfig);
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
      beforeEach(function() {
        var layerConfig = { Title: 'Test', add: true, extent: [], CRS: 'EPSG:4326' };
        spyOn(serverService, 'getLayersConfigByName').and.returnValue([layerConfig]);
        scope.$digest();
      });
      it('click on a result adds it to cart', function() {
        compiledElement.find('tr.result').click();
        expect(compiledElement.scope().cart.length).toEqual(1);
      });
      it('click on a result adds it to cart', function() {
        compiledElement.find('tr.result').click();
        expect(compiledElement.scope().cart.length).toEqual(1);
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
      cartLayerName = [1];
    });
    it('returns true if in cart', function() {
      expect(compiledElement.scope().isInCart({'Name':1})).toEqual(true);
    });
    it('returns false if not in cart', function() {
      expect(compiledElement.scope().isInCart({'Name':2})).toEqual(false);
    });
  });
});
