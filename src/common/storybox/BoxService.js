var SERVER_SERVICE_USE_PORT = false;
var SERVER_SERVICE_USE_PROXY = true;

(function() {
  var module = angular.module('loom_box_service', []);

  // Private Variables
  var servers = [];

  var rootScope_ = null;
  //var location_ = null;
  var pulldownService_ = null;
  var configService_ = null;
  var q_ = null;
  var httpService_ = null;
  //var serverCount = 0;

  module.provider('boxService', function() {
    this.$get = function($rootScope, $http, $q, $location, $translate, pulldownService, dialogService, configService) {
      service_ = this;
      rootScope_ = $rootScope;
      dialogService_ = dialogService;
      translate_ = $translate;
      httpService_ = $http;
      location_ = $location;
      pulldownService_ = pulldownService;
      configService_ = configService;
      configService_.serverList = servers;
      q_ = $q;
      //$rootScope.$on('map-created', function(event, config) {
      console.log('----[ boxService, map created. initializing', config);
      if (goog.isDefAndNotNull(config.id)) {
        httpService_({
          url: '/maps/' + config.id + '/boxes',
          method: 'GET'
        }).then(function(result) {
          console.log(result);
          var geojson = result.data;
          geojson.features.map(function(f) {
            var props = f.properties;
            props.start_time *= 1000;
            props.end_time *= 1000;
            service_.addBox(props);
          });
        });
      }
      //});

      return this;
    };

    this.getBoxes = function() {
      return servers;
    };

    this.addBox = function(boxInfo, loaded) {
      var deferredResponse = q_.defer();

      //boxInfo.extent = MapService.getView().getProjection().getExtent();

      servers.push(boxInfo);
      // save the config object on the server object so that when we save the server, we only pass the config as opposed
      // to anything else that the app ads to the server objects.

      if (goog.isDefAndNotNull(loaded)) {
        loaded = false;
      }

      rootScope_.$broadcast('box-added', boxInfo);

      console.log('-- BoxService.addBox, added: ', boxInfo);
      pulldownService_.showStoryboxPanel();



      /*
      var doWork = function() {
        console.log('---- MapService.layerInfo. trying to add server: ', server);
        service_.populateLayersConfig(server)
            .then(function(response) {
              // set the id. it should always resolve to the length
              if (goog.isDefAndNotNull(server.layersConfig) && server.layersConfig.length === 0 && !loaded &&
                  server.lazy !== true) {
                dialogService_.warn(translate_.instant('add_server'), translate_.instant('server_connect_failed'),
                    [translate_.instant('yes_btn'), translate_.instant('no_btn')], false).then(function(button) {
                  switch (button) {
                    case 0:
                      server.id = serverCount++;
                      servers.push(server);
                      rootScope_.$broadcast('server-added', server.id);
                      deferredResponse.resolve(server);
                      break;
                    case 1:
                      deferredResponse.reject(server);
                      break;
                  }
                });
              } else {
                // If there are no layers on the server, layersConfig will be undefined.
                if (!goog.isDefAndNotNull(server.layersConfig)) {
                  server.layersConfig = [];
                }
                server.id = serverCount++;
                servers.push(server);
                rootScope_.$broadcast('server-added', server.id);
                deferredResponse.resolve(server);
              }
            }, function(reject) {
              deferredResponse.reject(reject);
            });
      };

      if (goog.isDefAndNotNull(server.url)) {
        if (server.url.indexOf(location_.host()) === -1) {
          if (server.config.alwaysAnonymous) {
            server.username = translate_.instant('anonymous');
            server.authentication = undefined;
            doWork();
          } else {
            dialogService_.promptCredentials(server.url, false, null).then(
                function(credentials) {
                  server.username = credentials.username;
                  server.authentication = $.base64.encode(credentials.username + ':' + credentials.password);
                  server.config.alwaysAnonymous = false;

                  // remove the 'wms endpoint'
                  var serverBaseUrl = removeUrlLastRoute(server.url);
                  var serverAuthenticationUrl = serverBaseUrl + '/rest/settings.json';
                  serverAuthenticationUrl = serverAuthenticationUrl.replace('http://', 'http://null:null@');
                  ignoreNextScriptError = true;
                  $.ajax({
                    url: serverAuthenticationUrl,
                    type: 'GET',
                    dataType: 'jsonp',
                    jsonp: 'callback',
                    error: function() {
                      ignoreNextScriptError = false;
                    },
                    complete: doWork
                  });
                }, function(reject) {
                  server.username = translate_.instant('anonymous');
                  server.authentication = undefined;
                  server.config.alwaysAnonymous = reject.alwaysAnonymous;
                  doWork();
                });
          }
        } else {
          server.username = configService_.username;
          server.isLocal = true;

          if (server.isVirtualService === true) {
            server.name = 'Virtual Service';
          } else {
            server.name = translate_.instant('local_geoserver');
          }

          doWork();
        }
      } else {
        doWork();
      }*/

      return deferredResponse.promise;
    };

  });
}());
