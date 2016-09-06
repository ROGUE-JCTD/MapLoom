(function() {

  var module = angular.module('loom_map_directive', []);

  module.directive('loomMap',
      function($rootScope, serverService, mapService, geogigService, $translate, dialogService) {
        return {
          template: '<div id="{{mapId}}" ng-style="style"></div>',
          scope: {
            mapId: '@',
            layers: '=',
            center: '=',
            style: '=',
            zoom: '='
          },
          link: function(scope, element) {
            var map;
            var firstExtent = null;

            var createMap = function() {
              map = new ol.Map({
                layers: [
                  new ol.layer.Tile({
                    source: new ol.source.OSM()
                  })
                ],
                target: scope.mapId,
                view: new ol.View({
                  center: scope.center,
                  zoom: scope.zoom
                }),
                logo: false
              });

              firstExtent = map.getView().calculateExtent(map.getSize());

              map.on('moveend', function(event) {
                $rootScope.$broadcast('moveendMap', event.frameState.extent);
              });

            };
            $('#registry-layer-dialog').on('shown.bs.modal', function() {
              if (map === undefined) {
                createMap();
              }
            });

            $rootScope.$on('resetMap', function(event) {
              var zoom = ol.animation.zoom({resolution: map.getView().getResolution()});
              var pan = ol.animation.pan({source: map.getView().getCenter()});
              map.beforeRender(pan, zoom);
              map.getView().fit(firstExtent, map.getSize());
            });

            scope.$watch('layers', function(layers) {
              if (layers && map) {
                removeLayersWithNoId();
                addNewAndRemoveRepeatedLayers(layers);
              }
            });

            function removeLayersWithNoId() {
              var layerLength = map.getLayers().getLength();
              var mapLayers = map.getLayers().getArray();
              var rmIndex = 1;
              for (var i = 1; i < layerLength; i++) {
                if (!angular.isDefined(mapLayers[rmIndex].layerId)) {
                  map.removeLayer(mapLayers[rmIndex]);
                }else {
                  rmIndex++;
                }
              }
            }

            function addNewAndRemoveRepeatedLayers(layers) {
              for (var j = 0; j < layers.length; j++) {
                var deletedLayer = compareAndDeleteLayer(layers[j]);
                if (!deletedLayer) {
                  map.addLayer(layers[j]);
                }
              }
            }

            function compareAndDeleteLayer(layer) {
              var mapLayers = map.getLayers().getArray();
              for (var i = 1; i < mapLayers.length; i++) {
                if (angular.isDefined(layer.layerId) && mapLayers[i].layerId === layer.layerId) {
                  map.removeLayer(mapLayers[i]);
                  return true;
                }
              }
              return false;
            }

          }
        };
      });
}());
