(function() {

  var module = angular.module('loom_feature_diff_directive', []);

  module.directive('loomFeatureDiff',
      function(featureDiffService) {
        return {
          restrict: 'C',
          templateUrl: 'diff/partial/featurediff.tpl.html',
          link: function(scope, element) {
            function updateVariables() {
              scope.title = featureDiffService.title;
              scope.left = featureDiffService.left;
              scope.right = featureDiffService.right;
              scope.merged = featureDiffService.merged;
              scope.change = featureDiffService.change;
              scope.featureDiffService = featureDiffService;
              scope.ours = featureDiffService.ours;
              scope.theirs = featureDiffService.theirs;
              scope.ancestor = featureDiffService.ancestor;
              scope.repoId = featureDiffService.repoId;
              scope.leftMap = featureDiffService.leftMap;
              scope.mergeMap = featureDiffService.mergeMap;
              scope.rightMap = featureDiffService.rightMap;
              var width = 80;
              var numPanels = 0;
              scope.leftPanel = false;
              scope.mergePanel = false;
              scope.rightPanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              if (goog.isDefAndNotNull(scope.left)) {
                width += 230;
                numPanels += 1;
                scope.leftPanel = true;
              }
              if (goog.isDefAndNotNull(scope.merged)) {
                width += 230;
                numPanels += 1;
                scope.mergePanel = true;
              }
              if (goog.isDefAndNotNull(scope.right)) {
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

            updateVariables();

            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
            scope.$watch('featureDiffService.title', updateVariables, true);
            scope.$watch('featureDiffService.left', updateVariables, true);
            scope.$watch('featureDiffService.right', updateVariables, true);
            scope.$watch('featureDiffService.merged', updateVariables, true);
            scope.$watch('featureDiffService.change', updateVariables, true);
          }
        };
      }
  );
})();
