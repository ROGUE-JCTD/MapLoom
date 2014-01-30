var SERVER_SERVICE_USE_PORT = false;
var SERVER_SERVICE_USE_PROXY = true;

(function() {
  var module = angular.module('loom_server_service', []);

  // Private Variables
  var servers = [];

  var rootScope_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var http_ = null;
  var service_ = null;

  module.provider('serverService', function() {
    this.$get = function($rootScope, $http, $location, $translate, dialogService) {
      service_ = this;
      rootScope_ = $rootScope;
      dialogService_ = dialogService;
      translate_ = $translate;
      http_ = $http;

      return this;
    };

    this.getServers = function() {
      return servers;
    };

    /**
     * Note: the index of a server may change after the map is saved and loaded again. When try to use getServerById
     *       which is the same as the index if the map has not be saved/loaded. GetServerByIndex should typically be
     *       used if looking through the servers or when you are certain that the index is valid.
     *       layer.get('metadata').serverId for example, returns ids and not index even though getIndex may work in
     *       most cases.
     */
    this.getServerByIndex = function(index) {
      var server = null;

      if (!goog.isDefAndNotNull(index)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server index.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      if (index >= 0 && index < servers.length) {
        server = servers[index];
      }

      //console.log('----[ returning server index: ', index, ', server: ', server);
      return server;
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

    this.addServer = function(serverInfo) {
      // save the config object on the server object so that when we save the server, we only pass the config as opposed
      // to anything else that the app ads to the server objects.
      var server = {id: servers.length, ptype: 'gxp_olsource', config: serverInfo};

      goog.object.extend(server, serverInfo, {});

      console.log('---- adding server: ', server);
      // TODO: Actually use the type specified in the url
      servers.push(server);
      return server.id;
    };

    this.configDefaultServers = function() {
      var config = null;
      console.log('----- Configuring default servers.');

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_bingsource'))) {
        config = {ptype: 'gxp_bingsource', name: 'Bing'};
        service_.getServerById(service_.addServer(config));
      }
      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_mapquestsource'))) {
        config = {ptype: 'gxp_mapquestsource', name: 'MapQuest'};
        service_.getServerById(service_.addServer(config));
      }
    };

    this.getLayersConfig = function(serverIndex) {
      return servers[serverIndex].layersConfig;
    };

    this.populateLayersConfig = function(index) {
      var server = servers[index];
      console.log('---- populateLayersConfig. server', server);

      if (!goog.isDefAndNotNull(server)) {
        return [];
      }

      if (server.ptype === 'gxp_bingsource') {
        server.layersConfig = [
          {title: 'BingRoad', name: 'BingRoad', sourceParams: {imagerySet: 'Road'}, added: false, add: false},
          {title: 'BingAerial', name: 'BingAerial', sourceParams: {imagerySet: 'Aerial'}, added: false, add: false},
          {title: 'BingAerialWithLabels', name: 'BingAerialWithLabels',
            sourceParams: {imagerySet: 'AerialWithLabels'}, added: false, add: false},
          {title: 'BingCollinsBart', name: 'BingCollinsBart', sourceParams: {imagerySet: 'collinsBart'},
            added: false, add: false},
          {title: 'BingSurvey', name: 'BingSurvey', sourceParams: {imagerySet: 'ordnanceSurvey'},
            added: false, add: false}
        ];

      } else if (server.ptype === 'gxp_mapquestsource') {
        server.layersConfig = [
          {title: 'MapQuestSat', name: 'MapQuestSat', sourceParams: {layer: 'sat'},
            added: false, add: false},
          {title: 'MapQuestHybrid', name: 'MapQuestHybrid',
            sourceParams: {layer: 'hyb'},
            added: false, add: false},
          {title: 'MapQuestOSM', name: 'MapQuestOSM',
            sourceParams: {layer: 'osm'},
            added: false, add: false}
        ];
      } else if (!goog.isDefAndNotNull(server.layersConfig) && goog.isDefAndNotNull(server.url)) {
        console.log('Sending GetCapabilities.server: ', server, ', index:', index);
        server.layersConfig = [];
        var parser = new ol.parser.ogc.WMSCapabilities();
        var url = server.url + '?SERVICE=WMS&REQUEST=GetCapabilities';
        http_.get(url).then(function(xhr) {
          if (xhr.status == 200) {
            var response = parser.read(xhr.data);
            if (goog.isDefAndNotNull(response.capability) && goog.isDefAndNotNull(response.capability.layers)) {
              server.layersConfig = response.capability.layers;

              for (var index = 0; index < server.layersConfig.length; index += 1) {
                server.layersConfig[index].added = false;
              }
              rootScope_.$broadcast('layers-loaded');
            }
          } else {
            dialogService_.error(translate_('error'),
                translate_('failed_get_capabilities') + ' (' + xhr.status + ')');
            server.layersConfig = [];
          }
        }, function(xhr) {
          dialogService_.error(translate_('error'),
              translate_('failed_get_capabilities') + ' (' + xhr.status + ')');
          server.layersConfig = [];
        });
      }
      console.log(server.layersConfig);
      return server.layersConfig;
    };

    this.refreshLayersConfig = function(index) {
      console.log('---- refreshLayersConfig. index: ', index);
      var server = servers[index];
      if (goog.isDefAndNotNull(server) && goog.isDefAndNotNull(server.layersConfig)) {
        var parser = new ol.parser.ogc.WMSCapabilities();

        var url = server.url + '?SERVICE=WMS&REQUEST=GetCapabilities';
        http_.get(url).then(function(xhr) {
          if (xhr.status == 200) {
            var response = parser.read(xhr.data);
            if (goog.isDefAndNotNull(response.capability) && goog.isDefAndNotNull(response.capability.layers)) {
              var addedLayersConfig = [];
              var index;
              for (index = 0; index < server.layersConfig.length; index += 1) {
                if (server.layersConfig[index].added) {
                  addedLayersConfig.push(server.layersConfig[index]);
                }
              }
              var newLayersConfig = response.capability.layers;
              for (index = 0; index < newLayersConfig.length; index += 1) {
                for (var subIndex = 0; subIndex < addedLayersConfig.length; subIndex += 1) {
                  if (addedLayersConfig[subIndex].title === newLayersConfig[index].title) {
                    newLayersConfig[index].added = true;
                    break;
                  }
                }
                if (!goog.isDefAndNotNull(newLayersConfig[index].added)) {
                  newLayersConfig[index].added = false;
                }
              }
              server.layersConfig = newLayersConfig;
              rootScope_.$broadcast('layers-loaded');
            }
          } else {
            dialogService_.error(translate_('error'),
                translate_('failed_get_capabilities') + ' (' + xhr.status + ')');
          }
        }, function(xhr) {
          dialogService_.error(translate_('error'),
              translate_('failed_get_capabilities') + ' (' + xhr.status + ')');
        });
      }
      return server.layersConfig;
    };
  });
}());
