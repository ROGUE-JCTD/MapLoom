console.log = function(sdf) {}; ///turn off console logging when the test runs
describe('addLayers/ServerService', function() {
  var serverService, $httpBackend;
  var configService = {};
  var filterOptions = { owner: null, text: null, docsPage: null, size: null };
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_addlayers'));

  beforeEach(inject(function(_serverService_, _configService_, _$httpBackend_) {
    serverService = _serverService_;
    configService = _configService_;
    $httpBackend = _$httpBackend_;
  }));

  afterEach(function() {
  });

  describe('#reformatLayerConfigs', function() {
    describe('no layers', function() {
      it('returns an empty array', function() {
        expect(serverService.reformatLayerConfigs({objects: [] }, '').length).toEqual(0);
      });
    });
    describe('result has one layer', function() {
      var layers = {};
      beforeEach(function() {
        layers.objects = [
          {
            title: 'Ocean Beach',
            detail_url: '/layers/OceanBeach',
            thumbnail_url: 'beach.png',
            owner__first_name: 'Edsger',
            owner__last_name: 'Dijkstra'
          }
        ];
      });
      it('returns one formatted layer', function() {
        expect(serverService.reformatLayerConfigs(layers, '').length).toEqual(1);
      });
      it('has a Title', function() {
        expect(serverService.reformatLayerConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          Title: 'Ocean Beach'
        }));
      });
      it('has the first and last name as author', function() {
        expect(serverService.reformatLayerConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          author: 'Edsger Dijkstra'
        }));
      });
      it('has a thumbnail url', function() {
        expect(serverService.reformatLayerConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          thumbnail_url: 'beach.png'
        }));
      });
    });
    describe('result has a missing thumbnail', function() {
      var layers = {};
      beforeEach(function() {
        layers.objects = [
          {
            title: 'Ocean Beach',
            detail_url: '/layers/OceanBeach',
            thumbnail_url: 'missing_thumb.png'
          }
        ];
      });
      it('has uses the WMS Reflector', function() {
        expect(serverService.reformatLayerConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          thumbnail_url: '/reflect?format=application/openlayers&layers=OceanBeach&width=200'
        }));
      });
    });
    describe('result has no owner firstname', function() {
      var layers = {};
      beforeEach(function() {
        layers.objects = [
          {
            title: 'Ocean Beach',
            detail_url: '/layers/OceanBeach',
            owner__username: 'Dijkstra'
          }
        ];
      });
      it('has uses the WMS Reflector', function() {
        expect(serverService.reformatLayerConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          author: 'Dijkstra'
        }));
      });
    });
    describe('result has no detailUrl', function() {
      var layers = {};
      beforeEach(function() {
        layers.objects = [
          {
            title: 'Ocean Beach'
          }
        ];
      });
      it('has one layer', function() {
        expect(serverService.reformatLayerConfigs(layers, '').length).toEqual(1);
      });
    });
  });
  describe('#reformatLayerHyperConfigs', function() {
    describe('no layers', function() {
      it('returns an empty array', function() {
        expect(serverService.reformatLayerHyperConfigs({hits: { hits: [] }}, '').length).toEqual(0);
      });
    });
    describe('result has one layer', function() {
      var layers = { 'd.docs': [] };
      beforeEach(function() {
        configService.configuration.registryUrl = 'http://server.registry/registry/';
        layers['d.docs'] = [
          {
            type: 'Layer',
            id: '61',
            title: 'Ocean Beach',
            abstract: '',
            name: "12790",
            domain_name: 'harvard.org',
            LayerUrl: '/layers/OceanBeach',
            LayerUsername: 'Admin',
            max_x: 1,
            max_y: 1,
            min_x: 0,
            min_y: 0
          }
        ];
      });
      it('returns one formatted layer', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '', 0).length).toEqual(1);
      });
      it('has a Title', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          title: 'Ocean Beach'
        }));
      });
      it('has a Domain', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          domain: 'harvard.org'
        }));
      });
      it('has a author', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          author: 'Admin'
        }));
      });
      it('has an extent', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          extent: [0, 0, 1, 1]
        }));
      });
      it('has a CRS', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          CRS: ['EPSG:4326']
        }));
      });
      it('should add the registry path to a relative tile_url', function() {
        var relative_url = '/layers/aaaaaaaa-bbbb-cccc-ddd/${x}/${y}/${z}.png';
        layers['d.docs'][0].tile_url = relative_url;

        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          detail_url: 'http://server.registry/registry' + relative_url
        }));
      });

      it('should add the registry path to an absolute tile_url', function() {
        var relative_url = '/layers/aaaaaaaa-bbbb-cccc-ddd/${x}/${y}/${z}.png';
        var server_url = '//server.registry/registry';
        layers['d.docs'][0].tile_url = 'http:' + server_url + relative_url;

        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          detail_url: server_url + relative_url
        }));
      });

      it('should add the registry path to a schemaless tile_url', function() {
        var relative_url = '/layers/aaaaaaaa-bbbb-cccc-ddd/${x}/${y}/${z}.png';
        var server_url = '//server.registry/registry';
        layers['d.docs'][0].tile_url = server_url + relative_url;

        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          detail_url: server_url + relative_url
        }));
      });

      it('should handle a relative registry path with the tile_url', function() {
        configService.configuration.registryUrl = '/registry/';
        layers['d.docs'][0].tile_url = '/layers/aaaaaaaa-bbbb-cccc-ddd/${x}/${y}/${z}.png';

        expect(serverService.reformatLayerHyperConfigs(layers, '', 0)[0]).toEqual(jasmine.objectContaining({
          detail_url: '/registry/layers/aaaaaaaa-bbbb-cccc-ddd/${x}/${y}/${z}.png' 
        }));
      });

    });
  });
  describe('#populateLayersConfigElastic', function() {
    describe('no server', function() {
      it('returns an empty array', function() {
        expect(serverService.populateLayersConfigElastic('', {})).toEqual(false);
      });
    });
    beforeEach(function() {
      $httpBackend.expect('GET', '/api/layers/search/?is_published=true&limit=100').respond(200, []);
    });
    describe('server is available and returns results', function() {
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        serverService.populateLayersConfigElastic({}, null);
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).toHaveBeenCalled();
      });
      it('calls reformatLayerConfigs with a geoserver URL', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        var geoserver_config = serverService.getServerByUrl('//server/geoserver/wms');
        serverService.populateLayersConfigElastic(geoserver_config, {});
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).toHaveBeenCalledWith([], geoserver_config.id);
      });
    });
    describe('search server is invalid', function() {
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        serverService.populateLayersConfigElastic({}, null);
        expect(serverService.reformatLayerConfigs).not.toHaveBeenCalled();
      });
    });
  });
  describe('#applyESFilter', function() {
    describe('no filter', function() {
      it('returns an empty object', function() {
        var filterOptions = {
          owner: null,
          text: null,
          docsPage: null,
          size: null,
          mapPreviewCoordinatesBbox: null,
          histogramFlag: false
        };
        expect(serverService.applyESFilter(filterOptions)).toEqual({});
      });
    });
    describe('only text filter', function() {
      it('returns the url with q_text', function() {
        var filterOptions = {
          owner: null,
          text: 'Ocean',
          docsPage: null,
          size: null
        };
        expect(serverService.applyESFilter(filterOptions)).toEqual({'q.text' : 'Ocean'});
      });
    });
    describe('only owner filter', function() {
      beforeEach(function() {
        configService.username = 'Dijkstra';
      });
      it('returns the url with q', function() {
        var filterOptions = {
          owner: 'Dijkstra',
          text: null,
          docsPage: null,
          size: null
        };
        expect(serverService.applyESFilter(filterOptions)).toEqual({'owner__username__in' : 'Dijkstra'});
      });
    });
    describe('pagination', function() {
      it('first page has no docsPage', function() {
        var filterOptions = {
          owner: null,
          text: null,
          docsPage: null,
          size: 10
        };
        expect(serverService.applyESFilter(filterOptions)).toEqual({'d.docs.limit' : 10});
      });
      it('pagination with docsPage', function() {
        var filterOptions = {
          owner: null,
          text: null,
          docsPage: 10,
          size: 10
        };
        expect(serverService.applyESFilter(filterOptions)).toEqual({'d.docs.limit' : 10, 'd.docs.page' : 10});
      });
    });
  });
  describe('#reformatConfigForFavorites', function() {
    describe('no layers', function() {
      it('returns an empty array', function() {
        expect(serverService.reformatConfigForFavorites({objects: [] }, '').length).toEqual(0);
      });
    });
    describe('result has one layer', function() {
      var layers = {};
      beforeEach(function() {
        layers.objects = [
          {
            content_object: {
              title: 'Ocean Beach',
              detail_url: '/layers/OceanBeach',
              thumbnail_url: 'beach.png',
              owner__first_name: 'Edsger',
              owner__last_name: 'Dijkstra'
            }
          }
        ];
      });
      it('returns one formatted layer', function() {
        expect(serverService.reformatConfigForFavorites(layers, '').length).toEqual(1);
      });
    });
  });
  describe('#addSearchResultsForFavorites', function() {
    describe('no server', function() {
      it('returns an empty array', function() {
        expect(serverService.addSearchResultsForFavorites('', filterOptions)).toEqual(false);
      });
    });
    beforeEach(function() {
      $httpBackend.expect('GET', '/api/favorites/?content_type=42&limit=100').respond(200, []);
    });
    describe('server is available and returns results', function() {
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatConfigForFavorites');
        serverService.addSearchResultsForFavorites({}, null);
        $httpBackend.flush();
        expect(serverService.reformatConfigForFavorites).toHaveBeenCalled();
      });
      it('calls reformatLayerConfigs with a geoserver URL', function() {
        spyOn(serverService, 'reformatConfigForFavorites');
        var geoserver_config = serverService.getServerByUrl('//server/geoserver/wms');
        serverService.addSearchResultsForFavorites(geoserver_config, {});
        $httpBackend.flush();
        // The GeoServer server is usually configured in server id 1 or 2.
        expect(serverService.reformatConfigForFavorites).toHaveBeenCalledWith([], geoserver_config.id);
      });
    });
    describe('search server is invalid', function() {
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatConfigForFavorites');
        serverService.addSearchResultsForFavorites({}, filterOptions);
        expect(serverService.reformatConfigForFavorites).not.toHaveBeenCalled();
      });
    });
    describe('filter for title', function() {
      beforeEach(function() {
        $httpBackend.expect('GET', '/api/favorites/?content_type=42&limit=100&title__contains=Dijkstra').respond(200, []);
      });
      it('returns the url with title__contains', function() {
        spyOn(serverService, 'applyFavoritesFilter');
        var filterOptions = {
          text: 'Dijkstra'
        };
        serverService.addSearchResultsForFavorites({}, filterOptions);
        expect(serverService.applyFavoritesFilter).toHaveBeenCalled();
      });
    });
  });

  describe('#addSearchResultsForHyper', function() {
    describe('no server', function() {
      it('returns an empty array', function() {
        expect(serverService.addSearchResultsForHyper('', filterOptions, 0)).toEqual(false);
      });
    });
    describe('server is available and returns results', function() {
      beforeEach(function() {
        var searchUrl = configService.configuration.serverLocation + '/registry/catalogname/api/?';
        $httpBackend.expect('GET', searchUrl).respond(200, []);
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerHyperConfigs');
        var catalog = {search_url: '/registry/catalogname/api/'};
        serverService.addSearchResultsForHyper({}, null, catalog);
        $httpBackend.flush();
        expect(serverService.reformatLayerHyperConfigs).toHaveBeenCalled();
      });
    });
  });

  describe('replaceVirtualServiceUrl', function() {
    it('should change a url pointing to a specific wms to the server\'s url', function() {
      var testServerInfo = {
        url: 'http://192.168.99.110:8888/proxy/http://192.168.99.110:8080/geoserver/wms'
      };
      var replacedServerInfo = serverService.replaceVirtualServiceUrl(testServerInfo);
      expect(replacedServerInfo.url).toBe('http://192.168.99.110:8888/proxy/192.168.99.110:8080');
    });

    it('isVirtualService should be true if serverInfo.url is a virtual service', function() {
      var testServerInfo = {
        url: 'http://192.168.99.110:8888/proxy/http://192.168.99.110:8080/geoserver/wms'
      };
      var replacedServerInfo = serverService.replaceVirtualServiceUrl(testServerInfo);
      expect(replacedServerInfo.isVirtualService).toBe(true);
    });

    it('isVirtualService should be false if serverInfo.url is not a virtual service', function() {
      var testServerInfo = {
        url: 'http://192.168.99.110:8080'
      };
      var replacedServerInfo = serverService.replaceVirtualServiceUrl(testServerInfo);
      expect(replacedServerInfo.isVirtualService).toBe(false);
    });

    it('should return null if serverInfo does not contain a url property', function() {
      var testObj = {};
      var virtualServiceUrl = serverService.replaceVirtualServiceUrl(testObj);
      expect(virtualServiceUrl).toBe(null);
    });
  });

  describe('getMostSpecificUrl', function() {
    it('should return a virtual service url without \'wms\' if virtual service url is available', function() {
      testService = {
        url: 'http://test.com',
        virtualServiceUrl: 'http://test.com/geoserver/wms',
        isVirtualService: true
      };
      var mostSpecificUrl = serverService.getMostSpecificUrl(testService);
      expect(mostSpecificUrl).toBe('http://test.com/geoserver');
    });

    it('should return the server url if a virtual service url isn\'t available', function() {
      testService = {
        url: 'http://test.com'
      };
      var mostSpecificUrl = serverService.getMostSpecificUrl(testService);
      expect(mostSpecificUrl).toBe(testService.url);
    });
  });

  describe('getWfsRequestUrl', function() {
    it('should return a WFS dispatcher URL given a server url', function() {
      var testUrl = "http://domain.com";
      var actualUrl = serverService.getWfsRequestUrl(testUrl);
      var expectedUrl = testUrl + '/wfs/WfsDispatcher';
      expect(expectedUrl).toBe(actualUrl);
    });
  });

  describe('getWfsRequestHeaders', function() {
    beforeEach(inject(function (_$rootScope_, _$location_) {
        $rootScope = _$rootScope_;
        $location = _$location_;
    }));

    it('should return a basic http authorization token in the headers if the server object has authentication defined', function() {
      var server = {
        url: 'local.com',
        authentication: 'auth string'
      };
      var headers = serverService.getWfsRequestHeaders(server);
      expect(headers['Authorization']).toBeDefined();
    });
  });

  describe('replaceVirtualServiceUrl', function() {
    it('should change a url pointing to a specific wms to the server\'s url', function() {
      var testServerInfo = {
        url: 'http://192.168.99.110:8888/proxy/http://192.168.99.110:8080/geoserver/wms'
      };
      var replacedServerInfo = serverService.replaceVirtualServiceUrl(testServerInfo);
      expect(replacedServerInfo.url).toBe('http://192.168.99.110:8888/proxy/192.168.99.110:8080');
    });

    it('isVirtualService should be true if serverInfo.url is a virtual service', function() {
      var testServerInfo = {
        url: 'http://192.168.99.110:8888/proxy/http://192.168.99.110:8080/geoserver/wms'
      };
      var replacedServerInfo = serverService.replaceVirtualServiceUrl(testServerInfo);
      expect(replacedServerInfo.isVirtualService).toBe(true);
    });

    it('isVirtualService should be false if serverInfo.url is not a virtual service', function() {
      var testServerInfo = {
        url: 'http://192.168.99.110:8080'
      };
      var replacedServerInfo = serverService.replaceVirtualServiceUrl(testServerInfo);
      expect(replacedServerInfo.isVirtualService).toBe(false);
    });

    it('should return null if serverInfo does not contain a url property', function() {
      var testObj = {};
      var virtualServiceUrl = serverService.replaceVirtualServiceUrl(testObj);
      expect(virtualServiceUrl).toBe(null);
    });
  });

  describe('getMostSpecificUrl', function() {
    it('should return a virtual service url without \'wms\' if virtual service url is available', function() {
      testService = {
        url: 'http://test.com',
        virtualServiceUrl: 'http://test.com/geoserver/wms',
        isVirtualService: true
      };
      var mostSpecificUrl = serverService.getMostSpecificUrl(testService);
      expect(mostSpecificUrl).toBe('http://test.com/geoserver');
    });

    it('should return the server url if a virtual service url isn\'t available', function() {
      testService = {
        url: 'http://test.com'
      };
      var mostSpecificUrl = serverService.getMostSpecificUrl(testService);
      expect(mostSpecificUrl).toBe(testService.url);
    });
  });

  describe('getWfsRequestUrl', function() {
    it('should return a WFS dispatcher URL given a server url', function() {
      var testUrl = "http://domain.com";
      var actualUrl = serverService.getWfsRequestUrl(testUrl);
      var expectedUrl = testUrl + '/wfs/WfsDispatcher';
      expect(expectedUrl).toBe(actualUrl);
    });
  });

  describe('getWfsRequestHeaders', function() {
    beforeEach(inject(function (_$rootScope_, _$location_) {
        $rootScope = _$rootScope_;
        $location = _$location_;
    }));

    it('should return a basic http authorization token in the headers if the server object has authentication defined', function() {
      var server = {
        url: 'local.com',
        authentication: 'auth string'
      };
      var headers = serverService.getWfsRequestHeaders(server);
      expect(headers['Authorization']).toBeDefined();
    });
  });

  describe('getServerById', function() {
    it('should return a server with the matching ID', function() {
      expect(serverService.getServerById(serverService.getServers()[0].id)).toBe(serverService.getServers()[0]);
    });
  });

});
