(function() {
  var module = angular.module('loom_diff_controller', []);

  module.controller('LoomDiffController',
      function($scope, diffService) {
        function updateScopeVariables() {
          if (!$scope.$$phase) {
            $scope.$apply(function() {
              $scope.hasDifferences = diffService.hasDifferences();
            });
          } else {
            $scope.hasDifferences = diffService.hasDifferences();
          }
        }

        $scope.$on('diff_performed', updateScopeVariables);
        $scope.$on('diff_cleared', updateScopeVariables);
      });
})();
