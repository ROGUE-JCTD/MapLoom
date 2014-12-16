(function() {

  var module = angular.module('loom_history_diff_directive', []);

  module.directive('loomHistoryDiff',
      function($rootScope, historyService, $translate, geogigService, diffService,
               pulldownService, dialogService, $window) {
        return {
          templateUrl: 'history/partial/historydiff.tpl.html',
          link: function(scope, element, attrs) {
            scope.startDate = [new Date().toISOString()];
            scope.endDate = [new Date().toISOString()];
            scope.active = true;
            scope.contentHidden = true;
            scope.isLoading = false;

            element.closest('.modal').on('hidden.bs.modal', function(e) {
              if (!scope.$$phase && !$rootScope.$$phase) {
                scope.$apply(function() {
                  scope.contentHidden = true;
                });
              } else {
                scope.contentHidden = true;
              }
            });
            element.closest('.modal').on('show.bs.modal', function(e) {
              if (!scope.$$phase && !$rootScope.$$phase) {
                scope.$apply(function() {
                  scope.contentHidden = false;
                });
              } else {
                scope.contentHidden = false;
              }
            });

            scope.cancel = function() {
              element.closest('.modal').modal('hide');
              scope.isLoading = false;
            };

            scope.onDiff = function() {
              scope.isLoading = true;
              var startTime = new Date(scope.startDate[0]).getTime();
              var endTime = new Date(scope.endDate[0]).getTime();
              var logOptions = new GeoGigLogOptions();
              logOptions.untilTime = startTime < endTime ? endTime : startTime;
              logOptions.sinceTime = startTime < endTime ? startTime : endTime;
              logOptions.path = historyService.pathFilter;
              logOptions.returnRange = true;
              // TODO: Add the since option to specify branch name
              //logOptions.since = historyService.layer.get('metadata').branchName;
              geogigService.command(historyService.repoId, 'log', logOptions).then(function(response) {
                if (goog.isDefAndNotNull(response.untilCommit)) {
                  var firstCommitId = response.untilCommit.id;
                  var lastCommit = response.sinceCommit;
                  var lastCommitId = '0000000000000000000000000000000000000000';

                  if (goog.isDefAndNotNull(lastCommit.parents) && goog.isObject(lastCommit.parents)) {
                    if (goog.isDefAndNotNull(lastCommit.parents.id)) {
                      if (goog.isArray(lastCommit.parents.id)) {
                        lastCommitId = lastCommit.parents.id[0];
                      } else {
                        lastCommitId = lastCommit.parents.id;
                      }
                    }
                  }
                  var diffOptions = new GeoGigDiffOptions();
                  diffOptions.oldRefSpec = lastCommitId;
                  diffOptions.newRefSpec = firstCommitId;
                  diffOptions.showGeometryChanges = true;
                  diffOptions.pathFilter = historyService.pathFilter;
                  diffOptions.show = 1000;
                  diffService.performDiff(historyService.repoId, diffOptions).then(function(response) {
                    if (goog.isDefAndNotNull(response.Feature)) {
                      if (goog.isDefAndNotNull(response.nextPage) && response.nextPage == 'true') {
                        dialogService.warn($translate.instant('warning'),
                            $translate.instant('too_many_changes'), [$translate.instant('btn_ok')]);
                        scope.isLoading = false;
                      } else {
                        diffService.setTitle($translate.instant('summary_of_changes'));
                        pulldownService.showDiffPanel();
                        scope.cancel();
                      }
                    } else {
                      dialogService.open($translate.instant('history'),
                          $translate.instant('no_changes_in_time_range'), [$translate.instant('btn_ok')]);
                      scope.isLoading = false;
                    }
                  }, function(reject) {
                    //failed to get diff
                    console.log('Failed to get diff: ', reject);
                    dialogService.error($translate.instant('error'),
                        $translate.instant('diff_unknown_error'), [$translate.instant('btn_ok')]);
                    scope.isLoading = false;
                  });
                } else {
                  // no commits
                  dialogService.open($translate.instant('history'),
                      $translate.instant('no_changes_in_time_range'), [$translate.instant('btn_ok')]);
                  scope.isLoading = false;
                }
              }, function(reject) {
                // failed to get log
                console.log('Failed to get log: ', reject);
                dialogService.error($translate.instant('error'),
                    $translate.instant('diff_unknown_error'), [$translate.instant('btn_ok')]);
                scope.isLoading = false;
              });
            };

            scope.exportCSV = function() {
              var repo = geogigService.getRepoById(historyService.layer.get('metadata').repoId);
              var startTime = new Date(scope.startDate[0]).getTime();
              var endTime = new Date(scope.endDate[0]).getTime();
              var untilTime = startTime < endTime ? endTime : startTime;
              var sinceTime = startTime < endTime ? startTime : endTime;
              var path = historyService.pathFilter;
              var until = historyService.layer.get('metadata').branchName;
              // TODO: Make this work with a proxy once it supports authentication
              var url = repo.url + '/log.csv?until=' + until + '&path=' +
                  path + '&sinceTime=' + sinceTime + '&untilTime=' + untilTime + '&summary=true';
              $window.open(url);
            };
          }
        };
      }
  );
})();
