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
      var spy = spyOn(mapService, 'createLayer');
      var layerConfig = { CRS: 'Test', Name: 'Test' };
      compiledElement.scope().previewLayer(layerConfig);
      expect(spy).toHaveBeenCalled();
    });
    it('previewLayers includes the created layer', function() {
      var createdLayer = { name: 'Test' };
      var spy = spyOn(mapService, 'createLayer').andReturn(createdLayer);
      var layerConfig = { CRS: 'Test', Name: 'Test' };
      compiledElement.scope().previewLayer(layerConfig);
      expect(compiledElement.scope().previewLayers).toContain(createdLayer);
    });
    it('resets the CRS to an array', function() {
      var spy = spyOn(mapService, 'createLayer');
      var layerConfig = { CRS: 'Test', Name: 'Test' };
      compiledElement.scope().previewLayer(layerConfig);
      expect(layerConfig.CRS).toEqual(['EPSG:4326']);
    });
  });
});
