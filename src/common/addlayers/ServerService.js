var SERVER_SERVICE_USE_PORT = false;
var SERVER_SERVICE_USE_PROXY = true;

(function() {
  var module = angular.module('loom_server_service', []);

  // Private Variables
  var servers = [];

  var rootScope_ = null;
  var dialogService_ = null;
  var translate_ = null;

  module.provider('serverService', function() {
    this.$get = function($rootScope, $location, $translate, dialogService) {
      rootScope_ = $rootScope;
      dialogService_ = dialogService;
      translate_ = $translate;

      /*this.addServer({
        type: 'WMS',
        name: 'Local Geoserver',
        url: ('http://' + $location.host() + (SERVER_SERVICE_USE_PORT ? ':' + $location.port() : '') + '/geoserver/wms')
      });


      var id = this.addServer({
        type: 'fakeType',
        name: 'OpenStreetMap',
        url: 'fakeURL'
      });

      this.getServer(id).layers = [
        {
          title: 'OpenStreetMap',
          added: false
        },
        {
          title: 'MapQuestImagery',
          added: false
        },
        {
          title: 'MapQuestOSM',
          added: false
        }
      ];*/

      return this;
    };

    this.getServers = function() {
      return servers;
    };

    this.getServer = function(indexOrName) {
      if (!goog.isDefAndNotNull(indexOrName)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }
      if (typeof indexOrName !== 'string') {
        return servers[indexOrName];
      } else if (!isNaN(parseInt(indexOrName, 10)) && (parseInt(indexOrName, 10).toString() === indexOrName)) {
        // if it is a string that can be converted to an integer
        return servers[parseInt(indexOrName, 10)];
      } else {
        for (var index = 0; index < servers.length; index += 1) {
          if (servers[index].name.toLocaleLowerCase() === indexOrName.toLowerCase()) {
            return servers[index];
          }
        }
      }
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

    this.populateLayers = function(index) {
      var server = servers[index];

      if (!goog.isDefAndNotNull(server)) {
        return [];
      }

      if (!goog.isDefAndNotNull(server.layers) && goog.isDefAndNotNull(server.url)) {
        console.log('Sending GetCapabilities.server: ', server, ', index:', index);
        var parser = new ol.parser.ogc.WMSCapabilities();
        var url = server.url + '?SERVICE=WMS&REQUEST=GetCapabilities';
        if (SERVER_SERVICE_USE_PROXY) {
          url = '/proxy/?url=' + encodeURIComponent(url);
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        /**
         * onload handler for the XHR request.
         */
        xhr.onload = function() {
          if (xhr.status == 200) {
            var response = parser.read(xhr.response);
            if (goog.isDefAndNotNull(response.capability) && goog.isDefAndNotNull(response.capability.layers)) {
              server.layers = response.capability.layers;

              for (var index = 0; index < server.layers.length; index += 1) {
                server.layers[index].added = false;
              }
              rootScope_.$broadcast('layers-loaded');
            }
          } else {
            dialogService_.error(translate_('error'),
                translate_('failed_get_capabilities') + xhr.status.toString() + ' ' + xhr.statusText);
            server.layers = [];
          }
        };
        xhr.send();
      }
      return server.layers;
    };

    this.refreshLayers = function(index) {
      var server = servers[index];
      if (goog.isDefAndNotNull(server) && goog.isDefAndNotNull(server.layers)) {
        var parser = new ol.parser.ogc.WMSCapabilities();

        var url = server.url + '?SERVICE=WMS&REQUEST=GetCapabilities';
        if (SERVER_SERVICE_USE_PROXY) {
          url = '/proxy/?url=' + encodeURIComponent(url);
        }


        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        /**
         * onload handler for the XHR request.
         */
        xhr.onload = function() {
          if (xhr.status == 200) {
            var response = parser.read(xhr.responseXML);
            if (goog.isDefAndNotNull(response.capability) && goog.isDefAndNotNull(response.capability.layers)) {
              var serverLayers = [];
              var index;
              for (index = 0; index < server.layers.length; index += 1) {
                if (server.layers[index].added) {
                  serverLayers.push(server.layers[index]);
                }
              }
              var layers = response.capability.layers;
              for (index = 0; index < layers.length; index += 1) {
                for (var subIndex = 0; subIndex < serverLayers.length; subIndex += 1) {
                  if (serverLayers[subIndex].title === layers[index].title) {
                    layers[index].added = true;
                    break;
                  }
                }
                if (!goog.isDefAndNotNull(layers[index].added)) {
                  layers[index].added = false;
                }
              }
              server.layers = layers;
              rootScope_.$broadcast('layers-loaded');
            }
          } else {
            dialogService_.error(translate_('error'),
                translate_('failed_get_capabilities') + xhr.status.toString() + ' ' + xhr.statusText);
          }
        };
        xhr.send();
      }
      return server.layers;
    };
  });
}());
