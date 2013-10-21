(function() {
  var module = angular.module('loom_server_service', []);

  // Private Variables
  var servers = [];

  var rootScope = null;

  module.provider('serverService', function() {
    this.$get = function($rootScope, $location) {
      rootScope = $rootScope;
      servers.push({type: 'WMS', name: 'Local Geoserver', url: ('http://' + $location.host() + '/geoserver/wms')});
      return this;
    };

    this.getServers = function() {
      return servers;
    };

    this.getServer = function(index) {
      return servers[index];
    };

    this.addServer = function(type, name, url) {
      // TODO: Actually use the type specified in the url
      servers.push({type: type, name: name, url: (url)});
    };

    this.getLayers = function(index) {
      var server = servers[index];

      if (!goog.isDefAndNotNull(server.layers)) {
        var parser = new ol.parser.ogc.WMSCapabilities();

        var url = '/proxy?url=' + encodeURIComponent(server.url + '?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0');

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        /**
         * onload handler for the XHR request.
         */
        xhr.onload = function() {
          if (xhr.status == 200) {
            server.layers = parser.read(xhr.responseXML).capability.layers;
            for (var index = 0; index < server.layers.length; index += 1) {
              server.layers[index].added = false;
            }
            rootScope.$broadcast('layers-loaded');
          } else {
            alert('Failed to get capabilities: ' + xhr.status.toString() + ' ' + xhr.statusText);
          }
        };
        xhr.send();
      }
      return server.layers;
    };

    this.refreshLayers = function(index) {
      var server = servers[index];
      if (goog.isDefAndNotNull(server.layers)) {
        var parser = new ol.parser.ogc.WMSCapabilities();

        var url = '/proxy?url=' + encodeURIComponent(server.url + '?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0');

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        /**
         * onload handler for the XHR request.
         */
        xhr.onload = function() {
          if (xhr.status == 200) {
            var serverLayers = [];
            var index;
            for (index = 0; index < server.layers.length; index += 1) {
              if (server.layers[index].added) {
                serverLayers.push(server.layers[index]);
              }
            }
            var layers = parser.read(xhr.responseXML).capability.layers;
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
            rootScope.$broadcast('layers-loaded');
          } else {
            alert('Failed to get capabilities: ' + xhr.status.toString() + ' ' + xhr.statusText);
          }
        };
        xhr.send();
      }
      return server.layers;
    };
  });
}());
