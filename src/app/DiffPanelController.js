(function() {
  var module = angular.module('loom_diff_controller', []);

  module.controller('LoomDiffController',
      function($scope, diffService) {
        function assignScopeVariables() {
          $scope.title = diffService.title;
          $scope.diffService = diffService;
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

        $scope.$watch('diffService.title', updateScopeVariables);
      });
})();
