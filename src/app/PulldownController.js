(function() {
  var module = angular.module('loom_pulldown_controller', []);

  module.controller('LoomPulldownController',
      function($scope, pulldownService) {

        $('#pulldown-content').on('show.bs.collapse', function(e) {
          $('#pulldown-content .in').not($(e.target).parents()).collapse('hide');
        });

        function assignScopeVariables() {
          // variables go here.
          $scope.diffPanel = pulldownService.diffPanel;
          $scope.notificationsPanel = pulldownService.notificationsPanel;
          $scope.layersPanel = pulldownService.layersPanel;
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

        $scope.$on('refresh-pulldown', updateScopeVariables);
      });
})();
