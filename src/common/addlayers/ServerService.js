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
  var q_ = null;

  module.provider('serverService', function() {
    this.$get = function($rootScope, $http, $q, $translate, dialogService) {
      service_ = this;
      rootScope_ = $rootScope;
      dialogService_ = dialogService;
      translate_ = $translate;
      http_ = $http;
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
      return service_.getServerByName('Local Geoserver');
    };

    this.addServer = function(serverInfo) {
      var deferredResponse = q_.defer();

      // save the config object on the server object so that when we save the server, we only pass the config as opposed
      // to anything else that the app ads to the server objects.
      var server = {id: null, ptype: 'gxp_olsource', config: serverInfo, populatingLayersConfig: false};

      goog.object.extend(server, serverInfo, {});

      console.log('---- MapService.layerInfo. trying to add server: ', server);
      service_.populateLayersConfig(server)
          .then(function(response) {
            // set the id. it should always resolve to the length
            server.id = servers.length;
            servers.push(server);
            rootScope_.$broadcast('server-added', server.id);
            deferredResponse.resolve(server);
          }, function(reject) {
            deferredResponse.reject(server, reject);
          });

      return deferredResponse.promise;
    };

    this.configDefaultServers = function() {
      var config = null;
      console.log('----- Configuring default servers.');

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_bingsource'))) {
        config = {ptype: 'gxp_bingsource', name: 'Bing'};
        service_.addServer(config);
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_mapquestsource'))) {
        config = {ptype: 'gxp_mapquestsource', name: 'MapQuest'};
        service_.addServer(config);
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_osmsource'))) {
        config = {ptype: 'gxp_osmsource', name: 'OpenStreetMap'};
        service_.addServer(config);
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
        if (layersConfig[index].Name === layerName) {
          layerConfig = layersConfig[index];
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
          server.layersConfig = [
            {Title: 'BingRoad', Name: 'BingRoad', sourceParams: {imagerySet: 'Road'}},
            {Title: 'BingAerial', Name: 'BingAerial', sourceParams: {imagerySet: 'Aerial'}},
            {Title: 'BingAerialWithLabels', Name: 'BingAerialWithLabels',
              sourceParams: {imagerySet: 'AerialWithLabels'}},
            {Title: 'BingCollinsBart', Name: 'BingCollinsBart', sourceParams: {imagerySet: 'collinsBart'}},
            {Title: 'BingSurvey', Name: 'BingSurvey', sourceParams: {imagerySet: 'ordnanceSurvey'}}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_mapquestsource') {
          server.layersConfig = [
            {Title: 'MapQuestSat', Name: 'MapQuestSat', sourceParams: {layer: 'sat'}},
            {Title: 'MapQuestHybrid', Name: 'MapQuestHybrid', sourceParams: {layer: 'hyb'}},
            {Title: 'MapQuestOSM', Name: 'MapQuestOSM', sourceParams: {layer: 'osm'}}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_osmsource') {
          server.layersConfig = [
            {Title: 'OpenStreetMap', Name: 'mapnik'}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_wmscsource' ||
            server.ptype === 'gxp_tmssource') { // currently, if it is a tms endpoint, assume it has wmsgetcapabilities
          console.log('---- ServerService.Sending GetCapabilities.server: ', server);
          if (!goog.isDefAndNotNull(server.url)) {
            dialogService_.error(translate_('error'), translate_('server_url_not_specified'));
            deferredResponse.reject(server);
          } else {
            var parser = new ol.format.WMSCapabilities();
            var url = server.url + '?SERVICE=WMS&REQUEST=GetCapabilities';
            server.populatingLayersConfig = true;
            http_.get(url).then(function(xhr) {
              if (xhr.status === 200) {
                var response = parser.read(xhr.data);
                if (goog.isDefAndNotNull(response.Capability) &&
                    goog.isDefAndNotNull(response.Capability.Layer)) {
                  server.layersConfig = response.Capability.Layer.Layer;
                  console.log('---- populateLayersConfig.populateLayersConfig server', server);
                  rootScope_.$broadcast('layers-loaded', server.id);
                  deferredResponse.resolve(server);
                } else {
                  deferredResponse.reject(server);
                }
                server.populatingLayersConfig = false;
              } else {
                dialogService_.error(translate_('error'),
                    translate_('failed_get_capabilities') + ' (' + xhr.status + ')');
                deferredResponse.reject(server);
                server.populatingLayersConfig = false;
              }
            }, function(xhr) {
              dialogService_.error(translate_('error'),
                  translate_('failed_get_capabilities') + ' (' + xhr.status + ')');
              deferredResponse.reject(server);
              server.populatingLayersConfig = false;
            });
          }
        }
      }

      return deferredResponse.promise;
    };

  });
}());
