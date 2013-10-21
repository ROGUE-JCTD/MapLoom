(function() {

  var module = angular.module('loom_addlayers_directive', []);

  module.directive('loomAddlayers',
      function(serverService) {
        return {
          templateUrl: 'addlayers/partials/addlayers.tpl.html',
          link: function(scope) {
            scope.serverService = serverService;
            scope.currentServerIndex = 0;

            scope.addLayers = function() {
              var layers = scope.serverService.getLayers(scope.currentServerIndex);
              var length = layers.length;
              for (var index = 0; index < length; index += 1) {
                var layer = layers[index];
                if (layer.add) {
                  var newLayer = new ol.layer.Tile({
                    label: layer.title,
                    source: new ol.source.TileWMS({
                      url: scope.serverService.getServer(scope.currentServerIndex).url,
                      params: {'LAYERS': layer.name}
                    })
                  });
                  scope.map.addLayer(newLayer);
                  layer.add = false;
                  layer.added = true;
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
              var layers = scope.serverService.getLayers(scope.currentServerIndex);
              var length = layers.length;
              for (var index = 0; index < length; index++) {
                var serverLayer = layers[index];
                if (serverLayer.title === layer.get('label')) {
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
