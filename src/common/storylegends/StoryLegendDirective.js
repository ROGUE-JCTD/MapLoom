(function() {

  var module = angular.module('loom_storylegend_directive', ['loom_layer_service']);

  module.directive('loomStorylegend',
      function($rootScope, layerService) {
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
            var getPropertyIfExist = function(obj, name, defaultValue) {
              if (obj && obj.hasOwnProperty(name)) {
                return obj[name];
              } else {
                return defaultValue;
              }
            };
            var setAttributes = function(attributes, maskings) {
              scope.attributes = [];
              var attributesLength = attributes.length;
              for (var i = 0; i < attributesLength; i++) {
                var attribute = attributes[i];
                var masking = maskings[attribute._name];
                scope.attributes.push({
                  alias: getPropertyIfExist(masking, 'alias', ''),
                  name: attribute._name,
                  show: getPropertyIfExist(masking, 'show', true)
                });
              }
            };
            var saveAttributeMaskings = function(maskings) {
              if (!maskings) { maskings = {}; }
              scope.attributes.forEach(function(attribute) {
                maskings[attribute.name] = attribute;
              });
              return maskings;
            };
            scope.layerAlias = {};
            scope.layerService = layerService;
            scope.saveMasking = function() {
              var metadata = scope.layer.get('metadata');
              metadata.config.titleAlias = scope.layerAlias.title;
              metadata.config.maskings = saveAttributeMaskings(metadata.config.maskings);
              scope.layer.set('metadata', metadata);
            };
            scope.$watch('layer', function(newLayer) {
              if (newLayer) {
                var maskings = newLayer.get('metadata').config.maskings || {};
                setAlias(newLayer);
                setAttributes(layerService.getAttributes(newLayer), maskings);
              }
            });
          }
        };
      });
})();
