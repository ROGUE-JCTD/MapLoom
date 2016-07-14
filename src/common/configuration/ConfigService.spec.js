describe('ConfigService', function() {
  var serverService;
  var configService;
  var q;
  var defer;
  var rootScope;
  var httpBackend;
  var dialogService;
  var window;

  //include the whole application to initialize all services and modules
  beforeEach(module('MapLoom'));

  beforeEach(inject(function(_serverService_, _configService_,_dialogService_, $httpBackend, $q, $rootScope, $window) {
    serverService = _serverService_;
    configService = _configService_;
    dialogService = _dialogService_;
    httpBackend = $httpBackend;
    q = $q;
    rootScope = $rootScope;
    window = $window;
  }));

  describe('service initialization', function() {
    it('should init the configuration object', function() {
      expect(configService.configuration).toBeDefined();
      expect(configService.configuration).not.toBe(null);
      expect(configService.username).toBe(configService.configuration.username);
    });
  });

  describe('getServerByUrl', function() {
    it('should return null if a server with a matching url cannot be found', function() {
      //the default servers do not have a url object defined, so even if we use a valid url
      //we should get no server
      var server = configService.getServerByURL(configService.configuration.sources[0].url);
      expect(server).toBe(null);
    });
    it('should return a server based on a given url if one is found', function(){
      //we will just use a url from a known/already created server and make sure the objects match
      configService.serverList[0].url = configService.configuration.sources[0].url;
      var server = configService.getServerByURL(configService.configuration.sources[0].url);
      expect(server).toBe(configService.serverList[0]);
    });
  });
});
