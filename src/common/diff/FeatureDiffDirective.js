(function() {

  var module = angular.module('loom_feature_diff_directive', []);

  module.directive('loomFeatureDiff',
      function(featureDiffService, conflictService) {
        return {
          restrict: 'C',
          templateUrl: 'diff/partial/featurediff.tpl.html',
          link: function(scope, element) {
            function updateVariables() {
              scope.featureDiffService = featureDiffService;
              scope.editable = false;
              switch (featureDiffService.change) {
                case 'ADDED':
                  scope.rightTitle = 'New Feature';
                  break;
                case 'REMOVED':
                  scope.rightTitle = 'Removed Feature';
                  break;
                case 'MODIFIED':
                  scope.leftTitle = 'Original Feature';
                  scope.rightTitle = 'Changed Feature';
                  break;
                case 'MERGED':
                  scope.leftTitle = featureDiffService.leftName;
                  scope.mergedTitle = 'Merged Feature';
                  scope.rightTitle = featureDiffService.rightName;
                  break;
                case 'CONFLICT':
                  scope.editable = true;
                  scope.leftTitle = featureDiffService.leftName;
                  scope.mergedTitle = 'Merged Feature';
                  scope.rightTitle = featureDiffService.rightName;
                  break;
              }
              var width = 80 + getScrollbarWidth();
              var numPanels = 0;
              scope.leftPanel = false;
              scope.mergePanel = false;
              scope.rightPanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              if (featureDiffService.left.active) {
                width += 230;
                numPanels += 1;
                scope.leftPanel = true;
              }
              if (featureDiffService.merged.active) {
                width += 230;
                numPanels += 1;
                scope.mergePanel = true;
              }
              if (featureDiffService.right.active) {
                width += 230;
                numPanels += 1;
                scope.rightPanel = true;
              }
              if (numPanels > 1) {
                scope.leftSeparator = true;
                if (numPanels > 2) {
                  scope.rightSeparator = true;
                }
              }
              width += (numPanels - 1) * 36;

              element.closest('.modal-dialog').css('width', width);
            }

            scope.cancel = function() {
              featureDiffService.clear();
              scope.leftPanel = false;
              scope.rightPanel = false;
              scope.mergePanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              element.closest('.modal').modal('hide');
            };

            scope.save = function() {
              featureDiffService.feature.olFeature.setGeometry(featureDiffService.merged.olFeature.getGeometry());
              featureDiffService.feature.olFeature.set('change', DiffColorMap.MERGED);
              conflictService.resolveConflict(featureDiffService.getMerges());
              featureDiffService.clear();
              scope.leftPanel = false;
              scope.rightPanel = false;
              scope.mergePanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              element.closest('.modal').modal('hide');
            };

            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
            scope.$on('feature-diff-feature-set', updateVariables);
          }
        };
      }
  );
})();
