(function() {

  var module = angular.module('loom_storylegend_directive', []);

  module.directive('loomStorylegend',
      function($rootScope, mapService, configService, $translate) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'storylegends/partials/storylegend.tpl.html',
          link: function(scope) {
            scope.layers = configService.configuration.map.layers;
            scope.$on('layer-added', function() {
              var layers = mapService.getLayers(false, true);
              scope.layers = [];
              for (var i in layers) {
                var layer = layers[i];
                if (!layer.get('metadata').heatmap) {
                  var uniqueId = layer.get('metadata').uniqueID;
                  scope.layers.push({
                    id: uniqueId,
                    title: layer.get('metadata').config.titleAlias || layer.get('metadata').title,
                    layer: layer
                  });
                }
              }
            });
            scope.saveMasking = function() {
              for (var i in scope.layers) {
                var layer = scope.layers[i];
                var metadata = layer.layer.get('metadata');
                metadata.config.titleAlias = layer.title;
                layer.layer.set('metadata', metadata);
              }
            };
          }
        };
      });
})();
