(function() {

  var module = angular.module('loom_feature_diff_directive', []);

  module.directive('loomFeatureDiff',
      function($rootScope, $translate, featureDiffService, conflictService, configService, historyService,
               notificationService, featureBlameService, mapService, dialogService, geogigService) {
        return {
          restrict: 'C',
          templateUrl: 'diff/partial/featurediff.tpl.html',
          link: function(scope, element) {
            function updateVariables() {
              scope.authorsLoaded = false;
              scope.authorsShown = false;
              scope.isLoading = false;
              scope.undoEnabled = true;
              scope.featureDiffService = featureDiffService;
              scope.editable = false;
              scope.readOnly = false;
              if (goog.isDefAndNotNull(featureDiffService.layer) &&
                  goog.isDefAndNotNull(featureDiffService.layer.get('metadata')) &&
                  (featureDiffService.layer.get('metadata').readOnly ||
                   !featureDiffService.layer.get('metadata').editable)) {
                scope.readOnly = true;
              }
              switch (featureDiffService.change) {
                case 'ADDED':
                  scope.rightTitle = $translate.instant('new_feature');
                  break;
                case 'REMOVED':
                  scope.rightTitle = $translate.instant('removed_feature');
                  break;
                case 'MODIFIED':
                  scope.leftTitle = $translate.instant('original_feature');
                  scope.rightTitle = $translate.instant('changed_feature');
                  break;
                case 'MERGED':
                  scope.leftTitle = featureDiffService.leftName;
                  scope.mergedTitle = $translate.instant('merged_feature');
                  scope.rightTitle = featureDiffService.rightName;
                  break;
                case 'CONFLICT':
                  scope.editable = true;
                  scope.leftTitle = featureDiffService.leftName;
                  scope.mergedTitle = $translate.instant('merged_feature');
                  scope.rightTitle = featureDiffService.rightName;
                  break;
              }
              var width = 80 + getScrollbarWidth();
              scope.numPanels = 0;
              scope.leftPanel = false;
              scope.mergePanel = false;
              scope.rightPanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              if (featureDiffService.left.active) {
                width += 230;
                scope.numPanels += 1;
                scope.leftPanel = true;
              }
              if (featureDiffService.merged.active) {
                width += 230;
                scope.numPanels += 1;
                scope.mergePanel = true;
              }
              if (featureDiffService.right.active) {
                width += 230;
                scope.numPanels += 1;
                scope.rightPanel = true;
              }
              if (scope.numPanels > 1) {
                scope.leftSeparator = true;
                if (scope.numPanels > 2) {
                  scope.rightSeparator = true;
                }
              }
              width += (scope.numPanels - 1) * 36;

              element.closest('.modal-dialog').css('width', width);
            }

            scope.cancel = function() {
              featureDiffService.clear();
              scope.leftPanel = false;
              scope.rightPanel = false;
              scope.mergePanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              scope.undoEnabled = true;
              scope.authorsLoaded = false;
              scope.authorsShown = false;
              scope.isLoading = false;
              element.closest('.modal').modal('hide');
            };

            scope.save = function() {
              var numErrors = 0;
              for (var index = 0; index < featureDiffService.merged.attributes.length; index++) {
                if (!featureDiffService.merged.attributes[index].valid) {
                  numErrors++;
                }
              }
              if (numErrors > 0) {
                dialogService.warn($translate.instant('save_attributes'), $translate.instant('invalid_fields',
                    {value: numErrors}),
                    [$translate.instant('btn_ok')], false);
                return;
              } else {
                featureDiffService.feature.olFeature.setGeometry(featureDiffService.merged.olFeature.getGeometry());
                featureDiffService.feature.olFeature.set('change', DiffColorMap.MERGED);
                var merges = featureDiffService.getMerges();
                var geomattributename = featureDiffService.merged.geometry.attributename;
                var geomMergeValue = merges[geomattributename];
                conflictService.resolveConflict(merges,
                    (featureDiffService.merged.geometry.changetype === 'REMOVED' ? geomMergeValue : null));
                featureDiffService.clear();
                scope.leftPanel = false;
                scope.rightPanel = false;
                scope.mergePanel = false;
                scope.leftSeparator = false;
                scope.rightSeparator = false;
                element.closest('.modal').modal('hide');
              }
            };

            scope.performBlame = function() {
              if (scope.authorsLoaded) {
                if (scope.authorsShown) {
                  $rootScope.$broadcast('hide-authors');
                } else {
                  $rootScope.$broadcast('show-authors');
                }
                return;
              }
              scope.isLoading = true;
              if (featureDiffService.change === 'ADDED' || featureDiffService.change === 'REMOVED') {
                var id = featureDiffService.getTheirsId();
                var options = new GeoGigLogOptions();
                options.until = id;
                options.show = 1;
                var panel = featureDiffService.right;
                geogigService.command(featureDiffService.getRepoId(), 'log', options).then(function(response) {
                  if (goog.isDefAndNotNull(response.commit)) {
                    forEachArrayish(panel.attributes, function(attribute) {
                      attribute.commit = response.commit;
                    });
                    panel.geometry.commit = response.commit;
                    scope.isLoading = false;
                    scope.authorsLoaded = true;
                    $rootScope.$broadcast('show-authors');
                  } else {
                    dialogService.error($translate.instant('error'), $translate.instant('author_fetch_failed'));
                    scope.isLoading = false;
                  }
                }, function(reject) {
                  console.log('ERROR: Log Failure: ', options, reject);
                  dialogService.error($translate.instant('error'), $translate.instant('author_fetch_failed'));
                  scope.isLoading = false;
                });
                return;
              }
              var numPanels = scope.numPanels;
              var numFailed = 0;
              if (scope.mergePanel && featureDiffService.change !== 'MERGED') {
                numPanels--;
              }
              var blameFunc = function(panel, id) {
                var options = new GeoGigBlameOptions();
                options.path = featureDiffService.feature.id;
                options.commit = id;
                featureBlameService.performBlame(featureDiffService.getRepoId(), options)
                    .then(function(result) {
                      forEachArrayish(result, function(attribute) {
                        if (panel.geometry.attributename === attribute.name) {
                          panel.geometry.commit = attribute.commit;
                        } else {
                          forEachArrayish(panel.attributes, function(panelAttribute) {
                            if (panelAttribute.attributename === attribute.name) {
                              panelAttribute.commit = attribute.commit;
                            }
                          });
                        }
                      });
                      numPanels--;
                      if (numPanels === 0) {
                        scope.isLoading = false;
                        if (numFailed > 0) {
                          dialogService.error($translate.instant('error'), $translate.instant('author_fetch_failed'));
                        } else {
                          scope.authorsLoaded = true;
                          $rootScope.$broadcast('show-authors');
                        }
                      }
                    }, function(reject) {
                      numPanels--;
                      numFailed++;
                      console.log('ERROR: Blame Failure: ', options, reject);
                      if (numPanels === 0) {
                        dialogService.error($translate.instant('error'), $translate.instant('author_fetch_failed'));
                        scope.isLoading = false;
                      }
                    });
              };
              if (scope.leftPanel) {
                blameFunc(featureDiffService.left, featureDiffService.getOursId());
              }
              if (scope.rightPanel) {
                blameFunc(featureDiffService.right, featureDiffService.getTheirsId());
              }
              if (scope.mergePanel && featureDiffService.change === 'MERGED') {
                blameFunc(featureDiffService.merged, featureDiffService.getMergedId());
              }
            };

            scope.$on('show-authors', function() {
              scope.authorsShown = true;
            });

            scope.$on('hide-authors', function() {
              scope.authorsShown = false;
            });

            var undo = function() {
              var branch = featureDiffService.layer.get('metadata').branchName;
              var layerName = featureDiffService.layer.get('metadata').uniqueID;
              var options = new GeoGigRevertFeatureOptions();
              options.authorName = configService.configuration.userprofilename;
              options.authorEmail = configService.configuration.userprofileemail;
              options.path = featureDiffService.feature.id;
              if (featureDiffService.change === 'MERGED') {
                options.oldCommitId = featureDiffService.getOursId();
                options.newCommitId = featureDiffService.getMergedId();
              } else {
                options.oldCommitId = featureDiffService.getAncestorId();
                options.newCommitId = featureDiffService.getTheirsId();
              }
              options.commitMessage = $translate.instant('reverted_changes_to_feature',
                  {feature: featureDiffService.feature.id}) + ' ' + $translate.instant('applied_via_maploom');
              options.mergeMessage = options.commitMessage;
              var repoId = featureDiffService.getRepoId();
              geogigService.beginTransaction(repoId).then(function(transaction) {
                transaction.command('revertfeature', options).then(function() {
                  transaction.finalize().then(function() {
                    dialogService.open($translate.instant('undo_successful'), $translate.instant('changes_undone'));
                    scope.undoEnabled = false;
                    historyService.refreshHistory(layerName);
                    mapService.dumpTileCache(layerName);
                  }, function(endTransactionFailure) {
                    if (goog.isObject(endTransactionFailure) &&
                        goog.isDefAndNotNull(endTransactionFailure.conflicts)) {
                      handleConflicts(repoId, endTransactionFailure, transaction,
                          dialogService, conflictService, $translate,
                          $translate.instant('transaction'), $translate.instant('repository'), scope,
                          $translate.instant('transaction'));
                    } else {
                      dialogService.error($translate.instant('error'), $translate.instant('merge_unknown_error'));
                      transaction.abort();
                      scope.cancel();
                      console.log('ERROR: EndTransaction failure: ', endTransactionFailure);
                    }
                  });
                }, function(mergeFailure) {
                  if (goog.isObject(mergeFailure) && goog.isDefAndNotNull(mergeFailure.conflicts)) {
                    handleConflicts(repoId, mergeFailure, transaction,
                        dialogService, conflictService, $translate, branch, $translate.instant('fixed_feature'),
                        scope, $translate.instant('fixed_feature'));
                  } else {
                    dialogService.error($translate.instant('error'), $translate.instant('undo_unknown_error'));
                    transaction.abort();
                    scope.cancel();
                    console.log('ERROR: Revert failure: ', options, mergeFailure);
                  }
                });
              }, function(beginTransactionFailure) {
                dialogService.error($translate.instant('error'), $translate.instant('undo_unknown_error'));
                console.log('ERROR: Begin transaction failure: ', beginTransactionFailure);
                scope.cancel();
              });
            };

            scope.undoChanges = function() {
              dialogService.warn($translate.instant('warning'), $translate.instant('sure_undo_changes'),
                  [$translate.instant('yes_btn'), $translate.instant('no_btn')], false).then(function(button) {
                if (button === 0) {
                  undo();
                }
              });
            };

            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
            scope.$on('feature-diff-feature-set', updateVariables);
          }
        };
      }
  );

  // This controller is necessary to hide the tooltip when the authors button is clicked.  The mouse leave doesn't get
  // triggered due to the loading spinner covering it.  This causes the tooltip to get stuck on.
  module.controller('authors-tooltip-controller', function($scope) {
    $scope.onClick = function() {
      //hide the tooltip
      $scope.tt_isOpen = false;
      $scope.performBlame();
    };
  });

  function handleConflicts(repoId, mergeFailure, transaction, dialogService, conflictService, translate, ourName,
                           theirName, scope, mergeBranch) {
    var myDialog = dialogService.warn(translate('undo_conflicts'), translate('conflicts_encountered'),
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
          conflictService.repoId = repoId;
          conflictService.transaction = transaction;
          conflictService.mergeBranch = mergeBranch;
          conflictService.beginResolution();
          break;
      }
      scope.cancel();
    });
  }
})();
