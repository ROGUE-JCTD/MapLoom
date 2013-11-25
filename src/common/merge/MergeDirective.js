(function() {

  var module = angular.module('loom_merge_directive', []);

  module.directive('loomMerge',
      function(geogitService, dialogService, notificationService, conflictService, mapService) {
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
              var repoId = scope.selectedRepoId;
              geogitService.beginTransaction(repoId).then(function(transaction) {
                var checkoutOptions = new GeoGitCheckoutOptions();
                checkoutOptions.branch = scope.destinationBranch;
                transaction.command('checkout', checkoutOptions).then(function(checkoutResult) {
                  var mergeOptions = new GeoGitMergeOptions();
                  mergeOptions.commit = scope.sourceBranch;
                  transaction.command('merge', mergeOptions).then(function(mergeResult) {
                    transaction.finalize().then(function() {
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
                          var crs = goog.isDefAndNotNull(feature.original.crs) ? feature.original.crs : null;
                          var repoName = geogitService.getRepoById(repoId).name;
                          mapService.map.getLayers().forEach(function(layer) {
                            var metadata = layer.get('metadata');
                            if (goog.isDefAndNotNull(metadata)) {
                              if (goog.isDefAndNotNull(metadata.geogitStore) && metadata.geogitStore === repoName) {
                                if (goog.isDefAndNotNull(metadata.nativeName) &&
                                    metadata.nativeName === feature.layer) {
                                  if (goog.isDefAndNotNull(metadata.projection)) {
                                    crs = metadata.projection;
                                  }
                                }
                              }
                            }
                          });

                          var geom = ol.parser.WKT.read(feature.original.geometry);
                          if (goog.isDefAndNotNull(crs)) {
                            var transform =
                                ol.proj.getTransform(crs, mapService.map.getView().getView2D().getProjection());
                            geom.transform(transform);
                          }
                          var newBounds = geom.getBounds();
                          var x = newBounds[2] - newBounds[0];
                          var y = newBounds[3] - newBounds[1];
                          x *= 0.5;
                          y *= 0.5;
                          newBounds[0] -= x;
                          newBounds[2] += x;
                          newBounds[1] -= y;
                          newBounds[3] += y;
                          mapService.zoomToExtent(newBounds);
                        }
                      });
                      scope.cancel();
                      mapService.dumpTileCache();
                    }, function(endTransactionFailure) {
                      if (goog.isObject(endTransactionFailure) &&
                          goog.isDefAndNotNull(endTransactionFailure.conflicts)) {
                        handleConflicts(endTransactionFailure, transaction, dialogService, conflictService, scope);
                      } else {
                        dialogService.error('Error',
                            'An unknown error occurred when finalizing the transaction.  Please try again.');
                        transaction.abort();
                        scope.cancel();
                        console.log('ERROR: EndTransaction failure: ', endTransactionFailure);
                      }
                    });
                  }, function(mergeFailure) {
                    if (goog.isObject(mergeFailure) && goog.isDefAndNotNull(mergeFailure.conflicts)) {
                      handleConflicts(mergeFailure, transaction, dialogService, conflictService, scope);
                    } else {
                      dialogService.error('Error',
                          'An unknown error occurred when performing the merge.  Please try again.');
                      transaction.abort();
                      scope.cancel();
                      console.log('ERROR: Merge failure: ', mergeOptions, mergeFailure);
                    }
                  });
                }, function(checkoutFailure) {
                  dialogService.error('Error',
                      'An unknown error occurred when checking out the destination branch.  Please try again.');
                  transaction.abort();
                  scope.cancel();
                  console.log('ERROR: Checkout failure: ', checkoutOptions, checkoutFailure);
                });
              }, function(beginTransactionFailure) {
                dialogService.error('Error',
                    'An unknown error occurred creating the transaction.  Please try again.');
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

  function handleConflicts(mergeFailure, transaction, dialogService, conflictService, scope) {
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
          conflictService.ourName = scope.destinationBranch;
          conflictService.theirName = scope.sourceBranch;
          conflictService.ours = mergeFailure.ours;
          conflictService.theirs = mergeFailure.theirs;
          conflictService.ancestor = mergeFailure.ancestor;
          conflictService.features = mergeFailure.Feature;
          conflictService.repoId = scope.selectedRepoId;
          conflictService.transaction = transaction;
          conflictService.beginResolution();
          break;
      }
      scope.cancel();
    });
  }
})();
