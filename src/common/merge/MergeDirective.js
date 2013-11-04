(function() {

  var module = angular.module('loom_merge_directive', []);

  module.directive('loomMerge',
      function(geogitService, dialogService, notificationService, conflictService) {
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
              $('#loading').addClass('hidden');
            };

            scope.onMerge = function() {
              $('#loading').toggleClass('hidden');
              geogitService.beginTransaction(scope.selectedRepoId).then(function(transaction) {
                var checkoutOptions = new GeoGitCheckoutOptions();
                checkoutOptions.branch = scope.destinationBranch;
                transaction.command('checkout', checkoutOptions).then(function(checkoutResult) {
                  var mergeOptions = new GeoGitMergeOptions();
                  mergeOptions.commit = scope.sourceBranch;
                  mergeOptions.noCommit = true;
                  transaction.command('merge', mergeOptions).then(function(mergeResult) {
                    console.log('merge successful: ', mergeResult);
                    notificationService.addNotification({
                      text: 'Merge Successful',
                      read: false,
                      type: 'loom-update-notification',
                      emptyMessage: 'The merge resulted in no changes.',
                      repos: [
                        {
                          name: 'geogit_repo',
                          features: mergeResult.Merge.Feature
                        }
                      ],
                      callback: function(feature) {
                        console.log(feature.feature + ' was clicked!');
                      }
                    });
                    scope.cancel();
                    // TODO: THIS IS ONLY FOR TESTING!!! Prevent the merge from actually being applied.
                    transaction.abort();
                  }, function(mergeFailure) {
                    if (goog.isObject(mergeFailure) && goog.isDefAndNotNull(mergeFailure.conflicts)) {
                      console.log('merge conflicts: ', mergeFailure);
                      var myDialog = dialogService.warn('Merge Conflicts',
                          'Some conflicts were encountered when performing the merge,' +
                          ' would you like to resolve these or abort the merge?',
                          ['Abort', 'Resolve Conflicts'], false);

                      myDialog.then(function(button) {
                        switch (button) {
                          case 'Abort':
                            transaction.abort();
                            break;
                          case 'Resolve Conflicts':
                            conflictService.ours = mergeFailure.ours;
                            conflictService.theirs = mergeFailure.theirs;
                            conflictService.ancestor = mergeFailure.ancestor;
                            conflictService.features = mergeFailure.Feature;
                            conflictService.repoId = scope.selectedRepoId;
                            conflictService.beginResolution();
                            break;
                        }
                        scope.cancel();
                      });
                    } else {
                      transaction.abort();
                      console.log('Merge failure: ', mergeFailure);
                    }
                  });
                }, function(checkoutFailure) {
                  transaction.abort();
                  console.log('Checkout failure: ', checkoutFailure);
                });
              }, function(beginTransactionFailure) {
                console.log('Begin transaction failure: ', beginTransactionFailure);
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
})();
