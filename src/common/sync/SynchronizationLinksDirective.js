(function() {

  var module = angular.module('loom_synclinks_directive', []);

  module.directive('loomSynclinks',
      function($translate, synchronizationService, dialogService, mapService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'sync/partials/synclinks.tpl.html',
          link: function(scope) {
            scope.syncService = synchronizationService;
            var createDefaultLinks = function(event, repo, remote) {
              if (!goog.isDefAndNotNull(repo.unique) || repo.unique === false) {
                return;
              }
              var localMaster = false;
              var index;
              for (index = 0; index < repo.branches.length; index++) {
                if (repo.branches[index] === 'master') {
                  localMaster = true;
                  break;
                }
              }
              for (index = 0; index < repo.remotes.length; index++) {
                if (repo.remotes[index].branches.length > 0 && (!goog.isDefAndNotNull(remote) ||
                    remote === repo.remotes[index].name)) {
                  for (var branchIndex = 0; branchIndex < repo.remotes[index].branches.length; branchIndex++) {
                    if (repo.remotes[index].branches[branchIndex] === 'master' && localMaster) {
                      scope.syncService.addLink(new SynchronizationLink(repo.name + ':' + repo.remotes[index].name,
                          repo, 'master', repo.remotes[index], 'master'));
                    }
                  }
                }
              }
            };

            scope.singleSync = function(link) {
              if (!link.isSyncing && !scope.syncService.getIsSyncing()) {
                link.isSyncing = true;
                link.singleSync = true;
                scope.syncService.sync(link).then(function(syncedLink) {
                  syncedLink.isSyncing = false;
                  link.singleSync = false;
                  dialogService.open($translate.instant('synchronization'),
                      $translate.instant('synchronization_success'));
                  mapService.dumpTileCache();
                }, function(error) {
                  // Something failed
                  link.isSyncing = false;
                  link.singleSync = false;
                  if (!(goog.isDefAndNotNull(error) && error === false)) {
                    dialogService.error($translate.instant('synchronization'),
                        $translate.instant('synchronization_failed'));
                  }
                });
              }
            };

            scope.$on('repoAdded', createDefaultLinks);
            scope.$on('remoteAdded', createDefaultLinks);
          }
        };
      }
  );
})();
