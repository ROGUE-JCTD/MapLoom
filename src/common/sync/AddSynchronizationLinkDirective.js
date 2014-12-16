(function() {

  var module = angular.module('loom_addsync_directive', []);

  module.directive('loomAddsync',
      function($translate, synchronizationService, geogigService, dialogService, $q) {
        return {
          templateUrl: 'sync/partials/addsync.tpl.html',
          link: function(scope, element) {
            scope.geogigService = geogigService;
            scope.name = $translate.instant('link');

            scope.$on('translation_change', function() {
              scope.name = $translate.instant('link');
            });

            scope.createLink = function(name, repo, remote, localBranch, remoteBranch) {
              synchronizationService.addLink(new SynchronizationLink(name, repo, localBranch, remote, remoteBranch));
            };

            var reset = function() {
              scope.name = $translate.instant('link');
              scope.selectedRepo = null;
              scope.selectedRemote = null;
              scope.localBranch = null;
              scope.remoteBranch = null;
            };

            scope.dismiss = function() {
              reset();
              element.closest('.modal').modal('hide');
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                reset();
              }
            };

            scope.$watch('selectedRemote', function() {
              if (goog.isDefAndNotNull(scope.selectedRemote)) {
                if (scope.selectedRemote.branches.length === 0) {
                  dialogService.open($translate.instant('fetch'), $translate.instant('remote_not_fetched'),
                      [$translate.instant('btn_ok')], false).then(function(button) {
                    switch (button) {
                      case 0:
                        // Fetch the remote
                        element.find('#loading').toggleClass('hidden');
                        var fetchResult = $q.defer();
                        var fetchOptions = new GeoGigFetchOptions();
                        fetchOptions.remote = scope.selectedRemote.name;
                        geogigService.command(scope.selectedRepo.id, 'fetch', fetchOptions).then(function() {
                          geogigService.loadRemotesAndBranches(scope.selectedRepo, fetchResult);
                          fetchResult.promise.then(function() {
                            element.find('#loading').toggleClass('hidden');
                          });
                        }, function(error) {
                          var message = $translate.instant('fetch_error');
                          if (error.status == '408' || error.status == '504') {
                            message = $translate.instant('fetch_timeout');
                          }
                          dialogService.error($translate.instant('fetch'), message,
                              [$translate.instant('btn_ok')], false);
                          element.find('#loading').toggleClass('hidden');
                        });
                    }
                  });
                }
              }
            });

            scope.$on('repoRemoved', reset);
            scope.$on('modal-closed', closeModal);
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
