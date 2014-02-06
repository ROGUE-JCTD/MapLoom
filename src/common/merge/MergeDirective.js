(function() {

  var module = angular.module('loom_merge_directive', []);

  module.directive('loomMerge',
      function($translate, geogitService, dialogService, notificationService,
               conflictService, mapService, featureDiffService, configService) {
        return {
          templateUrl: 'merge/partials/merge.tpl.html',
          link: function(scope, element, attrs) {
            scope.geogitService = geogitService;
            scope.listFilter = function(otherItem) {
              return function(item) {
                return item !== otherItem;
              };
            };
            scope.mergePossible = function() {
              return goog.isDefAndNotNull(scope.sourceBranch) && goog.isDefAndNotNull(scope.destinationBranch);
            };

            scope.cancel = function() {
              scope.selectedRepoId = null;
              scope.sourceBranch = null;
              scope.destinationBranch = null;
              element.closest('.modal').modal('hide');
              element.find('#loading').addClass('hidden');
            };

            scope.onMerge = function() {
              element.find('#loading').toggleClass('hidden');
              var repoId = scope.selectedRepoId;
              geogitService.beginTransaction(repoId).then(function(transaction) {
                var checkoutOptions = new GeoGitCheckoutOptions();
                checkoutOptions.branch = scope.destinationBranch;
                transaction.command('checkout', checkoutOptions).then(function(checkoutResult) {
                  var mergeOptions = new GeoGitMergeOptions();
                  mergeOptions.commit = scope.sourceBranch;
                  mergeOptions.noCommit = true;
                  mergeOptions.authorName = configService.configuration.userprofilename;
                  mergeOptions.authorEmail = configService.configuration.userprofileemail;
                  transaction.command('merge', mergeOptions).then(function(mergeResult) {
                    transaction.command('status').then(function(statusResult) {
                      var commitOptions = new GeoGitCommitOptions();
                      commitOptions.all = true;
                      commitOptions.message =
                          conflictService.buildMergeMessage(statusResult, scope.sourceBranch, false);
                      commitOptions.authorName = configService.configuration.userprofilename;
                      commitOptions.authorEmail = configService.configuration.userprofileemail;
                      transaction.command('commit', commitOptions).then(function(commitResponse) {
                        transaction.finalize().then(function() {
                          var leftName = scope.destinationBranch;
                          var rightName = scope.sourceBranch;
                          notificationService.addNotification({
                            text: $translate('merge_successful'),
                            read: false,
                            type: 'loom-update-notification',
                            emptyMessage: $translate('merge_no_changes'),
                            repos: [
                              {
                                name: 'geogit_repo',
                                features: mergeResult.Merge.Feature
                              }
                            ],
                            callback: function(feature) {
                              featureDiffService.leftName = leftName;
                              featureDiffService.rightName = rightName;
                              featureDiffService.setFeature(
                                  feature.original, mergeResult.Merge.ours,
                                  mergeResult.Merge.theirs, mergeResult.Merge.ancestor,
                                  commitResponse.commitId, repoId);
                              $('#feature-diff-dialog').modal('show');
                            }
                          });
                          scope.cancel();
                          mapService.dumpTileCache();
                        }, function(endTransactionFailure) {
                          if (goog.isObject(endTransactionFailure) &&
                              goog.isDefAndNotNull(endTransactionFailure.conflicts)) {
                            handleConflicts(endTransactionFailure, transaction,
                                dialogService, conflictService, $translate,
                                $translate('transaction'), $translate('repository'), scope, $translate('transaction'));
                          } else {
                            dialogService.error($translate('error'), $translate('merge_unknown_error'));
                            transaction.abort();
                            scope.cancel();
                            console.log('ERROR: EndTransaction failure: ', endTransactionFailure);
                          }
                        });
                      }, function(commitFailure) {
                        dialogService.error($translate('error'), $translate('merge_unknown_error'));
                        transaction.abort();
                        scope.cancel();
                        console.log('ERROR: Commit failure: ', commitFailure);
                      });
                    }, function(statusFailure) {
                      dialogService.error($translate('error'), $translate('merge_unknown_error'));
                      transaction.abort();
                      scope.cancel();
                      console.log('ERROR: Status failure: ', statusFailure);
                    });
                  }, function(mergeFailure) {
                    if (goog.isObject(mergeFailure) && goog.isDefAndNotNull(mergeFailure.conflicts)) {
                      handleConflicts(mergeFailure, transaction,
                          dialogService, conflictService, $translate, scope.destinationBranch, scope.sourceBranch,
                          scope, scope.sourceBranch);
                    } else {
                      dialogService.error($translate('error'), $translate('merge_unknown_error'));
                      transaction.abort();
                      scope.cancel();
                      console.log('ERROR: Merge failure: ', mergeOptions, mergeFailure);
                    }
                  });
                }, function(checkoutFailure) {
                  dialogService.error($translate('error'), $translate('merge_unknown_error'));
                  transaction.abort();
                  scope.cancel();
                  console.log('ERROR: Checkout failure: ', checkoutOptions, checkoutFailure);
                });
              }, function(beginTransactionFailure) {
                dialogService.error($translate('error'), $translate('merge_unknown_error'));
                console.log('ERROR: Begin transaction failure: ', beginTransactionFailure);
                scope.cancel();
              });
            };

            scope.$watch('selectedRepoId', function() {
              scope.sourceBranch = null;
              scope.destinationBranch = null;
            });
          }
        };
      }
  );

  function handleConflicts(mergeFailure, transaction, dialogService, conflictService, translate,
                           ourName, theirName, scope, mergeBranch) {
    var myDialog = dialogService.warn(translate('merge_conflicts'), translate('conflicts_encountered'),
        [translate('abort'), translate('resolve_conflicts')], false);

    myDialog.then(function(button) {
      switch (button) {
        case 0:
          transaction.abort();
          break;
        case 1:
          conflictService.ourName = ourName;
          conflictService.theirName = theirName;
          conflictService.ours = mergeFailure.ours;
          conflictService.theirs = mergeFailure.theirs;
          conflictService.ancestor = mergeFailure.ancestor;
          conflictService.features = mergeFailure.Feature;
          conflictService.repoId = scope.selectedRepoId;
          conflictService.transaction = transaction;
          conflictService.mergeBranch = mergeBranch;
          conflictService.beginResolution();
          break;
      }
      scope.cancel();
    });
  }
})();
