(function() {
  var module = angular.module('loom_diff_panel_directive', []);

  module.directive('loomDiffPanel', function($rootScope, diffService, conflictService, pulldownService, dialogService) {
    return {
      restrict: 'C',
      replace: true,
      templateUrl: 'diff/partial/diffpanel.tpl.html',
      link: function(scope) { // Unused: element, attrs
        function updateVariables() {
          scope.adds = diffService.adds;
          scope.modifies = diffService.modifies;
          scope.deletes = diffService.deletes;
          scope.conflicts = diffService.conflicts;
          scope.merges = diffService.merges;
          scope.diffService = diffService;
          scope.featureClicked = diffService.clickCallback;
          scope.mergeButtons = true;
          scope.conflictsText = 'Complete the merge';
          if (scope.numConflicts === 1) {
            scope.conflictsText = '1 conflict remains';
          } else if (scope.numConflicts > 1) {
            scope.conflictsText = scope.numConflicts + ' conflicts remain';
          }
        }

        updateVariables();

        scope.$watch('diffService.adds', updateVariables, true);
        scope.$watch('diffService.modifies', updateVariables, true);
        scope.$watch('diffService.deletes', updateVariables, true);
        scope.$watch('diffService.merges', updateVariables, true);
        scope.$watch('diffService.conflicts', updateVariables, true);
        scope.$watch('diffService.clickCallback', updateVariables);

        scope.cancel = function() {
          dialogService.warn('Cancel Merge', 'Are you sure you want to cancel the merge process?',
              ['Yes', 'No'], false).then(function(button) {
            switch (button) {
              case 'Yes':
                diffService.clearDiff();
                conflictService.abort();
                pulldownService.defaultMode();
                break;
              case 'No':
                break;
            }
          });
        };

        scope.done = function() {
          dialogService.open('Commit Merge', 'Are you sure you want to finalize and commit the merge?',
              ['Yes', 'No'], false).then(function(button) {
            switch (button) {
              case 'Yes':
                conflictService.commit();
                break;
              case 'No':
                break;
            }
          });
        };
      }
    };
  });
}());
