(function() {
  var module = angular.module('loom_diff_controller', []);

  module.controller('LoomDiffController',
      function($scope, diffService) {
        function assignScopeVariables() {
          $scope.title = diffService.title;
          $scope.diffService = diffService;
          var count = 0;
          for (var i = 0; i < diffService.conflicts.length; i++) {
            var obj = diffService.conflicts[i];
            if (!obj.resolved) {
              count += 1;
            }
          }
          $scope.isMerge = diffService.mergeDiff;
          $scope.numConflicts = count;
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

        $scope.clearDiff = function() {
          diffService.clearDiff();
        };

        assignScopeVariables();

        $scope.$watch('diffService.title', updateScopeVariables);
        $scope.$watch('diffService.conflicts', updateScopeVariables, true);

        $scope.$on('diff_performed', updateScopeVariables);
        $scope.$on('diff_cleared', updateScopeVariables);
      });
})();
