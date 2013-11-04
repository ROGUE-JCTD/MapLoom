(function() {

  var module = angular.module('loom_synclinks_directive', []);

  module.directive('loomSynclinks',
      function(synchronizationService, geogitService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'sync/partials/synclinks.tpl.html',
          link: function(scope) {
            scope.syncService = synchronizationService;
            var createDefaultLinks = function(event, repo) {
              for (var index = 0; index < repo.remotes.length; index++) {
                if (repo.remotes[index].branches.length > 0) {
                  scope.syncService.addLink(new SynchronizationLink(repo.name + ':' + repo.remotes[index].name,
                      repo, repo.branches[0], repo.remotes[index], repo.remotes[index].branches[0]));
                }
              }
            };

            scope.$on('repoAdded', createDefaultLinks);
          }
        };
      }
  );
})();
