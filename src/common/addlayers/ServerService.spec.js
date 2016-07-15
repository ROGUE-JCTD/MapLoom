console.log = function(sdf) {}; ///turn off console logging when the test runs
describe('ServerService', function() {
  var mapService;
  var serverService;
  var configService;
  var q;
  var defer;
  var rootScope;

  //include the whole application to initialize all services and modules
  beforeEach(module('MapLoom'));

  beforeEach(inject(function (_mapService_, _serverService_,
                              _configService_, $q, $rootScope) {
    mapService = _mapService_;
    serverService = _serverService_;
    configService = _configService_;
    q = $q;
    rootScope = $rootScope;
  }));

  describe('addServer', function() {
    beforeEach(function() {
      defer = q.defer();
      spyOn(serverService, 'populateLayersConfig').and.returnValue(defer.promise);
    });
    it('should add a server', function() {
      var config = {ptype: 'gxp_bingsource', name: 'Bing', defaultServer: true};
      var origNumServers = serverService.getServers().length;
      serverService.addServer(config);
      defer.resolve();
      rootScope.$apply();

      expect(serverService.populateLayersConfig).toHaveBeenCalled();
      expect(origNumServers).not.toBe(serverService.getServers().length);
    });
  });

  describe('configDefaultServers', function() {
    beforeEach(function() {
      defer = q.defer();

      //empty out the server array before calling the function to ensure it worked
      serverService.getServers().length = 0;
      serverService.configDefaultServers();
      defer.resolve();
      rootScope.$apply();
    });

    it('should create the default servers and store them in an array', function() {
      expect(serverService.getServers().length).not.toBe(0);
    });

    it('should mark the servers as \'default\'', function() {
      for(var i = 0; i < serverService.getServers().length; i++)
      {
        expect(serverService.getServers()[i].defaultServer).toBe(true);
      }
    });
  });

  describe('populateLayersConfig', function() {
    it('should return with layers that are configured if the layersConfig is not defined on the server object,' +
      ' and the force parameter is set to false', function() {
      defer = q.defer();

      //use an already created server to try initializing the layers for the given server
      serverService.getServers()[0].layersConfig = null;
      serverService.populateLayersConfig(serverService.getServers()[0], false);
      defer.resolve();
      rootScope.$apply();
      expect(serverService.getServers()[0].layersConfig).not.toBe(null);
      expect(serverService.getServers()[0].layersConfig).toBeDefined();
      expect(serverService.getServers()[0].layersConfig.length).toBeGreaterThan(0);
    });

    it('should not alter the layerConfig object if it exists already and \'force\' is set to false', function() {
      defer = q.defer();
      expect(serverService.getServers()[0].layersConfig).not.toBe(null);
      expect(serverService.getServers()[0].layersConfig).toBeDefined();
      serverService.getServers()[0].layersConfig[0].Name = 'test123';
      serverService.populateLayersConfig(serverService.getServers()[0], false);
      defer.resolve();
      rootScope.$apply();
      expect(serverService.getServers()[0].layersConfig[0].Name).toBe('test123');
    });

    it('should alter the layerConfig object if it exists already and \'force\' is set to true', function() {
      defer = q.defer();
      expect(serverService.getServers()[0].layersConfig).not.toBe(null);
      expect(serverService.getServers()[0].layersConfig).toBeDefined();
      serverService.getServers()[0].layersConfig[0].Name = 'test123';
      serverService.populateLayersConfig(serverService.getServers()[0], true);
      defer.resolve();
      rootScope.$apply();
      expect(serverService.getServers()[0].layersConfig[0].Name).not.toBe('test123');
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

    it('should return null if it cannot find a matching ID', function() {
      expect(serverService.getServerById(-1)).toBe(null);
    });
  });

  describe('getServerIndex', function() {
    it('should return an index that matches the location of the server in the array for a given ID', function() {
      expect(serverService.getServerIndex(serverService.getServers()[0].id)).toBe(0);
      expect(serverService.getServerIndex(serverService.getServers()[2].id)).toBe(2);
      expect(serverService.getServerIndex(-1)).toBe(-1);
    });
  });
});
