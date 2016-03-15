(function() {

  var module = angular.module('loom_storylegend_directive', []);

  module.directive('loomStorylegend',
      function($rootScope) {
        return {
          restrict: 'C',
          replace: true,
          scope: {
            layer: '=',
            save: '&'
          },
          templateUrl: 'storylegends/partials/storylegend.tpl.html',
          link: function(scope, element) {
            var setAlias = function(layer) {
              if (!layer.get('metadata').heatmap) {
                var uniqueId = layer.get('metadata').uniqueID;
                scope.layerAlias = {
                  id: uniqueId,
                  title: layer.get('metadata').config.titleAlias || layer.get('metadata').title
                };
              }
            };
            scope.layerAlias = {};
            scope.saveMasking = function() {
              var metadata = scope.layer.get('metadata');
              metadata.config.titleAlias = scope.layerAlias.title;
              scope.layer.set('metadata', metadata);
            };
            scope.$watch('layer', function(newLayer) {
              if (newLayer) {
                setAlias(newLayer);
              }
            });
          }
        };
      });
})();
