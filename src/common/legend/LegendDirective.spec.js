/** Tests for the Legend Directive.
 *
 */
describe('LegendDirective', function() {
  var element, scope, compiledElement, configService, serverService, mapService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_legend'));
  beforeEach(module('legend/partial/legend.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _configService_,
                            _serverService_, _mapService_) {
    scope = $rootScope.$new();
    element = angular.element('<div class="loom-legend"></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();

    configService = _configService_;
    serverService = _serverService_;
    mapService = _mapService_;

    mapService.map.layers = null;
    serverService.getServers().length = 0;
    mapService.loadLayers();
    scope.$apply();
  }));
  describe('basic render', function() {
    it('creates a legend-container', function() {
      expect(compiledElement.find('div#legend-container').length).toEqual(1);
    });
  });

  describe('handle both ? and ?-free urls', function() {
    it('should generate a GetLegendGraphic url', function() {
      serverService.addServer({
        'url': '//fake-uri.com/gs/wms',
        'restUrl': '//fake-uri.com/fake-gs/rest',
        'ptype': 'gxp_wmscsource',
        'name': 'NO QUESTION',
        'elastic': true,
        'alwaysAnonymous': true,
        'lazy': true
      });

      scope.$apply();

      // get the server definition
      var server = serverService.getServerByName('NO QUESTION');
      // fake the WMS config
      server.layersConfig = [{
        Name: 'test1',
        Title: 'test1'
      }];

      // add the layer to the map.
      var layer = mapService.addLayer({
        'name' : 'test1',
        'title' : 'test1',
        'source' : server.id,
        'ptype' : server.ptype
      });
      scope.$apply();

      // test the URL.
      var legend_url = scope.getLegendUrl(layer);
      expect(legend_url.split('?').length).toBe(2);
    });
    it('should drop the second "?"', function() {
      serverService.addServer({
        'url': '//fake-uri.com/gs/wms?oath=fake-auth',
        'restUrl': '//fake-uri.com/fake-gs/rest',
        'ptype': 'gxp_wmscsource',
        'name': 'WITH QUESTION',
        'elastic': true,
        'alwaysAnonymous': true,
        'lazy': true
      });

      scope.$apply();

      // get the server definition
      var server = serverService.getServerByName('WITH QUESTION');
      // fake the WMS config
      server.layersConfig = [{
        Name: 'test2',
        Title: 'test2'
      }];

      // add the layer to the map.
      var layer = mapService.addLayer({
        'name' : 'test2',
        'title' : 'test2',
        'source' : server.id,
        'ptype' : server.ptype
      });
      scope.$apply();

      // test the URL.
      var legend_url = scope.getLegendUrl(layer);
      expect(legend_url.split('?').length).toBe(2);
    });

  });
});


