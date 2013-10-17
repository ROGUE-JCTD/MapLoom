(function() {

  var module = angular.module('loom_layers_directive', []);

  module.directive('loomLayers',
      function($rootScope) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'layers/partials/layers.tpl.html',
          link: function(scope) {
            scope.toggleVisibility = function(layer) {
              layer.setVisible(!layer.get('visible'));
            };

            scope.removeLayer = function(layer) {
              scope.map.removeLayer(layer);
              $rootScope.$broadcast('layerRemoved', layer);
            };

            scope.reorderLayer = function(startIndex, endIndex) {
              var length = scope.map.getLayers().getArray().length - 1;
              var layer = scope.map.removeLayer(scope.map.getLayers().getAt(length - startIndex));
              scope.map.getLayers().insertAt(length - endIndex, layer);
            };
          }
        };
      }
  );
})();
