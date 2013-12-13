(function() {

  var module = angular.module('loom_history_diff_directive', []);

  module.directive('loomHistoryDiff',
      function($rootScope, historyService, $translate, geogitService, diffService,
               pulldownService, dialogService, $http, $window) {
        return {
          templateUrl: 'history/partial/historydiff.tpl.html',
          link: function(scope, element, attrs) {
            scope.startDate = [new Date().toISOString()];
            scope.endDate = [new Date().toISOString()];
            scope.active = true;
            scope.contentHidden = true;

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
              $('#history-loading').addClass('hidden');
            };

            scope.onDiff = function() {
              $('#history-loading').toggleClass('hidden');
              var startTime = new Date(scope.startDate[0]).getTime();
              var endTime = new Date(scope.endDate[0]).getTime();
              var logOptions = new GeoGitLogOptions();
              logOptions.untilTime = startTime < endTime ? endTime : startTime;
              logOptions.sinceTime = startTime < endTime ? startTime : endTime;
              logOptions.path = historyService.pathFilter;
              logOptions.summarize = true;
              // TODO: Add the since option to specify branch name
              //logOptions.since = historyService.layer.get('metadata').branchName;
              geogitService.command(historyService.repoId, 'log', logOptions).then(function(response) {
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
                  var diffOptions = new GeoGitDiffOptions();
                  diffOptions.oldRefSpec = lastCommitId;
                  diffOptions.newRefSpec = firstCommitId;
                  diffOptions.showGeometryChanges = true;
                  diffOptions.pathFilter = historyService.pathFilter;
                  diffOptions.show = 1000;
                  diffService.performDiff(historyService.repoId, diffOptions).then(function(response) {
                    if (goog.isDefAndNotNull(response.Feature)) {
                      if (goog.isDefAndNotNull(response.nextPage) && response.nextPage == 'true') {
                        dialogService.warn($translate('warning'),
                            $translate('too_many_changes'), [$translate('btn_ok')]);
                      } else {
                        diffService.setTitle($translate('summary_of_changes'));
                        pulldownService.showDiffPanel();
                        scope.cancel();
                      }
                    } else {
                      dialogService.open($translate('history'),
                          $translate('no_changes_in_time_range'), [$translate('btn_ok')]);
                      $('#history-loading').addClass('hidden');
                    }
                  }, function(reject) {
                    //failed to get diff
                    console.log('Failed to get diff: ', reject);
                    dialogService.error($translate('error'),
                        $translate('diff_unknown_error'), [$translate('btn_ok')]);
                    $('#history-loading').addClass('hidden');
                  });
                } else {
                  // no commits
                  dialogService.open($translate('history'),
                      $translate('no_changes_in_time_range'), [$translate('btn_ok')]);
                  $('#history-loading').addClass('hidden');
                }
              }, function(reject) {
                // failed to get log
                console.log('Failed to get log: ', reject);
                dialogService.error($translate('error'),
                    $translate('diff_unknown_error'), [$translate('btn_ok')]);
                $('#history-loading').addClass('hidden');
              });
            };

            scope.exportCSV = function() {
              var repo = geogitService.getRepoById(historyService.layer.get('metadata').repoId);
              var startTime = new Date(scope.startDate[0]).getTime();
              var endTime = new Date(scope.endDate[0]).getTime();
              var untilTime = startTime < endTime ? endTime : startTime;
              var sinceTime = startTime < endTime ? startTime : endTime;
              var path = historyService.pathFilter;
              // TODO: Add the since option to specify branch name
              //var since = historyService.layer.get('metadata').branchName;
              // TODO: Make this work with a proxy once it supports authentication
              var url = repo.url + '/repo/exportcsv?path=' +
                  path + '&sinceTime=' + sinceTime + '&untilTime=' + untilTime;
              $window.open(url);
            };
          }
        };
      }
  );
})();
