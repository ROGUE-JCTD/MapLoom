(function() {

  var module = angular.module('loom_layers_directive', []);

  module.directive('loomLayers',
      function($rootScope, mapService, serverService, pulldownService, historyService, featureManagerService,
               dialogService, $translate, tableViewService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'layers/partials/layers.tpl.html',
          link: function(scope) {
            scope.mapService = mapService;
            scope.featureManagerService = featureManagerService;
            scope.tableViewService = tableViewService;

            scope.toggleVisibility = function(layer) {
              layer.setVisible(!layer.get('visible'));
            };

            scope.removeLayer = function(layer) {
              dialogService.warn($translate('remove_layer'), $translate('sure_remove_layer'),
                  [$translate('yes_btn'), $translate('no_btn')], false).then(function(button) {
                switch (button) {
                  case 0:
                    mapService.map.removeLayer(layer);
                    $rootScope.$broadcast('layerRemoved', layer);
                    break;
                  case 1:
                    break;
                }
              });
            };

            scope.reorderLayer = function(startIndex, endIndex) {
              var length = mapService.map.getLayers().getArray().length - 1;
              var layer = mapService.map.removeLayer(mapService.map.getLayers().getAt(length - startIndex));
              mapService.map.getLayers().insertAt(length - endIndex, layer);
            };

            scope.filterInternalLayers = function(layer) {
              return !(!goog.isDefAndNotNull(layer.get('metadata')) ||
                  (goog.isDefAndNotNull(layer.get('metadata').vectorEditLayer) &&
                      layer.get('metadata').vectorEditLayer));
            };

            scope.isGeogit = function(layer) {
              if (goog.isDefAndNotNull(layer)) {
                var metadata = layer.get('metadata');
                if (goog.isDefAndNotNull(metadata)) {
                  if (goog.isDefAndNotNull(metadata.isGeoGit) && metadata.isGeoGit) {
                    return metadata.isGeoGit;
                  }
                }
              }
              return false;
            };

            scope.isLoadingTable = function(layer) {
              var loadingTable = layer.get('metadata').loadingTable;
              return goog.isDefAndNotNull(loadingTable) && loadingTable === true;
            };

            scope.showTable = function(layer) {
              layer.get('metadata').loadingTable = true;
              tableViewService.showTable(layer).then(function() {
                layer.get('metadata').loadingTable = false;
                $('#table-view-window').modal('show');
              }, function() {
                layer.get('metadata').loadingTable = false;
                dialogService.error($translate('show_table'), $translate('show_table_failed'));
              });
            };

            scope.isLoadingHistory = function(layer) {
              var loadingHistory = layer.get('metadata').loadingHistory;
              return goog.isDefAndNotNull(loadingHistory) && loadingHistory === true;
            };

            scope.showHistory = function(layer) {
              historyService.setTitle($translate('history_for', {value: layer.get('metadata').title}));
              layer.get('metadata').loadingHistory = true;
              var promise = historyService.getHistory(layer);
              if (goog.isDefAndNotNull(promise)) {
                promise.then(function() {
                  layer.get('metadata').loadingHistory = false;
                }, function() {
                  layer.get('metadata').loadingHistory = false;
                });
              } else {
                layer.get('metadata').loadingHistory = false;
              }
            };

            scope.attrList = [];
            scope.fillAttrList = function(layer) {
              scope.attrList = [];

              for (var i in layer.get('metadata').schema) {
                if (layer.get('metadata').schema[i]._type.search('gml:') > -1) {
                  continue;
                }
                scope.attrList.push(layer.get('metadata').schema[i]._name);
              }
            };


            // Note: when a layer is added to a map through the add layers dialog, the title of the layer returned
            //       from getcapabilities is used. As a result, when a map is saved, it has a title and when it is
            //       opened again the title is passed in. This is not the case, however, when a map is created from
            //       a layer in geonode. The layer has a name but not a title. The following segment tries to update
            //       the title of the layer if a layer added to the ap doesn't have one.
            scope.updateLayerTitles = function(serverIndex) {
              console.log('---- LayersDirective.updateLayerTitles. serverIndex: ', serverIndex);

              var server = serverService.getServerByIndex(serverIndex);

              var layers = mapService.getLayers(true, true); // get hidden and imagery layers as well

              console.log('server: ', server, ', layers: ', layers);

              for (var index = 0; index < server.layersConfig.length; index++) {
                var layerConfig = server.layersConfig[index];
                for (var index2 = 0; index2 < layers.length; index2++) {
                  var layer = layers[index2];
                  var layerMetadate = layer.get('metadata');
                  if (goog.isDefAndNotNull(layerMetadate) &&
                      goog.isDefAndNotNull(layerMetadate.config)) {
                    var conf = layerMetadate.config;
                    if (conf.source === serverIndex) {
                      if (conf.name === layerConfig.name) {
                        conf.title = layerConfig.title;
                        layerMetadate.title = layerConfig.title;
                        console.log('-- mapService.updateLayerTitles. updated title: ', layerConfig.title, layer);
                      }
                    }
                  }
                }
              }
            };

            scope.getLayerInfo = function(layer) {
              $rootScope.$broadcast('getLayerInfo', layer);
            };

            scope.$on('layers-loaded', function(event, serverIndex) {
              scope.updateLayerTitles(serverIndex);
            });
          }
        };
      }
  );
})();
