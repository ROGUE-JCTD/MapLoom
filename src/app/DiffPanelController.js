(function() {
  var module = angular.module('loom_diff_controller', []);

  module.controller('LoomDiffController',
      function($scope, diffService) {
        function assignScopeVariables() {
          $scope.hasDifferences = diffService.hasDifferences();
          $scope.title = diffService.title;
        }

        function updateScopeVariables() {
          if (!$scope.$$phase) {
            $scope.$apply(function() {
              assignScopeVariables();
            });
          } else {
            assignScopeVariables();
          }
        }

        assignScopeVariables();

        $scope.$on('diff_performed', updateScopeVariables);
        $scope.$on('diff_cleared', updateScopeVariables);
      });
})();
