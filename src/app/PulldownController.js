(function() {
  var module = angular.module('loom_pulldown_controller', []);

  module.controller('LoomPulldownController',
      function($scope, $location, pulldownService, geogigService, diffService, historyService, mapService, configService) {

        $('#pulldown-content').on('show.bs.collapse', function(e) {
          $('#pulldown-content .in').not($(e.target).parents()).collapse('hide');
        });

        function assignScopeVariables() {
          // variables go here.
          $scope.diffPanel = pulldownService.diffPanel.getVisible();
          $scope.notificationsPanel = ($scope.view_mode == 'edit') ? false : pulldownService.notificationsPanel.getVisible();
          $scope.layersPanel = pulldownService.layersPanel.getVisible();
          $scope.syncPanel = pulldownService.syncPanel.getVisible();
          $scope.mapService = mapService;
          $scope.configService = configService;
          $scope.historyPanel = pulldownService.historyPanel.getVisible();
          $scope.toggleEnabled = pulldownService.toggleEnabled;
          $scope.addLayers = pulldownService.addLayers;
          $scope.serversLoading = pulldownService.serversLoading;
          $scope.pulldownService = pulldownService;
          $scope.storyboxPanel = ($scope.view_mode == 'edit') ? false : pulldownService.storyboxPanel.getVisible();
          $scope.saveButton = ($scope.view_mode == 'edit') ? false : true;
          $scope.addStorybox = pulldownService.addStorybox;
        }


        $scope.location = $location;
        $scope.$watch('location.search()', function() {
          $scope.view_mode = ($location.search()).mode;
          console.log('==== LoomPulldownController, view mode:', $scope.view_mode);
        }, true);

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
        $scope.$watch('configService', updateScopeVariables);
        $scope.$watch('mapService', updateScopeVariables);

        var syncPanelEnabled = function() {
          pulldownService.syncPanel.enabled = geogigService.adminRepos.length > 0;
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

        var historyPanelEnabled = function() {
          pulldownService.historyPanel.enabled = historyService.log.length > 0;
          updateScopeVariables();
        };

        $scope.$on('history_fetched', historyPanelEnabled);
        $scope.$on('history_cleared', historyPanelEnabled);
        $scope.$watch('pulldownService.toggleEnabled', updateScopeVariables);
        $scope.$watch('pulldownService.serversLoading', updateScopeVariables);
      });
})();
