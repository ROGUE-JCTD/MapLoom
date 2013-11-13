(function() {

  var module = angular.module('loom_feature_diff_directive', []);

  module.directive('loomFeatureDiff',
      function(featureDiffService, diffService, conflictService) {
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
                  scope.leftTitle = diffService.oldName;
                  scope.mergedTitle = 'Merged Feature';
                  scope.rightTitle = diffService.newName;
                  break;
                case 'CONFLICT':
                  scope.editable = true;
                  scope.leftTitle = diffService.oldName;
                  scope.mergedTitle = 'Merged Feature';
                  scope.rightTitle = diffService.newName;
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

            scope.leftSeparatorClick = function() {
              if (featureDiffService.change === 'CONFLICT') {
                featureDiffService.choose(featureDiffService.left);
                scope.ours = true;
              }
              scope.$broadcast('update-merge-feature');
            };

            scope.rightSeparatorClick = function() {
              if (featureDiffService.change === 'CONFLICT') {
                featureDiffService.choose(featureDiffService.right);
                scope.ours = false;
              }
              scope.$broadcast('update-merge-feature');
            };

            scope.cancel = function() {
              featureDiffService.clear();
              scope.leftPanel = false;
              scope.rightPanel = false;
              scope.mergePanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              scope.ours = null;
              element.closest('.modal').modal('hide');
            };

            scope.save = function() {
              if (!goog.isDefAndNotNull(scope.ours)) {
                scope.ours = true;
              }
              featureDiffService.feature.olFeature.setGeometry(featureDiffService.merged.olGeometry);
              featureDiffService.feature.olFeature.set('change', 'MERGED');
              conflictService.resolveConflict(scope.ours);
              featureDiffService.clear();
              scope.leftPanel = false;
              scope.rightPanel = false;
              scope.mergePanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              scope.ours = null;
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
