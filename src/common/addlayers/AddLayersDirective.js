(function() {

  var module = angular.module('loom_addlayers_directive', []);

  module.directive('loomAddlayers',
      function(serverService, mapService, geogitService, $translate) {
        return {
          templateUrl: 'addlayers/partials/addlayers.tpl.html',
          link: function(scope, element) {
            scope.serverService = serverService;

            // default to the Local Geoserver. Note that when a map is saved and loaded again,
            // the order of the servers might be different and MapLoom should be able to handle it accordingly
            scope.currentServerIndex = serverService.getServer('Local Geoserver').id;

            angular.element('#layer-filter')[0].attributes.placeholder.value = $translate('filter_layers');

            scope.addLayers = function() {
              var currentServer = serverService.getServer(scope.currentServerIndex);
              var layers = scope.serverService.populateLayers(scope.currentServerIndex);

              // if the server is not a typical server and instead the hardcoded ones
              if (currentServer.type === 'fakeType') {
                if (layers[0].add) {
                  mapService.addBaseLayer(layers[0].title);
                  layers[0].add = false;
                  layers[0].added = true;
                }
                if (layers[1].add) {
                  mapService.addBaseLayer(layers[1].title);
                  layers[1].add = false;
                  layers[1].added = true;
                }
                if (layers[2].add) {
                  mapService.addBaseLayer(layers[2].title);
                  layers[2].add = false;
                  layers[2].added = true;
                }
              } else {
                var length = layers.length;
                for (var index = 0; index < length; index += 1) {
                  var layer = layers[index];
                  if (layer.add) {
                    var config = {
                      source: scope.currentServerIndex,
                      title: layer.title,
                      name: layer.name
                    };
                    mapService.addLayer(config);

                    layer.add = false;
                    layer.added = true;
                  }
                }
              }
            };

            scope.selectServer = function(index) {
              scope.currentServerIndex = index;
            };

            scope.$on('layers-loaded', function() {
              scope.$apply();
            });
            var layerRemoved = function(event, layer) {
              var layers = scope.serverService.populateLayers(layer.get('metadata').serverId);
              var length = layers.length;
              for (var index = 0; index < length; index++) {
                var serverLayer = layers[index];
                if (serverLayer.title === layer.get('metadata').label) {
                  serverLayer.added = false;
                  return;
                }
              }
            };

            scope.$on('layerRemoved', layerRemoved);
          }
        };
      }
  );
})();
