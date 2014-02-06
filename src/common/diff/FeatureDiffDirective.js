(function() {

  var module = angular.module('loom_feature_diff_directive', []);

  module.directive('loomFeatureDiff',
      function($translate, featureDiffService, conflictService, configService, historyService,
               notificationService, mapService, dialogService, geogitService) {
        return {
          restrict: 'C',
          templateUrl: 'diff/partial/featurediff.tpl.html',
          link: function(scope, element) {
            function updateVariables() {
              scope.undoEnabled = true;
              scope.featureDiffService = featureDiffService;
              scope.editable = false;
              switch (featureDiffService.change) {
                case 'ADDED':
                  scope.rightTitle = $translate('new_feature');
                  break;
                case 'REMOVED':
                  scope.rightTitle = $translate('removed_feature');
                  break;
                case 'MODIFIED':
                  scope.leftTitle = $translate('original_feature');
                  scope.rightTitle = $translate('changed_feature');
                  break;
                case 'MERGED':
                  scope.leftTitle = featureDiffService.leftName;
                  scope.mergedTitle = $translate('merged_feature');
                  scope.rightTitle = featureDiffService.rightName;
                  break;
                case 'CONFLICT':
                  scope.editable = true;
                  scope.leftTitle = featureDiffService.leftName;
                  scope.mergedTitle = $translate('merged_feature');
                  scope.rightTitle = featureDiffService.rightName;
                  break;
              }
              var width = 80 + getScrollbarWidth();
              var numPanels = 0;
              scope.leftPanel = false;
              scope.mergePanel = false;
              scope.rightPanel = false;
              scope.leftSeparator = false;
              scope.rightSeparator = false;
              if (featureDiffService.left.active) {
                width += 230;
                numPanels += 1;
                scope.leftPanel = true;
              }
              if (featureDiffService.merged.active) {
                width += 230;
                numPanels += 1;
                scope.mergePanel = true;
              }
              if (featureDiffService.right.active) {
                width += 230;
                numPanels += 1;
                scope.rightPanel = true;
              }
              if (numPanels > 1) {
                scope.leftSeparator = true;
                if (numPanels > 2) {
                  scope.rightSeparator = true;
                }
              }
              width += (numPanels - 1) * 36;

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
              element.closest('.modal').modal('hide');
            };

            scope.save = function() {
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
            };

            scope.undoChanges = function() {
              var branch = featureDiffService.layer.get('metadata').branchName;
              var layerName = featureDiffService.layer.get('metadata').name;
              var options = new GeoGitRevertFeatureOptions();
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
              options.commitMessage = $translate('reverted_changes_to_feature',
                  {feature: featureDiffService.feature.id}) + ' ' + $translate('applied_via_maploom');
              options.mergeMessage = options.commitMessage;
              var repoId = featureDiffService.getRepoId();
              geogitService.beginTransaction(repoId).then(function(transaction) {
                transaction.command('revertfeature', options).then(function() {
                  transaction.finalize().then(function() {
                    dialogService.open($translate('undo_successful'), $translate('changes_undone'));
                    scope.undoEnabled = false;
                    historyService.refreshHistory(layerName);
                    mapService.dumpTileCache(layerName);
                  }, function(endTransactionFailure) {
                    if (goog.isObject(endTransactionFailure) &&
                        goog.isDefAndNotNull(endTransactionFailure.conflicts)) {
                      handleConflicts(repoId, endTransactionFailure, transaction,
                          dialogService, conflictService, $translate,
                          $translate('transaction'), $translate('repository'), scope, $translate('transaction'));
                    } else {
                      dialogService.error($translate('error'), $translate('merge_unknown_error'));
                      transaction.abort();
                      scope.cancel();
                      console.log('ERROR: EndTransaction failure: ', endTransactionFailure);
                    }
                  });
                }, function(mergeFailure) {
                  if (goog.isObject(mergeFailure) && goog.isDefAndNotNull(mergeFailure.conflicts)) {
                    handleConflicts(repoId, mergeFailure, transaction,
                        dialogService, conflictService, $translate, branch, $translate('fixed_feature'),
                        scope, $translate('fixed_feature'));
                  } else {
                    dialogService.error($translate('error'), $translate('undo_unknown_error'));
                    transaction.abort();
                    scope.cancel();
                    console.log('ERROR: Revert failure: ', options, mergeFailure);
                  }
                });
              }, function(beginTransactionFailure) {
                dialogService.error($translate('error'), $translate('undo_unknown_error'));
                console.log('ERROR: Begin transaction failure: ', beginTransactionFailure);
                scope.cancel();
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
