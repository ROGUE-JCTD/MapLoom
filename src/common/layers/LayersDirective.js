(function() {

  var module = angular.module('loom_layers_directive', []);

  module.directive('loomLayers',
      function($rootScope, mapService, pulldownService, historyService, featureManagerService, dialogService,
               $translate, tableViewService) {
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

            scope.filterHiddenLayers = function(layer) {
              return !(!goog.isDefAndNotNull(layer.get('metadata')) ||
                  (goog.isDefAndNotNull(layer.get('metadata').hidden) && layer.get('metadata').hidden));
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

            scope.showHistory = function(layer) {
              historyService.setTitle($translate('history_for', {value: layer.get('metadata').label}));
              historyService.getHistory(layer);
            };

            scope.attrList = [];
            scope.fillAttrList = function(layer) {
              scope.attrList = [];

              for (var i in layer.get('metadata').schema) {
                if (layer.get('metadata').schema[i]._name == 'geom' ||
                    layer.get('metadata').schema[i]._name == 'the_geom') {
                  continue;
                }
                scope.attrList.push(layer.get('metadata').schema[i]._name);
              }
            };
          }
        };
      }
  );
})();
