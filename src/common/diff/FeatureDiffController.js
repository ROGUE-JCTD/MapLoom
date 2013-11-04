(function() {
  var module = angular.module('loom_feature_diff_controller', []);

  module.controller('LoomFeatureDiffController',
      function($scope, $rootScope, featureDiffService) {
        function assignScopeVariables() {
          $scope.title = featureDiffService.title;
          $scope.featureDiffService = featureDiffService;
        }

        function updateScopeVariables() {
          if (!$scope.$$phase && !$rootScope.$$phase) {
            $scope.$apply(function() {
              assignScopeVariables();
            });
          } else {
            assignScopeVariables();
          }
        }

        assignScopeVariables();

        $scope.$watch('featureDiffService.title', updateScopeVariables);
      });
})();
