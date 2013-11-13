(function() {

  var module = angular.module('loom_panel_separator_directive', []);

  var attributesEqual = function(attr1, attr2) {
    return attr1.attributename == attr2.attributename &&
        attr1.changetype == attr2.changetype &&
        attr1.newvalue == attr2.newvalue &&
        attr1.oldvalue == attr2.oldvalue;
  };

  module.directive('loomPanelSeparator',
      function(featureDiffService) {
        return {
          restrict: 'C',
          templateUrl: 'diff/partial/panelseparator.tpl.html',
          scope: {
            icon: '@icon',
            clickfunction: '=',
            panel: '=',
            hover: '='
          },
          link: function(scope, element) {
            function updateVariables(event, panel) {
              if (scope.hover) {
                element.closest('.loom-panel-separator').addClass('hoverable');
              }
              scope.arrows = [];
              var i, attr;
              if (featureDiffService.change == 'MODIFIED') {
                scope.geometryChanged = featureDiffService.right.geometry.changetype !== 'NO_CHANGE';
                for (i = 0; i < featureDiffService.right.attributes.length; i++) {
                  attr = featureDiffService.right.attributes[i];
                  if (attr.changetype !== 'NO_CHANGE') {
                    scope.arrows.push({active: true});
                  } else {
                    scope.arrows.push({active: false});
                  }
                }
              } else {
                for (i = 0; i < scope.panel.attributes.length; i++) {
                  scope.geometryChanged = scope.panel.getGeometry() === featureDiffService.merged.getGeometry();
                  attr = scope.panel.attributes[i];
                  if (attributesEqual(attr, featureDiffService.merged.attributes[i]) &&
                      attr.changetype !== 'NO_CHANGE') {
                    scope.arrows.push({active: true});
                  } else {
                    scope.arrows.push({active: false});
                  }
                }
              }
            }

            scope.$on('feature-diff-performed', updateVariables);
            scope.$on('update-merge-feature', updateVariables);
          }
        };
      }
  );
})();
