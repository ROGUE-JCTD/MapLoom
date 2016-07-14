(function() {

  var module = angular.module('loom_map_directive', []);

  module.directive('loomMap',
      function($rootScope, serverService, mapService, geogigService, $translate, dialogService) {
        return {
          template: '<div id="{{mapId}}"></div>',
          scope: {
            mapId: '@',
            layers: '=',
            center: '=',
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
                var layerLength = map.getLayers().getLength();
                for (var i = 1; i < layerLength; i++) {
                  map.removeLayer(map.getLayers().getArray()[1]);
                }
                for (var j = 0; j < layers.length; j++) {
                  map.addLayer(layers[j]);
                }
              }
            });
          }
        };
      });
}());
