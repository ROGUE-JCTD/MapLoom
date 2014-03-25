(function() {

  var module = angular.module('loom_syncconfig_directive', []);

  module.directive('loomSyncconfig',
      function($q, $translate, remoteService, geogitService) {
        return {
          templateUrl: 'sync/partials/syncconfig.tpl.html',
          link: function(scope, element) {
            scope.geogitService = geogitService;
            scope.remoteService = remoteService;
            scope.saving = false;

            angular.element('#remote-name')[0].attributes.placeholder.value = $translate('repo_name');
            angular.element('#remoteUsername')[0].attributes.placeholder.value = $translate('repo_username');
            angular.element('#remotePassword')[0].attributes.placeholder.value = $translate('repo_password');

            scope.finish = function(save) {
              if (save) {
                scope.saving = true;
                var result = $q.defer();
                remoteService.finishRemoteOperation(save, result);
                result.promise.then(function() {
                  remoteService.editing = false;
                  scope.saving = false;
                });
              } else {
                remoteService.finishRemoteOperation(save);
              }
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                remoteService.reset();
              }
            };

            scope.$watch('remoteService.selectedRepo', function() {
              if (goog.isDefAndNotNull(remoteService.selectedRepo)) {
                var logOptions = new GeoGitLogOptions();
                logOptions.returnRange = true;
                geogitService.command(remoteService.selectedRepo.id, 'log', logOptions).then(function(logInfo) {
                  if (logInfo.success === true) {
                    remoteService.selectedRepoInitialCommit = logInfo.sinceCommit.id;
                  }
                });
              }
            });

            scope.$on('translation_change', function() {
              remoteService.selectedText = '*' + $translate('new_remote');
            });

            scope.$on('repoRemoved', remoteService.reset);
            scope.$on('modal-closed', closeModal);
          }
        };
      }
  );
})();
