(function() {
  var module = angular.module('loom_history_panel_directive', []);

  module.directive('loomHistoryPanel',
      function($rootScope, $timeout, diffService, dialogService, historyService, pulldownService) {
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
              return commit.author['name'].length > 0 ? commit.author['name'] : 'Anonymous';
            };

            scope.getCommitTime = function(commit) {
              var date = new Date(commit.author.timestamp);
              return date.toLocaleDateString() + ' @ ' + date.toLocaleTimeString();
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
                  if (goog.isDefAndNotNull(response.nextPage) && response.nextPage == 'true') {
                    dialogService.warn('Warning',
                        'There were too many changes in the specified commit to display.', ['OK']);
                  } else {
                    diffService.setTitle('Summary of Changes');
                    pulldownService.showDiffPanel();
                    //diffService_.clickCallback = featureClicked;
                  }
                } else {
                  dialogService.open('History',
                      'No changes were made to the layer in the specified commit.', ['OK']);
                }
              }, function(reject) {
                //failed to get diff
                dialogService.error('Error',
                    'An unknown error occurred while summarizing the differences.  Please try again.', ['OK']);
              });
            };

            updateVariables();

            scope.$watch('historyService.log', updateVariables, true);
          }
        };
      });
}());
