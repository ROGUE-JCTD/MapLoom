(function() {
  var module = angular.module('loom_sync_controller', []);

  module.controller('loomSyncController',
      function($scope, geogitService) {
        function updateScopeVariables() {
          if (!$scope.$$phase) {
            $scope.$apply(function() {
              $scope.hasRepos = geogitService.numRepos > 0;
            });
          } else {
            $scope.hasRepos = geogitService.numRepos > 0;
          }
        }

        $scope.$on('repoAdded', updateScopeVariables);
        $scope.$on('repoRemoved', updateScopeVariables);
      });
})();
