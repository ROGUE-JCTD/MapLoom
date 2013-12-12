(function() {
  var module = angular.module('loom_history_controller', []);

  module.controller('LoomHistoryController',
      function($scope, historyService) {
        function assignScopeVariables() {
          $scope.title = historyService.title;
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

        $scope.clearHistory = function() {
          historyService.clearHistory();
        };

        assignScopeVariables();

        $scope.$watch('historyService.title', updateScopeVariables);

        $scope.$on('history_fetched', updateScopeVariables);
        $scope.$on('history_cleared', updateScopeVariables);
      });
})();
