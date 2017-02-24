(function() {

  var module = angular.module('loom_map_directive', []);

  module.directive('loomMap',
      function($rootScope, configService, serverService, mapService, geogigService, $translate, dialogService) {
        return {
          template: '<div id="{{mapId}}" ng-style="style"></div>',
          scope: {
            mapId: '@',
            modalId: '@',
            layers: '=',
            center: '=',
            style: '=',
            zoom: '='
          },
          link: function(scope, element) {
            var map;
            var firstExtent = null;

            var getPreviewLayer = function(previewConf) {
              // create the source first.
              var source = null;
              if (previewConf.source.ptype == 'gxp_arcrestsource') {
                source = new ol.source.TileArcGISRest({
                  url: previewConf.source.url
                });
              }

              if (source !== null) {
                return new ol.layer.Tile({
                  source: source
                });
              }
              return null;
            };

            var createMap = function() {
              map = new ol.Map({
                target: scope.mapId,
                view: new ol.View({
                  projection: configService.configuration.map.projection,
                  center: scope.center,
                  zoom: scope.zoom
                }),
                logo: false
              });

              // configure preview layer
              var preview_conf = configService.configuration.previewLayerConf;
              if (preview_conf !== '') {
                var preview_layer = getPreviewLayer(preview_conf);
                map.addLayer(preview_layer);
              } else {
                map.addLayer(new ol.layer.Tile({
                  source: new ol.source.OSM()
                }));
              }

              firstExtent = map.getView().calculateExtent(map.getSize());

              map.on('moveend', function(event) {
                $rootScope.$broadcast('moveendMap', event.frameState.extent);
              });

            };
            $('#' + scope.modalId).on('shown.bs.modal', function() {
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
