var SERVER_SERVICE_USE_PORT = false;
var SERVER_SERVICE_USE_PROXY = true;

(function() {
  var module = angular.module('loom_server_service', []);

  // Private Variables
  var servers = [];

  var rootScope_ = null;
  var service_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var http_ = null;
  var location_ = null;
  var configService_ = null;
  var q_ = null;
  var serverCount = 0;

  module.provider('serverService', function() {
    this.$get = function($rootScope, $http, $q, $location, $translate, dialogService, configService) {
      service_ = this;
      rootScope_ = $rootScope;
      dialogService_ = dialogService;
      translate_ = $translate;
      http_ = $http;
      location_ = $location;
      configService_ = configService;
      configService_.serverList = servers;
      q_ = $q;

      return this;
    };

    this.getServers = function() {
      return servers;
    };

    this.getServerById = function(id) {
      var server = null;

      if (!goog.isDefAndNotNull(id)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server id.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].id === id) {
          server = servers[index];
          break;
        }
      }

      //console.log('----[ returning server id: ', id, ', server: ', server);
      return server;
    };

    this.getServerIndex = function(id) {

      if (!goog.isDefAndNotNull(id)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server id.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].id === id) {
          return index;
        }
      }

      return -1;
    };

    this.getServerByPtype = function(ptype) {
      var server = null;

      if (!goog.isDefAndNotNull(ptype)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server ptype.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].ptype === ptype) {
          server = servers[index];
          break;
        }
      }

      //console.log('----[ returning server ptype: ', ptype, ', server: ', server);
      return server;
    };

    this.getServerByName = function(name) {
      var server = null;

      if (!goog.isDefAndNotNull(name)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server name.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].name.toLocaleLowerCase() === name.toLowerCase()) {
          server = servers[index];
          break;
        }
      }

      //console.log('----[ returning server with name: ', name, ', server: ', server);
      return server;
    };

    this.getServerLocalGeoserver = function() {
      var server = null;
      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].isLocal === true && servers[index].isVirtualService !== true) {
          server = servers[index];
          break;
        }
      }
      return server;
    };

    this.isUrlAVirtualService = function(url) {

      if (!goog.isDefAndNotNull(url)) {
        return false;
      }

      var urlSections = url.split('/');

      var counter = 0;
      var lastNotEmptyToken = null;
      for (var i = 0; i < urlSections.length; i++) {
        if (urlSections[i].length > 0) {
          counter++;
          lastNotEmptyToken = urlSections[i];
        }
      }

      return counter > 4 && lastNotEmptyToken.toLowerCase() === 'wms';
    };

    this.replaceVirtualServiceUrl = function(serverInfo) {
      if (!goog.isDefAndNotNull(serverInfo.url)) {
        return;
      }

      if (service_.isUrlAVirtualService(serverInfo.url) === true) {
        var urlSections = serverInfo.url.split('/');
        var newUrl = urlSections[0] + '//' + urlSections[2] + '/' + urlSections[3] + '/' + urlSections[6];
        console.log('---- changing layer-specific server to generic. old: ', serverInfo.url, ', new: ', newUrl);
        serverInfo.isVirtualService = true;
        serverInfo.virtualServiceUrl = serverInfo.url;
        serverInfo.url = newUrl;
      } else {
        serverInfo.isVirtualService = false;
      }
    };

    this.changeCredentials = function(server) {
      var deferredResponse = q_.defer();
      var doWork = function() {
        service_.populateLayersConfig(server, true)
            .then(function(response) {
              deferredResponse.resolve(server);
            }, function(reject) {
              deferredResponse.reject(server, reject);
            });
      };

      if (goog.isDefAndNotNull(server.url)) {
        if (server.url.indexOf(location_.host()) === -1) {
          dialogService_.promptCredentials(server.url, true, null, server.config.alwaysAnonymous).then(
              function(credentials) {
                server.username = credentials.username;
                server.authentication = $.base64.encode(credentials.username + ':' + credentials.password);
                server.config.alwaysAnonymous = false;

                // remove the 'wms endpoint'
                var serverBaseUrl = urlRemoveLastRoute(server.url);
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
                if (goog.isDefAndNotNull(reject) && reject.anonymous) {
                  server.username = translate_.instant('anonymous');
                  server.config.alwaysAnonymous = reject.alwaysAnonymous;
                  server.authentication = undefined;
                  doWork();
                }
              });
        } else {
          server.username = configService_.username;
          server.isLocal = true;
          doWork();
        }
      } else {
        doWork();
      }
      return deferredResponse.promise;
    };

    this.addServer = function(serverInfo, loaded) {
      var deferredResponse = q_.defer();

      // save the config object on the server object so that when we save the server, we only pass the config as opposed
      // to anything else that the app ads to the server objects.
      var server = {
        id: null,
        ptype: 'gxp_olsource',
        config: serverInfo,
        populatingLayersConfig: false,
        isVirtualService: false, //Used to filter getCapabilities requests to specific resources

        // Servers that have too many layers will cause an issue when a getCapabilities request is made when the map
        // is initially created.  This attribute will prevent MapLoom from running logic (ie a getCapabilties request)
        // until the user specifically tells MapLoom to make the request.  The user tells MapLoom to run the logic
        // from the 'Add Layers' dialog.
        lazy: false
      };

      goog.object.extend(server, serverInfo, {});

      if (goog.isDefAndNotNull(loaded)) {
        loaded = false;
      }

      if (server.ptype === 'gxp_olsource') {
        deferredResponse.resolve();
        return deferredResponse.promise;
      }

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
                  var serverBaseUrl = urlRemoveLastRoute(server.url);
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
      }

      return deferredResponse.promise;
    };

    this.removeServer = function(id) {
      var serverIndex = -1;
      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].id === id) {
          serverIndex = index;
          break;
        }
      }
      if (serverIndex > -1) {
        var server = servers.splice(serverIndex, 1)[0];
        rootScope_.$broadcast('server-removed', server);
      }
    };

    this.configDefaultServers = function() {
      var config = null;
      console.log('----- Configuring default servers.');

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_bingsource'))) {
        config = {ptype: 'gxp_bingsource', name: 'Bing', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_bingsource').defaultServer = true;
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_mapquestsource'))) {
        config = {ptype: 'gxp_mapquestsource', name: 'MapQuest', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_mapquestsource').defaultServer = true;
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_mapboxsource'))) {
        config = {ptype: 'gxp_mapboxsource', name: 'MapBox', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_mapboxsource').defaultServer = true;
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_osmsource'))) {
        config = {ptype: 'gxp_osmsource', name: 'OpenStreetMap', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_osmsource').defaultServer = true;
      }
      if (goog.isDefAndNotNull(service_.getServerLocalGeoserver())) {
        service_.getServerLocalGeoserver().defaultServer = true;
      }
    };

    this.getLayersConfig = function(serverId) {
      var server = service_.getServerById(serverId);
      if (goog.isDefAndNotNull(server)) {
        return server.layersConfig;
      }
    };

    this.getLayerConfig = function(serverId, layerName) {
      var layersConfig = service_.getLayersConfig(serverId);
      var layerConfig = null;

      for (var index = 0; index < layersConfig.length; index += 1) {
        if (layersConfig[index].Name === layerName || (typeof layerName.split != 'undefined' &&
            layersConfig[index].Name === layerName.split(':')[1])) {
          layerConfig = layersConfig[index];

          if (goog.isDefAndNotNull(layerConfig.CRS)) {
            for (var code in layerConfig.CRS) {
              if (layerConfig.CRS[code] !== 'CRS:84') {
                layerConfig.CRS = layerConfig.CRS[code];
                break;
              }
            }
          }
          console.log('getting layer config, crs', layerConfig.CRS);
          break;
        }
      }

      console.log('---- ServerService.getLayerConfig: ', layerConfig);
      return layerConfig;
    };

    this.populateLayersConfig = function(server, force) {
      var deferredResponse = q_.defer();
      console.log('---- ServerService.populateLayersConfig. server', server);

      if (!goog.isDefAndNotNull(server)) {
        //TODO: make sure it is okay to reject and then return the promise
        deferredResponse.reject();
        return deferredResponse.promise;
      }

      if (!goog.isDefAndNotNull(server.layersConfig) ||
          (goog.isDefAndNotNull(force) && force)) {

        // clear out layers config
        server.layersConfig = [];

        if (server.ptype === 'gxp_bingsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'Bing';
          }
          server.layersConfig = [
            {Title: 'BingRoad', Name: 'Road', sourceParams: {imagerySet: 'Road'}},
            {Title: 'BingAerial', Name: 'Aerial', sourceParams: {imagerySet: 'Aerial'}},
            {Title: 'BingAerialWithLabels', Name: 'AerialWithLabels',
              sourceParams: {imagerySet: 'AerialWithLabels'}},
            {Title: 'BingCollinsBart', Name: 'CollinsBart', sourceParams: {imagerySet: 'collinsBart'}},
            {Title: 'BingSurvey', Name: 'Survey', sourceParams: {imagerySet: 'ordnanceSurvey'}}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_mapquestsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'MapQuest';
          }
          server.layersConfig = [
            {Title: 'MapQuestSat', Name: 'sat', sourceParams: {layer: 'sat'}},
            {Title: 'MapQuestHybrid', Name: 'hyb', sourceParams: {layer: 'hyb'}},
            {Title: 'MapQuestOSM', Name: 'osm', sourceParams: {layer: 'osm'}}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_osmsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'OpenStreetMap';
          }
          server.layersConfig = [
            {Title: 'OpenStreetMap', Name: 'mapnik'}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_mapboxsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'MapBox';
          }
          server.layersConfig = [
            {Title: 'MapBoxBlueMarbleTopoBathyJan', Name: 'blue-marble-topo-bathy-jan',
              sourceParams: {layer: 'blue-marble-topo-bathy-jan'}},
            {Title: 'MapBoxBlueMarbleTopoBathyJul', Name: 'blue-marble-topo-bathy-jul',
              sourceParams: {layer: 'blue-marble-topo-bathy-jul'}},
            {Title: 'MapBoxBlueMarbleTopoJan', Name: 'blue-marble-topo-jan',
              sourceParams: {layer: 'blue-marble-topo-jan'}},
            {Title: 'MapBoxBlueMarbleTopoJul', Name: 'blue-marble-topo-jul',
              sourceParams: {layer: 'blue-marble-topo-jul'}},
            {Title: 'MapBoxControlRoom', Name: 'control-room',
              sourceParams: {layer: 'control-room'}},
            {Title: 'MapBoxGeographyClass', Name: 'geography-class',
              sourceParams: {layer: 'geography-class'}},
            {Title: 'MapBoxNaturalEarthHypso', Name: 'natural-earth-hypso',
              sourceParams: {layer: 'natural-earth-hypso'}},
            {Title: 'MapBoxNaturalEarthHypsoBathy', Name: 'natural-earth-hypso-bathy',
              sourceParams: {layer: 'natural-earth-hypso-bathy'}},
            {Title: 'MapBoxNaturalEarth1', Name: 'natural-earth-1',
              sourceParams: {layer: 'natural-earth-1'}},
            {Title: 'MapBoxNaturalEarth2', Name: 'natural-earth-2',
              sourceParams: {layer: 'natural-earth-2'}},
            {Title: 'MapBoxWorldDark', Name: 'world-dark',
              sourceParams: {layer: 'world-dark'}},
            {Title: 'MapBoxWorldLight', Name: 'world-light',
              sourceParams: {layer: 'world-light'}},
            {Title: 'MapBoxWorldPrint', Name: 'world-print',
              sourceParams: {layer: 'world-print'}}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_tilejsonsource') {

          //first we need to add/connect to the server. we need to init some placeholder
          //layersConfig data just so to satisfy some logic in the doWork() function above.
          //The logic itself should be re-analyzed in the future.
          server.defaultServer = true;
          server.layersConfig = [
            {Title: 'Loading...', Name: 'null'}
          ];

          //NOTE: server.sourceParams is only undefined when the server is being added via the add server dialog. This is because
          //the user will have entered the 'get' params as part of the URL in one long string. In this case the params are parsed
          //out following the next comment block.
          var json_parms = {
            url: goog.isDefAndNotNull(server.sourceParams) ? server.url + '?' + server.sourceParams : server.url,
            crossOrigin: true
          };

          //change the url on both server and server.config to truncate the request parameters (we'll store the params in sourceParams below),
          //urls are only allowed 200 chars max in the database when serialization occurs. sourceParams on the other hand
          //is serialized as a straight-up text object.
          if (!goog.isDefAndNotNull(server.sourceParams)) {
            var splitURL = server.url.split('?');
            var urlSansParameters = splitURL[0];
            var urlParams = '';
            if (splitURL.length > 1) {
              urlParams = splitURL[1];
            }
            server.config.url = urlSansParameters;
            server.config.sourceParams = urlParams;
            server.url = urlSansParameters;
          }


          //in order to populate the layer list, (once connected to the server) we need override the TileJSON class from openlayers.
          //the payload that comes back into code, the JSON, is stripped of the name attribute. hence, we overload the handler
          //to intercept the full JSON and keep track of the name for the layer list.
          var TileJSONClass = ol.source.TileJSON;

          //store the original handler in a dynamically added member function 'responseHandler' so
          //we can call it later on since we are altering the prototype (original) in the line after
          if (!goog.isDefAndNotNull(TileJSONClass.prototype.responseHandler)) {
            TileJSONClass.prototype.responseHandler = ol.source.TileJSON.prototype.handleTileJSONResponse;
          }

          TileJSONClass.prototype.handleTileJSONResponse = function(tileJSON) {
            server.layersConfig[0].Title = tileJSON.name;
            server.layersConfig[0].Name = tileJSON.id;
            server.layersConfig[0].sourceParams = {urlArgs: urlParams, layer: tileJSON.id};
            server.layersConfig[0].bounds = tileJSON.bounds;
            this.responseHandler(tileJSON);
            deferredResponse.resolve(server);
          };

          if (!goog.isDefAndNotNull(TileJSONClass.prototype.errorResponseHandler)) {
            //do the same pattern as above but for the error handling function
            TileJSONClass.prototype.errorResponseHandler = ol.source.TileJSON.prototype.handleTileJSONError;
          }
          TileJSONClass.prototype.handleTileJSONError = function() {
            this.errorResponseHandler();
            deferredResponse.reject(server);
          };

          //using bind so 'this' in the handler above points to the TileJSON class object and not something else
          TileJSONClass.prototype.handleTileJSONResponse.bind(TileJSONClass);
          TileJSONClass.prototype.handleTileJSONError.bind(TileJSONClass);

          //HACK: We need to know if there is an xhr error (Currently TileJSON provides no feedback if there is).
          //This is slightly unsafe if another xhr goes out and returns during this one
          //because the callback will be removed before it gets a chance to execute here.
          addXMLRequestCallback(function(xhr) {
            xhr.onerror = function() {
              deferredResponse.reject(server);
            };
            XMLHttpRequest.callbacks.length = 0;
          });

          //this internally fires off the 'get' call
          var jsontile_source = new TileJSONClass(json_parms);

          //stash the returned source in the layersConfig so MapService.js can instantiate the tile later on
          server.layersConfig[0].TileJSONSource = jsontile_source;

        } else if (server.ptype === 'gxp_wmscsource' ||
            server.ptype === 'gxp_tmssource') { // currently, if it is a tms endpoint, assume it has wmsgetcapabilities
          console.log('---- ServerService.Sending GetCapabilities.server: ', server);
          if (!goog.isDefAndNotNull(server.url)) {
            dialogService_.error(translate_.instant('error'), translate_.instant('server_url_not_specified'));
            deferredResponse.reject(server);
          } else {
            // prevent getCapabilities request until ran by the user.
            if (server.lazy !== true || force === true || server.mapLayerRequiresServer === true) {
              var parser = new ol.format.WMSCapabilities();
              var url = server.url;

              // If this is a virtual service, use the virtual service url for getCapabilties
              if (server.isVirtualService === true) {
                url = server.virtualServiceUrl;
              }

              var iqm = url.indexOf('?');
              var url_getcaps = url + (iqm >= 0 ? (iqm - 1 == url.length ? '' : '&') : '?') + 'SERVICE=WMS&REQUEST=GetCapabilities';

              server.populatingLayersConfig = true;
              var config = {};
              config.headers = {};
              if (goog.isDefAndNotNull(server.authentication)) {
                config.headers['Authorization'] = 'Basic ' + server.authentication;
              } else {
                config.headers['Authorization'] = '';
              }
              // server hasn't been added yet, so specify the auth headers here
              http_.get(url_getcaps, config).then(function(xhr) {
                if (xhr.status === 200) {
                  var response = parser.read(xhr.data);
                  if (goog.isDefAndNotNull(response.Capability) &&
                      goog.isDefAndNotNull(response.Capability.Layer)) {
                    server.layersConfig = response.Capability.Layer.Layer;
                    console.log('---- populateLayersConfig.populateLayersConfig server', server);
                    rootScope_.$broadcast('layers-loaded', server.id);
                    deferredResponse.resolve(server);
                  } else {
                    deferredResponse.resolve(server);
                  }
                  server.populatingLayersConfig = false;
                } else {
                  deferredResponse.resolve(server);
                  server.populatingLayersConfig = false;
                }
              }, function(xhr) {
                deferredResponse.resolve(server);
                server.populatingLayersConfig = false;
              });
            } else {
              deferredResponse.resolve(server);
              server.populatingLayersConfig = false;
            }
          }
        } else {
          deferredResponse.reject();
        }
      } else {
        deferredResponse.reject();
      }

      return deferredResponse.promise;
    };

  });
}());

function addXMLRequestCallback(callback) {
  var oldSend, i;
  if (XMLHttpRequest.callbacks) {
    // we've already overridden send() so just add the callback
    XMLHttpRequest.callbacks.push(callback);
  } else {
    // create a callback queue
    XMLHttpRequest.callbacks = [callback];
    // store the native send()
    oldSend = XMLHttpRequest.prototype.send;
    // override the native send()
    XMLHttpRequest.prototype.send = function() {
      // process the callback queue
      // the xhr instance is passed into each callback but seems pretty useless
      // you can't tell what its destination is or call abort() without an error
      // so only really good for logging that a request has happened
      // I could be wrong, I hope so...
      // EDIT: I suppose you could override the onreadystatechange handler though
      for (i = 0; i < XMLHttpRequest.callbacks.length; i++) {
        XMLHttpRequest.callbacks[i](this);
      }
      // call the native send()
      oldSend.apply(this, arguments);
    };
  }
}
