describe('addLayers/ServerService', function() {
  var serverService, $httpBackend;
  var configService = {};
  var filterOptions = { owner: null, text: null, from: null, size: null };
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_addlayers'));

  beforeEach(function() {
    module(function($provide) {
      $provide.value('configService', configService);
    });
  });
  beforeEach(inject(function(_serverService_, _configService_, _$httpBackend_) {
    serverService = _serverService_;
    $httpBackend = _$httpBackend_;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
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
      var layers = { hits: {} };
      beforeEach(function() {
        layers.hits.hits = [
          {
            _type: 'layer',
            _id: '61',
            _source: {
              LayerTitle: 'Ocean Beach',
              Abstract: '',
              LayerId: '60',
              LayerName: 'geonode:oceanbeach',
              LayerUrl: '/layers/OceanBeach',
              ThumbnailURL: '/test.jpg',
              DomainName: 'harvard.org',
              LayerUsername: 'Admin',
              MaxX: 1,
              MaxY: 1,
              MinX: 0,
              MinY: 0
            }
          }
        ];
      });
      it('returns one formatted layer', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '').length).toEqual(1);
      });
      it('has a thumbnail image', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          thumbnail_url: 'http://52.38.116.143/test.jpg'
        }));
      });
      it('has a Title', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          Title: 'Ocean Beach'
        }));
      });
      it('has a Domain', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          domain: 'harvard.org'
        }));
      });
      it('has a author', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          author: 'Admin'
        }));
      });
      it('has an extent', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          extent: [0, 0, 1, 1]
        }));
      });
      it('has a CRS', function() {
        expect(serverService.reformatLayerHyperConfigs(layers, '')[0]).toEqual(jasmine.objectContaining({
          CRS: ['EPSG:4326']
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
    describe('server is available and returns results', function() {
      beforeEach(function() {
        $httpBackend.resetExpectations();
        $httpBackend.expect('POST', '/api/layers/search/?is_published=true&limit=100').respond(200, []);
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        serverService.populateLayersConfigElastic({}, filterOptions);
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).toHaveBeenCalled();
      });
      it('calls reformatLayerConfigs with a geoserver URL', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        serverService.populateLayersConfigElastic({}, filterOptions);
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).toHaveBeenCalledWith([], '/geoserver/wms');
      });
    });
    describe('search server is invalid', function() {
      beforeEach(function() {
        $httpBackend.expect('POST', '/api/layers/search/?is_published=true&limit=100').respond(500, '');
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        serverService.populateLayersConfigElastic({}, filterOptions);
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).not.toHaveBeenCalled();
      });
    });
  });
  describe('#applyESFilter', function() {
    describe('no filter', function() {
      it('returns the url', function() {
        var filterOptions = {
          owner: null,
          text: null,
          from: null,
          size: null
        };
        expect(serverService.applyESFilter('mapstory', filterOptions)).toEqual('mapstory');
      });
    });
    describe('only text filter', function() {
      it('returns the url with q', function() {
        var filterOptions = {
          owner: null,
          text: 'Ocean',
          from: null,
          size: null
        };
        var body = {
                     'query': {
                       'bool': {
                         'must': [{
                                   'query_string': {
                                     'query': 'Ocean'
                                   }
                                 }]
                       }
                     }
                   };
        expect(serverService.applyBodyFilter(filterOptions)).toEqual(body);
      });
    });
    describe('only owner filter', function() {
      beforeEach(function() {
        configService.username = 'Dijkstra';
      });
      it('returns the url with q', function() {
        var filterOptions = {
          owner: true,
          text: null,
          from: null,
          size: null
        };
        expect(serverService.applyESFilter('mapstory', filterOptions)).toEqual('mapstory&owner__username__in=Dijkstra');
      });
    });
    describe('pagination', function() {
      it('first page has no from', function() {
        var filterOptions = {
          owner: null,
          text: null,
          from: null,
          size: 10
        };
        expect(serverService.applyESFilter('mapstory', filterOptions)).toEqual('mapstory&size=10');
      });
      it('pagination with from', function() {
        var filterOptions = {
          owner: null,
          text: null,
          from: 10,
          size: 10
        };
        expect(serverService.applyESFilter('mapstory', filterOptions)).toEqual('mapstory&size=10&from=10');
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
    describe('server is available and returns results', function() {
      beforeEach(function() {
        $httpBackend.expect('POST', '/api/favorites/?content_type=42&limit=100').respond(200, []);
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatConfigForFavorites');
        serverService.addSearchResultsForFavorites({}, filterOptions);
        $httpBackend.flush();
        expect(serverService.reformatConfigForFavorites).toHaveBeenCalled();
      });
      it('calls reformatLayerConfigs with a geoserver URL', function() {
        spyOn(serverService, 'reformatConfigForFavorites');
        serverService.addSearchResultsForFavorites({}, filterOptions);
        $httpBackend.flush();
        expect(serverService.reformatConfigForFavorites).toHaveBeenCalledWith([], '/geoserver/wms');
      });
    });
    describe('search server is invalid', function() {
      beforeEach(function() {
        $httpBackend.expect('POST', '/api/favorites/?content_type=42&limit=100').respond(501, []);
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatConfigForFavorites');
        serverService.addSearchResultsForFavorites({}, filterOptions);
        $httpBackend.flush();
        expect(serverService.reformatConfigForFavorites).not.toHaveBeenCalled();
      });
    });
    describe('filter for title', function() {
      it('returns the url with title__contains', function() {
        $httpBackend.expect('POST', '/api/favorites/?content_type=42&limit=100&title__contains=Dijkstra').respond(200, []);
        spyOn(serverService, 'reformatConfigForFavorites');
        var filterOptions = {
          owner: null,
          text: 'Dijkstra',
          from: null,
          size: null
        };
        serverService.addSearchResultsForFavorites({}, filterOptions);
        $httpBackend.flush();
        expect(serverService.reformatConfigForFavorites).toHaveBeenCalled();
      });
    });
  });
  describe('#addSearchResultsForHyper', function() {
    describe('no server', function() {
      it('returns an empty array', function() {
        expect(serverService.addSearchResultsForHyper('', filterOptions)).toEqual(false);
      });
    });
    describe('catalogKey is not a number', function() {
      it('returns an empty array', function() {
        expect(serverService.addSearchResultsForHyper({}, filterOptions, NaN)).toEqual(false);
      });
    });
    describe('server is available and returns results', function() {
      beforeEach(function() {
        $httpBackend.expect('POST', 'http://geoshape.geointservices.io/search/hypermap/_search?').respond(200, []);
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerHyperConfigs');
        serverService.addSearchResultsForHyper({}, filterOptions, 0);
        $httpBackend.flush();
        expect(serverService.reformatLayerHyperConfigs).toHaveBeenCalled();
      });
      it('calls reformatLayerConfigs with a geoserver URL', function() {
        spyOn(serverService, 'reformatLayerHyperConfigs');
        serverService.addSearchResultsForHyper({}, filterOptions, 0);
        $httpBackend.flush();
        expect(serverService.reformatLayerHyperConfigs).toHaveBeenCalledWith([], 'http://geoshape.geointservices.io/geoserver/wms');
      });
    });
  });
});
