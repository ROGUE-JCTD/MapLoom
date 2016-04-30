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

            function createVector(coor) {
              var geojsonObject = {
                'type': 'FeatureCollection',
                'crs': {
                  'type': 'name',
                  'properties': {
                    'name': 'EPSG:3857'
                  }
                },
                'features': [{
                  'type': 'Feature',
                  'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[
                      ol.proj.transform([coor[0], coor[1]], 'EPSG:4326', 'EPSG:3857'),
                      ol.proj.transform([coor[0], coor[3]], 'EPSG:4326', 'EPSG:3857'),
                      ol.proj.transform([coor[2], coor[3]], 'EPSG:4326', 'EPSG:3857'),
                      ol.proj.transform([coor[2], coor[1]], 'EPSG:4326', 'EPSG:3857')]]
                  }
                }]
              };
              console.log(coor);
              var style = new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: 'blue',
                  width: 2
                }),
                fill: new ol.style.Fill({
                  color: 'rgba(0, 0, 255, 0.05)'
                })
              });
              var vectorSource = new ol.source.Vector({
                features: (new ol.format.GeoJSON()).readFeatures(geojsonObject)
              });
              return new ol.layer.Vector({
                source: vectorSource,
                style: style
              });
            }

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
                map.addLayer(createVector(layers[1].extent));
              }
            });
          }
        };
      });
}());
