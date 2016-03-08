describe('addLayers/ServerService', function() {
  var serverService, $httpBackend;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_addlayers'));

  beforeEach(inject(function(_serverService_, _$httpBackend_) {
    serverService = _serverService_;
    $httpBackend = _$httpBackend_;
  }));

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
  describe('#populateLayersConfigElastic', function() {
    describe('no server', function() {
      it('returns an empty array', function() {
        expect(serverService.populateLayersConfigElastic('', {})).toEqual(false);
      });
    });
    describe('server is available and returns results', function() {
      beforeEach(function() {
        $httpBackend
        .when('GET', '/api/layers/search/?is_published=true&limit=100&owner=anonymous&q=undefined')
        .respond(200, []);
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        layers_loaded = serverService.populateLayersConfigElastic({}, {});
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).toHaveBeenCalled();
      });
      it('calls reformatLayerConfigs with a geoserver URL', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        layers_loaded = serverService.populateLayersConfigElastic({}, {});
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).toHaveBeenCalledWith([], '/geoserver/wms');
      });
    });
    describe('search server is invalid', function() {
      beforeEach(function() {
        $httpBackend.resetExpectations();
        $httpBackend
            .when('GET', '/api/layers/search/?is_published=true&limit=100&owner=anonymous&q=undefined')
            .respond(501, '');
      });
      it('reformats the Layer configs based on the server data', function() {
        spyOn(serverService, 'reformatLayerConfigs');
        layers_loaded = serverService.populateLayersConfigElastic({}, {});
        $httpBackend.flush();
        expect(serverService.reformatLayerConfigs).not.toHaveBeenCalled();
      });
    });
  });
});
