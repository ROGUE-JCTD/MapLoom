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
                })
              });
            };
            $('#add-layer-dialog').on('shown.bs.modal', function() {
              if (map === undefined) {
                createMap();
              }
            });
            scope.$watch('layers', function(layers) {
              if (layers && map) {
                for (var i = 0; i < map.getLayers().getLength(); i++) {
                  map.removeLayer(map.getLayers().getArray()[i]);
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
