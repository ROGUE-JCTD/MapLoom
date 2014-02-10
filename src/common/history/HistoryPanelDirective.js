(function() {
  var module = angular.module('loom_history_panel_directive', []);

  module.directive('loomHistoryPanel',
      function($rootScope, $timeout, $translate, diffService, dialogService, historyService, pulldownService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'history/partial/historypanel.tpl.html',
          link: function(scope, element, attrs) {
            var scrollPane = element.find('.history-scroll-pane');
            var raw = scrollPane[0];

            scrollPane.bind('scroll', function() {
              if (historyService.nextPage && raw.scrollTop + raw.offsetHeight >= raw.scrollHeight - 47) {
                scope.$apply(function() {
                  historyService.getMoreHistory();
                });
              }
            });

            scope.$on('history-refreshed', function(event, numInserted) {
              if (raw.scrollTop !== 0) {
                var height = scrollPane.find('.list-group-item')[0].offsetHeight - 1;
                raw.scrollTop = raw.scrollTop + height * numInserted;
              }
            });

            function updateVariables(newLog, oldLog) {
              if (goog.isDefAndNotNull(oldLog) && oldLog.length === 0) {
                $timeout(function() {
                  scrollPane.scrollTop(0);
                },1);
              }
              scope.log = historyService.log;
              scope.historyService = historyService;
            }

            scope.getCommitAuthor = function(commit) {
              return commit.author['name'].length > 0 ? commit.author['name'] : $translate('anonymous');
            };

            scope.getCommitTime = function(commit) {
              var date = moment(new Date(commit.author.timestamp));
              date.lang($translate.uses());
              return date.format('L') + ' @ ' + date.format('LT');
            };

            scope.historyClicked = function(commit) {
              $('.loom-history-popover').popover('hide');
              var lastCommitId = '0000000000000000000000000000000000000000';
              if (goog.isDefAndNotNull(commit.parents) && goog.isObject(commit.parents)) {
                if (goog.isDefAndNotNull(commit.parents.id)) {
                  if (goog.isArray(commit.parents.id)) {
                    lastCommitId = commit.parents.id[0];
                  } else {
                    lastCommitId = commit.parents.id;
                  }
                }
              }
              var diffOptions = new GeoGitDiffOptions();
              diffOptions.oldRefSpec = lastCommitId;
              diffOptions.newRefSpec = commit.id;
              diffOptions.showGeometryChanges = true;
              diffOptions.pathFilter = historyService.pathFilter;
              diffOptions.show = 1000;
              diffService.performDiff(historyService.repoId, diffOptions).then(function(response) {
                if (goog.isDefAndNotNull(response.Feature)) {
                  if (goog.isDefAndNotNull(response.nextPage) && response.nextPage === true) {
                    dialogService.warn($translate('warning'),
                        $translate('too_many_changes'), [$translate('btn_ok')]);
                  } else {
                    diffService.setTitle($translate('summary_of_changes'));
                    pulldownService.showDiffPanel();
                    //diffService_.clickCallback = featureClicked;
                  }
                } else {
                  dialogService.open($translate('history'),
                      $translate('no_changes_in_commit'), [$translate('btn_ok')]);
                }
              }, function(reject) {
                //failed to get diff
                dialogService.error($translate('error'),
                    $translate('diff_unknown_error'), [$translate('btn_ok')]);
              });
            };

            updateVariables();

            scope.$watch('historyService.log', updateVariables, true);
          }
        };
      });
}());
