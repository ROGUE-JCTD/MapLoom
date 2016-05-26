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

    this.catalogList = [
      {name: 'hypersearch catalog 1', url: 'http://geoshape.geointservices.io/search/hypermap/'},
      {name: 'hypersearch catalog 2', url: 'http://geoshape.geointservices.io/search/hypermap/'}
    ];

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
        if ((servers[index].isLocal === true && servers[index].isVirtualService !== true) || servers[index].isPrimaryGeoserver === true) {
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

    this.getLayersConfigByName = function(server_name) {
      var server = service_.getServerByName(server_name);
      if (goog.isDefAndNotNull(server)) {
        return server.layersConfig;
      }
    };

    this.getLayersConfig = function(serverId) {
      var server = service_.getServerById(serverId);
      if (goog.isDefAndNotNull(server)) {
        return server.layersConfig;
      }
    };

    this.getFullLayerConfig = function(serverId, layerName) {
      //Issue WMS request to get full layer config for mapService
      var result = q_.defer();
      var layerConfig = null;
      var server = service_.getServerLocalGeoserver();
      if (server.id != serverId) {
        result.resolve(service_.getLayerConfig(serverId, layerName));
        return result.promise;
      }
      var parser = new ol.format.WMSCapabilities();
      var url = server.url;
      var namespace = layerName.split(':')[0];
      var name = layerName.split(':')[1];
      url = url.substring(0, url.lastIndexOf('/')) + '/' + namespace;
      url += '/' + name + '/wms?request=GetCapabilities';
      console.log('WMS url: ', url);
      server.populatingLayersConfig = true;
      var config = {};
      config.headers = {};
      if (goog.isDefAndNotNull(server.authentication)) {
        config.headers['Authorization'] = 'Basic ' + server.authentication;
      } else {
        config.headers['Authorization'] = '';
      }
      http_.get(url, config).then(function(xhr) {
        if (xhr.status === 200) {
          var response = parser.read(xhr.data);
          if (goog.isDefAndNotNull(response.Capability) && goog.isDefAndNotNull(response.Capability.Layer)) {
            layerConfig = response.Capability.Layer.Layer[0];
            result.resolve(layerConfig);
          }
        }
      });

      return result.promise;
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
                layerConfig.CRS = [layerConfig.CRS[code]];
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

    var layerName = function(detailUrl) {
      if (!detailUrl) { return ''; }
      return detailUrl.split('/').pop();
    };

    var thumbnail = function(thumbnailUrl, layerName, serverUrl) {
      if (thumbnailUrl && thumbnailUrl.indexOf('missing_thumb') !== -1) {
        return serverUrl + '/reflect?format=application/openlayers&layers=' + layerName + '&width=200';
      }
      return thumbnailUrl;
    };

    var domain = function(layerInfo) {
      if (layerInfo.hasOwnProperty('DomainName')) {
        return layerInfo.DomainName;
      }
      return '';
    };
    var author = function(layerInfo) {
      if (layerInfo.owner__first_name) {
        return layerInfo.owner__first_name + ' ' + layerInfo.owner__last_name;
      }
      if (layerInfo.owner__username) {
        return layerInfo.owner__username;
      }
      if (layerInfo.LayerUsername) {
        return layerInfo.LayerUsername;
      }
      return 'No owner name available';
    };

    var createSearchLayerObject = function(layerInfo, serverUrl) {
      return {
        add: true,
        Abstract: layerInfo.abstract,
        Name: layerInfo.typename,
        Title: layerInfo.title,
        CRS: layerInfo.srid,
        thumbnail_url: thumbnail(layerInfo.thumbnail_url, layerName(layerInfo.detail_url), serverUrl),
        author: author(layerInfo),
        detail_url: layerInfo.detail_url
      };
    };

    var createExtentFromHyper = function(layerInfo) {
      return [layerInfo.MinX, layerInfo.MinY, layerInfo.MaxX, layerInfo.MaxY];
    };

    var createHyperSearchLayerObject = function(layerInfo, serverUrl) {
      return {
        add: true,
        Abstract: layerInfo.Abstract,
        Name: layerInfo.LayerName,
        Title: layerInfo.LayerTitle,
        LayerDate: layerInfo.LayerDate,
        LayerCategory: layerInfo.LayerCategory,
        CRS: ['EPSG:4326'],
        detail_url: 'http://52.38.116.143/layer/' + layerInfo.LayerId,
        thumbnail_url: layerInfo.ThumbnailURL ? ('http://52.38.116.143' + layerInfo.ThumbnailURL) : null,
        author: author(layerInfo),
        domain: domain(layerInfo),
        type: 'mapproxy_tms',
        extent: createExtentFromHyper(layerInfo)
      };
    };

    var createSearchLayerObjects = function(layerObjects, serverUrl) {
      var finalConfigs = [];
      //TODO: Update with handling multiple projections per layer if needed.
      for (var iLayer = 0; iLayer < layerObjects.length; iLayer += 1) {
        var layerInfo = layerObjects[iLayer];
        var configTemplate = createSearchLayerObject(layerInfo, serverUrl);

        finalConfigs.push(configTemplate);
      }

      return finalConfigs;
    };

    var createHyperSearchLayerObjects = function(layerObjects, serverUrl) {
      var finalConfigs = [];
      //TODO: Update with handling multiple projections per layer if needed.
      for (var iLayer = 0; iLayer < layerObjects.length; iLayer += 1) {
        var layerInfo = layerObjects[iLayer];
        var configTemplate = createHyperSearchLayerObject(layerInfo._source, serverUrl);

        finalConfigs.push(configTemplate);
      }

      return finalConfigs;
    };

    var createAuthorizationConfigForServer = function(server) {
      var config = {};
      config.headers = {};
      if (goog.isDefAndNotNull(server.authentication)) {
        config.headers['Authorization'] = 'Basic ' + server.authentication;
      } else {
        config.headers['Authorization'] = '';
      }
      return config;
    };

    var serverGeoserversearchUrl = function(searchUrl) {
      pathArray = searchUrl.split('/');
      protocol = pathArray[0];
      host = pathArray[2];
      if (protocol.indexOf(':') !== -1) {
        return protocol + '//' + host + '/geoserver/wms';
      }
      return '/geoserver/wms';
    };

    var addSearchResults = function(searchUrl, body, server, layerConfigCallback) {
      body = body || {};
      var layers_loaded = false;
      server.layersConfig = [];
      server.populatingLayersConfig = true;
      var config = createAuthorizationConfigForServer(server);
      console.log('---searchUrl: ', searchUrl);

      http_.post(searchUrl, body, config).then(function(xhr) {
        if (xhr.status === 200) {
          server.layersConfig = layerConfigCallback(xhr.data, serverGeoserversearchUrl(searchUrl));
          console.log('---- populateLayersConfig.populateLayersConfig server', server);
          rootScope_.$broadcast('layers-loaded', server.id);
          layers_loaded = true;
          server.populatingLayersConfig = false;
        } else {
          layers_loaded = false;
          server.populatingLayersConfig = false;
        }
      }, function(xhr) {
        layers_loaded = false;
        server.populatingLayersConfig = false;
      });
      return layers_loaded;
    };

    this.reformatLayerHyperConfigs = function(elasticResponse, serverUrl) {
      return createHyperSearchLayerObjects(elasticResponse.hits.hits, serverUrl);
    };

    this.reformatLayerConfigs = function(elasticResponse, serverUrl) {
      return createSearchLayerObjects(elasticResponse.objects, serverUrl);
    };

    this.reformatConfigForFavorites = function(response, serverUrl) {
      var formattedResponse = response.objects.map(function(obj) { return obj.content_object; });
      return createSearchLayerObjects(formattedResponse, serverUrl);
    };

    this.applyESFilter = function(url, filter_options) {
      if (filter_options.owner !== null) {
        url = url + '&owner__username__in=' + configService_.username;
      }
      if (filter_options.text !== null) {
        url = url + '&q=' + filter_options.text;
      }
      if (filter_options.size !== null) {
        url = url + '&size=' + filter_options.size;
      }
      if (filter_options.from !== null) {
        url = url + '&from=' + filter_options.from;
      }
      return url;
    };
    this.applyBodyFilter = function(filter_options) {
      var body = {};
      if (goog.isDefAndNotNull(filter_options.minYear) && goog.isDefAndNotNull(filter_options.maxYear)) {
        body = {
          'query': {
            'filtered': {
              'filter': {
                'range' : {
                  'LayerDate' : {
                    'gte': filter_options.minYear + '-01-01T00:00:00',
                    'lte': filter_options.maxYear + '-01-01T00:00:00'
                  }
                }
              }
            }
          }
        };
      }
      return body;
    };

    var applyFavoritesFilter = function(url, filterOptions) {
      if (filterOptions.text !== null) {
        url += '&title__contains=' + filterOptions.text;
      }
      return url;
    };

    this.validateCatalogKey = function(catalogKey) {
      catalogKey = Number(catalogKey);
      if (!isNaN(catalogKey) && service_.catalogList.length >= catalogKey + 1) {
        return catalogKey;
      }else {
        return false;
      }
    };

    this.getNumberOfDocsForHyper = function(server, catalogKey, layerDocsCallback) {
      catalogKey = service_.validateCatalogKey(catalogKey);
      if (catalogKey === false) {
        return layerDocsCallback(false);
      }
      var searchUrl = service_.catalogList[catalogKey].url + '_stats/docs?';
      var config = createAuthorizationConfigForServer(server);
      http_.get(searchUrl, config).then(function(xhr) {
        if (xhr.status === 200) {
          return layerDocsCallback(xhr.data);
        } else {
          return layerDocsCallback(false);
        }
      }, function(xhr) {
        return layerDocsCallback(false);
      });
    };

    this.populateLayersConfigElastic = function(server, filterOptions) {
      //var searchUrl = 'http://beta.mapstory.org/api/layers/search/?is_published=true&limit=100';
      var searchUrl = '/api/layers/search/?is_published=true&limit=100';
      if (filterOptions !== null) {
        searchUrl = service_.applyESFilter(searchUrl, filterOptions);
      }
      return addSearchResults(searchUrl, {}, server, service_.reformatLayerConfigs);
    };

    this.addSearchResultsForHyper = function(server, filterOptions, catalogKey) {
      var searchUrl;
      var bodySearch = {};
      catalogKey = service_.validateCatalogKey(catalogKey);
      if (catalogKey === false) {
        return false;
      }
      searchUrl = service_.catalogList[catalogKey].url + '_search?';
      if (filterOptions !== null) {
        searchUrl = service_.applyESFilter(searchUrl, filterOptions);
        bodySearch = service_.applyBodyFilter(filterOptions);
        console.log(bodySearch);
      }
      return addSearchResults(searchUrl, bodySearch, server, service_.reformatLayerHyperConfigs);
    };

    this.addSearchResultsForFavorites = function(server, filterOptions) {
      var searchUrl = '/api/favorites/?content_type=42&limit=100';
      if (filterOptions !== null) {
        searchUrl = applyFavoritesFilter(searchUrl, filterOptions);
      }
      return addSearchResults(searchUrl, {}, server, service_.reformatConfigForFavorites);
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
        } else if (server.ptype === 'gxp_wmscsource' ||
            server.ptype === 'gxp_tmssource') { // currently, if it is a tms endpoint, assume it has wmsgetcapabilities
          console.log('---- ServerService.Sending Elastic Search: ', server);
          if (!goog.isDefAndNotNull(server.url)) {
            dialogService_.error(translate_.instant('error'), translate_.instant('server_url_not_specified'));
            deferredResponse.reject(server);
          } else {
            service_.populateLayersConfigElastic(server, null);
            deferredResponse.resolve(server);

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
