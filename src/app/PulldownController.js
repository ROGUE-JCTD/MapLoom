(function() {
  var module = angular.module('loom_pulldown_controller', []);

  module.controller('LoomPulldownController',
      function($scope, pulldownService, geogitService, diffService) {

        $('#pulldown-content').on('show.bs.collapse', function(e) {
          $('#pulldown-content .in').not($(e.target).parents()).collapse('hide');
        });

        function assignScopeVariables() {
          // variables go here.
          $scope.diffPanel = pulldownService.diffPanel.getVisible();
          $scope.notificationsPanel = pulldownService.notificationsPanel.getVisible();
          $scope.layersPanel = pulldownService.layersPanel.getVisible();
          $scope.syncPanel = pulldownService.syncPanel.getVisible();
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

        var syncPanelEnabled = function() {
          pulldownService.syncPanel.enabled = geogitService.numRepos > 0;
          updateScopeVariables();
        };

        $scope.$on('repoAdded', syncPanelEnabled);
        $scope.$on('repoRemoved', syncPanelEnabled);

        var diffPanelEnabled = function() {
          pulldownService.diffPanel.enabled = diffService.hasDifferences();
          updateScopeVariables();
        };

        $scope.$on('diff_performed', diffPanelEnabled);
        $scope.$on('diff_cleared', diffPanelEnabled);
      });
})();
