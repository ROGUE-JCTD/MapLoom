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
              if (scope.currentServerIndex === 1) {
                if (layers[0].add) {
                  var osmLayer = new ol.layer.Tile({
                    label: layers[0].title,
                    metadata: {serverId: scope.currentServerIndex},
                    source: new ol.source.OSM()
                  });
                  scope.map.addLayer(osmLayer);
                  layers[0].add = false;
                  layers[0].added = true;
                }
                if (layers[1].add) {
                  var imageryLayer = new ol.layer.Tile({
                    label: layers[1].title,
                    metadata: {serverId: scope.currentServerIndex},
                    source: new ol.source.MapQuestOpenAerial()
                  });
                  scope.map.addLayer(imageryLayer);
                  layers[1].add = false;
                  layers[1].added = true;
                }
                if (layers[2].add) {
                  var mapquestLayer = new ol.layer.Tile({
                    label: layers[2].title,
                    metadata: {serverId: scope.currentServerIndex},
                    source: new ol.source.MapQuestOSM()
                  });
                  scope.map.addLayer(mapquestLayer);
                  layers[2].add = false;
                  layers[2].added = true;
                }
              } else {
                var length = layers.length;
                for (var index = 0; index < length; index += 1) {
                  var layer = layers[index];
                  if (layer.add) {
                    var newLayer = new ol.layer.Tile({
                      label: layer.title,
                      source: new ol.source.TileWMS({
                        url: scope.serverService.getServer(scope.currentServerIndex).url,
                        metadata: {serverId: scope.currentServerIndex},
                        params: {'LAYERS': layer.name}
                      })
                    });
                    scope.map.addLayer(newLayer);
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
              var layers = scope.serverService.getLayers(layer.get('metadata').serverId);
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
