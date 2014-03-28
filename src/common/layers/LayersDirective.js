(function() {

  var module = angular.module('loom_layers_directive', []);

  module.directive('loomLayers',
      function($rootScope, mapService, serverService, historyService, featureManagerService,
               dialogService, $translate, tableViewService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'layers/partials/layers.tpl.html',
          link: function(scope) {
            scope.mapService = mapService;
            scope.featureManagerService = featureManagerService;
            scope.tableViewService = tableViewService;
            scope.zooming = false;
            scope.toggleVisibility = function(layer) {
              layer.setVisible(!layer.get('visible'));
            };

            scope.toggleAttributeVisibility = function(attribute) {
              attribute.visible = !attribute.visible;
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

            scope.zoomToData = function(layer) {
              scope.zooming = true;
              mapService.zoomToLayerFeatures(layer).then(function() {
                scope.zooming = false;
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

            scope.getAttrList = function(layer) {
              var attrList = [];

              for (var i in layer.get('metadata').schema) {
                if (layer.get('metadata').schema[i]._type.search('gml:') > -1) {
                  continue;
                }
                attrList.push(layer.get('metadata').schema[i]);
              }
              return attrList;
            };

            scope.getLayerInfo = function(layer) {
              $rootScope.$broadcast('getLayerInfo', layer);
            };
          }
        };
      }
  );
})();
