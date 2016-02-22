(function() {
  var module = angular.module('loom_layer_attribute_visibility_directive', []);

  module.directive('loomLayerAttributeVisibility',
      function($translate, serverService, geogigService) {
        return {
          templateUrl: 'layers/partials/layerattributevisibility.tpl.html',
          link: function(scope, element) {
            var resetVariables = function() {
              scope.layer = null;
            };
            resetVariables();
            scope.$on('getLayerAttributeVisibility', function(evt, layer) {
              //resetVariables();
              scope.layer = layer;
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
              scope.toggleAttributeVisibility = function(attribute) {
                attribute.visible = !attribute.visible;
              };
              element.closest('.modal').modal('toggle');
            });
            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
          }
        };
      });
}());
