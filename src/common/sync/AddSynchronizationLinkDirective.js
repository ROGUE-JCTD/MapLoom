(function() {

  var module = angular.module('loom_addsync_directive', []);

  module.directive('loomAddsync',
      function($translate, synchronizationService, geogitService) {
        return {
          templateUrl: 'sync/partials/addsync.tpl.html',
          link: function(scope) {
            scope.geogitService = geogitService;
            scope.name = $translate('link');

            scope.$on('translation_change', function() {
              scope.name = $translate('link');
            });

            scope.createLink = function(name, repo, remote, localBranch, remoteBranch) {
              synchronizationService.addLink(new SynchronizationLink(name, repo, localBranch, remote, remoteBranch));
            };

            var reset = function() {
              scope.name = $translate('link');
              scope.selectedRepo = null;
              scope.selectedRemote = null;
              scope.localBranch = null;
              scope.remoteBranch = null;
            };

            scope.$on('repoRemoved', reset);

            scope.$on('loadLink', function(event, link) {
              $('#addSyncWindow').modal('toggle');
              scope.name = link.name;
              scope.selectedRepo = link.getRepo();
              scope.selectedRemote = link.getRemote();
              scope.localBranch = link.getLocalBranch();
              scope.remoteBranch = link.getRemoteBranch();
            });
          }
        };
      }
  );
})();
