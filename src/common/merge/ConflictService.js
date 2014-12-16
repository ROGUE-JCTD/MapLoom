(function() {
  var module = angular.module('loom_conflict_service', []);

  // Private Variables
  var featureDiffService_ = null;
  var diffService_ = null;
  var pulldownService_ = null;
  var historyService_ = null;
  var service_ = null;
  var mapService_ = null;
  var dialogService_ = null;
  var geogigService_ = null;
  var translate_ = null;
  var configService_ = null;

  module.provider('conflictService', function() {
    this.features = null;
    this.ours = null;
    this.theirs = null;
    this.ancestor = null;
    this.repoId = null;
    this.currentFeature = null;
    this.ourName = null;
    this.theirName = null;
    this.transaction = null;
    this.mergeBranch = null;

    this.$get = function($rootScope, $location, $translate, diffService, pulldownService, configService, historyService,
                         featureDiffService, mapService, dialogService, geogigService) {
      diffService_ = diffService;
      pulldownService_ = pulldownService;
      featureDiffService_ = featureDiffService;
      historyService_ = historyService;
      mapService_ = mapService;
      dialogService_ = dialogService;
      geogigService_ = geogigService;
      translate_ = $translate;
      configService_ = configService;
      service_ = this;
      return this;
    };

    this.abort = function() {
      if (goog.isDefAndNotNull(this.transaction)) {
        this.transaction.abort();
        this.transaction = null;
      }
      this.features = null;
      this.ours = null;
      this.ancestor = null;
      this.repoId = null;
      this.currentFeature = null;
      this.ourName = null;
      this.theirName = null;
    };

    this.selectFeature = function(index) {
      this.currentFeature = this.features[index];
    };

    this.resolveConflict = function(merges, removed) {
      this.currentFeature.resolved = true;
      this.currentFeature.removed = removed;
      this.currentFeature.merges = merges;
      diffService_.resolveFeature(this.currentFeature);
    };

    this.beginResolution = function() {
      if (!goog.isArray(service_.features)) {
        service_.features = [service_.features];
      }
      diffService_.setTitle(translate_.instant('merge_results'));
      diffService_.clickCallback = featureClicked;
      diffService_.mergeDiff = true;
      diffService_.populate(service_.features,
          geogigService_.getRepoById(service_.repoId).name, service_.ourName, service_.theirName);
      pulldownService_.conflictsMode();
    };

    this.commit = function() {
      var conflicts = [];
      var i;
      for (i = 0; i < service_.features.length; i++) {
        var feature = service_.features[i];
        if (feature.change === 'CONFLICT') {
          conflicts.push(feature);
        }
      }

      var conflictsInError = 0;
      commitInternal(conflicts, conflictsInError);
    };

    this.buildMergeMessage = function(status, mergeBranch, useConflicts) {
      var i = 0;
      var layer = null;
      var message = translate_.instant('merged_branch', {'branch': mergeBranch}) + '.';
      if (goog.isDefAndNotNull(status.staged)) {
        var changes = {};
        if (goog.isDefAndNotNull(useConflicts) && useConflicts === true) {
          for (i = 0; i < service_.features.length; i++) {
            var feature = service_.features[i];
            if (feature.change === 'CONFLICT') {
              layer = feature.id.split('/')[0];
              if (!goog.isDefAndNotNull(changes[layer])) {
                changes[layer] = {};
              }
              if (!goog.isDefAndNotNull(changes[layer].conflicted)) {
                changes[layer].conflicted = [];
              }
              changes[layer].conflicted.push(feature.id);
            }
          }
        }

        for (var key in changes) {
          if (changes.hasOwnProperty(key)) {
            message += ' ';
            layer = changes[key];
            message += translate_.instant('conflicts_in', {'layer': key}) + ': ';
            for (i = 0; i < layer.conflicted.length; i++) {
              message += (i > 0 ? ', ' : '') + layer.conflicted[i];
            }
            message += '.';
          }
        }
      }
      message += ' ' + translate_.instant('applied_via_maploom');
      return message;
    };
  });

  function featureClicked(feature) {
    var fid = feature.layer + '/' + feature.feature;
    for (var i = 0; i < service_.features.length; i++) {
      if (fid === service_.features[i].id) {
        featureDiffService_.undoable = false;
        featureDiffService_.leftName = service_.ourName;
        featureDiffService_.rightName = service_.theirName;
        featureDiffService_.setFeature(
            service_.features[i], service_.ours, service_.theirs, service_.ancestor, 'WORK_HEAD', service_.repoId);
        $('#feature-diff-dialog').modal('show');
        service_.currentFeature = service_.features[i];
        break;
      }
    }
  }

  function commitInternal(conflictList, conflictsInError) {
    if (conflictList.length === 0) {
      if (conflictsInError === 0) {
        service_.transaction.command('status').then(function(response) {
          var commitOptions = new GeoGigCommitOptions();
          commitOptions.all = true;
          commitOptions.message = service_.buildMergeMessage(response, service_.mergeBranch, true);
          commitOptions.authorName = configService_.configuration.userprofilename;
          commitOptions.authorEmail = configService_.configuration.userprofileemail;
          service_.transaction.command('commit', commitOptions).then(function() {
            // commit successful
            service_.transaction.finalize().then(function() {
              // transaction complete
              diffService_.clearDiff();
              service_.transaction = null;
              service_.abort();
              pulldownService_.defaultMode();
              historyService_.refreshHistory();
              mapService_.dumpTileCache();
            }, function(endTransactionFailure) {
              if (goog.isObject(endTransactionFailure) &&
                  goog.isDefAndNotNull(endTransactionFailure.conflicts)) {
                handleConflicts(endTransactionFailure);
              } else {
                dialogService_.error(translate_.instant('error'), translate_.instant('conflict_unknown_error'));
                console.log('ERROR: EndTransaction failure: ', endTransactionFailure);
              }
            });
          }, function(reject) {
            // couldn't commit
            dialogService_.error(translate_.instant('error'), translate_.instant('conflict_unknown_error'));
            console.log('ERROR: Failed to commit merge: ', reject);
          });
        }, function(reject) {
        });
      } else {
        // couldn't resolve all conflicts
        dialogService_.error(translate_.instant('error'), translate_.instant('unable_to_resolve_conflicts',
            {value: conflictsInError}));
        console.log('ERROR: ' + conflictsInError + ' conflicts could not be resolved.');
      }
    } else {
      var conflict = conflictList.pop();

      if (goog.isDefAndNotNull(conflict.removed)) {
        var checkoutOptions = new GeoGigCheckoutOptions();
        checkoutOptions.path = conflict.id;
        if (conflict.removed.ours === true) {
          checkoutOptions.ours = true;
        } else {
          checkoutOptions.theirs = true;
        }
        service_.transaction.command('checkout', checkoutOptions).then(function() {
          var addOptions = new GeoGigAddOptions();
          addOptions.path = conflict.id;
          service_.transaction.command('add', addOptions).then(function() {
            // add successful
            commitInternal(conflictList, conflictsInError);
          }, function(reject) {
            commitInternal(conflictList, conflictsInError + 1);
            console.log('ERROR: Failed to add resolved conflicts to the tree: ', conflict, reject);
          });
        }, function(reject) {
          commitInternal(conflictList, conflictsInError + 1);
          console.log('ERROR: Failed to checkout conflicted feature: ', conflict, reject);
        });

      } else {
        var merges = $.extend(true, {}, conflict.merges);
        var schema = null;
        var repoName = geogigService_.getRepoById(service_.repoId).name;
        mapService_.map.getLayers().forEach(function(layer) {
          var metadata = layer.get('metadata');
          if (goog.isDefAndNotNull(metadata)) {
            if (goog.isDefAndNotNull(metadata.geogigStore) && metadata.geogigStore === repoName) {
              var splitFeature = conflict.id.split('/');
              if (goog.isDefAndNotNull(metadata.nativeName) && metadata.nativeName === splitFeature[0]) {
                if (goog.isDefAndNotNull(layer.get('metadata').schema)) {
                  schema = layer.get('metadata').schema;
                }
              }
            }
          }
        });
        for (var attr in merges) {
          if (goog.isDefAndNotNull(merges[attr].value) && goog.isDefAndNotNull(schema)) {
            if (schema[attr]._type == 'xsd:dateTime') {
              merges[attr].value = new Date(merges[attr].value).getTime();
            }
          }
        }

        var resolveConflict = {
          path: conflict.id,
          ours: service_.ours,
          theirs: service_.theirs,
          merges: merges
        };

        geogigService_.post(service_.repoId, 'repo/mergefeature', resolveConflict).then(function(response) {
          var resolveConflictOptions = new GeoGigResolveConflictOptions();
          resolveConflictOptions.path = conflict.id;
          resolveConflictOptions.objectid = response.data;
          service_.transaction.command('resolveconflict', resolveConflictOptions).then(function() {
            // success
            commitInternal(conflictList, conflictsInError);
          }, function(reject) {
            commitInternal(conflictList, conflictsInError + 1);
            console.log('ERROR: Failed to resolve the conflict: ', conflict, reject);
          });
        }, function(reject) {
          commitInternal(conflictList, conflictsInError + 1);
          console.log('ERROR: Failed to merge the conflicted feature: ', conflict, reject);
        });
      }
    }
  }

  function handleConflicts(mergeFailure) {
    var myDialog = dialogService_.warn(translate_.instant('merge_conflicts'),
        translate_.instant('conflicts_encountered'),
        [translate_.instant('abort'), translate_.instant('resolve_conflicts')], false);

    myDialog.then(function(button) {
      switch (button) {
        case 0:
          service_.transaction.abort();
          break;
        case 1:
          service_.ourName = translate_.instant('transaction');
          service_.theirName = translate_.instant('repository');
          service_.ours = mergeFailure.ours;
          service_.theirs = mergeFailure.theirs;
          service_.ancestor = mergeFailure.ancestor;
          service_.features = mergeFailure.Feature;
          service_.mergeBranch = translate_.instant('transaction');
          service_.beginResolution();
          break;
      }
    });
  }
}());
