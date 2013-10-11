(function() {
  var module = angular.module('loom_diff_panel_directive', []);

  module.directive('loomDiffPanel', function($rootScope, diffService) {
    return {
      restrict: 'C',
      replace: true,
      templateUrl: 'diff/partial/diffpanel.tpl.html',
      link: function(scope) { // Unused: element, attrs
        function updateScopeVariables() {
          if (!scope.$$phase && !$rootScope.$$phase) {
            scope.$apply(function() {
              scope.adds = diffService.getAdds();
              scope.modifies = diffService.getModifies();
              scope.deletes = diffService.getDeletes();
            });
          } else {
            scope.adds = diffService.getAdds();
            scope.modifies = diffService.getModifies();
            scope.deletes = diffService.getDeletes();
          }
        }

        updateScopeVariables();

        scope.$on('diff_performed', updateScopeVariables);
        scope.$on('diff_cleared', updateScopeVariables);
      }
    };
  });
}());
