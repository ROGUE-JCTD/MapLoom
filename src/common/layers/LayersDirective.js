(function() {

  var module = angular.module('loom_layers_directive', []);

  module.directive('loomLayers',
      function($rootScope, mapService, pulldownService, historyService, featureManagerService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'layers/partials/layers.tpl.html',
          link: function(scope) {
            scope.mapService = mapService;
            scope.featureManagerService = featureManagerService;

            scope.toggleVisibility = function(layer) {
              layer.setVisible(!layer.get('visible'));
            };

            scope.removeLayer = function(layer) {
              mapService.map.removeLayer(layer);
              $rootScope.$broadcast('layerRemoved', layer);
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
              historyService.setTitle('History for ' + layer.get('label'));
              historyService.getHistory(layer);
            };
          }
        };
      }
  );
})();
