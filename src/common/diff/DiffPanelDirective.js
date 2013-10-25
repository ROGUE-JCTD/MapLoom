(function() {
  var module = angular.module('loom_diff_panel_directive', []);

  module.directive('loomDiffPanel', function($rootScope, diffService) {
    return {
      restrict: 'C',
      replace: true,
      templateUrl: 'diff/partial/diffpanel.tpl.html',
      link: function(scope) { // Unused: element, attrs
        scope.adds = diffService.adds;
        scope.modifies = diffService.modifies;
        scope.deletes = diffService.deletes;
        scope.conflicts = diffService.conflicts;
        scope.merges = diffService.merges;
        scope.diffService = diffService;


        scope.$watch('diffService.adds', function() {
          scope.adds = diffService.adds;
        });
        scope.$watch('diffService.modifies', function() {
          scope.modifies = diffService.modifies;
        });
        scope.$watch('diffService.deletes', function() {
          scope.deletes = diffService.deletes;
        });
        scope.$watch('diffService.merges', function() {
          scope.merges = diffService.merges;
        });
        scope.$watch('diffService.conflicts', function() {
          scope.conflicts = diffService.conflicts;
        });
      }
    };
  });
}());
