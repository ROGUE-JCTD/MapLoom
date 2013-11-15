(function() {
  var module = angular.module('loom_conflict_service', []);

  // Private Variables
  var featureDiffService_ = null;
  var diffService_ = null;
  var pulldownService_ = null;
  var service_ = null;
  var mapService_ = null;
  var dialogService_ = null;
  var geogitService_ = null;

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

    this.$get = function($rootScope, $location, diffService, pulldownService,
                         featureDiffService, mapService, dialogService, geogitService) {
      diffService_ = diffService;
      pulldownService_ = pulldownService;
      featureDiffService_ = featureDiffService;
      mapService_ = mapService;
      dialogService_ = dialogService;
      geogitService_ = geogitService;
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

    this.resolveConflict = function(merges) {
      this.currentFeature.resolved = true;
      this.currentFeature.merges = merges;
      diffService_.resolveFeature(this.currentFeature);
    };

    this.beginResolution = function() {
      diffService_.setTitle('Merge Results');
      diffService_.clickCallback = featureClicked;
      diffService_.populate(service_.features, null, service_.ourName, service_.theirName);
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
  });

  function featureClicked(feature) {
    var fid = feature.layer + '/' + feature.feature;
    for (var i = 0; i < service_.features.length; i++) {
      if (fid === service_.features[i].id) {
        featureDiffService_.setFeature(
            service_.features[i], service_.ours, service_.theirs, service_.ancestor, service_.repoId);
        $('#feature-diff-dialog').modal('show');
        service_.currentFeature = service_.features[i];
        break;
      }
    }
  }

  function commitInternal(conflictList, conflictsInError) {
    if (conflictList.length === 0) {
      if (conflictsInError === 0) {
        var commitOptions = new GeoGitCommitOptions();
        commitOptions.all = true;
        commitOptions.message = 'Resolved some conflicts.';
        service_.transaction.command('commit', commitOptions).then(function() {
          // commit successful
          service_.transaction.finalize().then(function() {
            // transaction complete
            diffService_.clearDiff();
            service_.transaction = null;
            service_.abort();
            pulldownService_.defaultMode();
            mapService_.dumpTileCache();
          }, function(endTransactionFailure) {
            if (goog.isObject(endTransactionFailure) &&
                goog.isDefAndNotNull(endTransactionFailure.conflicts)) {
              handleConflicts(endTransactionFailure);
            } else {
              dialogService_.error('Error',
                  'An unknown error occurred when finalizing the transaction.  Please try again.');
              console.log('ERROR: EndTransaction failure: ', endTransactionFailure);
            }
          });
        }, function(reject) {
          // couldn't commit
          dialogService_.error('Error',
              'An unknown error occurred when committing the merge.  Please try again.');
          console.log('ERROR: Failed to commit merge: ', reject);
        });
      } else {
        // couldn't resolve all conflicts
        dialogService_.error('Error',
            'Unable to resolve ' + conflictsInError + ' conflicts.  Please try again.');
        console.log('ERROR: ' + conflictsInError + ' conflicts could not be resolved.');
      }
    } else {
      var conflict = conflictList.pop();

      var resolveConflict = {
        path: conflict.id,
        ours: service_.ours,
        theirs: service_.theirs,
        merges: conflict.merges
      };

      geogitService_.post(service_.repoId, 'repo/mergefeature', resolveConflict).then(function(response) {
        var resolveConflictOptions = new GeoGitResolveConflictOptions();
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

  function handleConflicts(mergeFailure) {
    var myDialog = dialogService_.warn('Merge Conflicts',
        'Some conflicts were encountered when committing the transaction,' +
            ' would you like to resolve these or abort the merge?',
        ['Abort', 'Resolve Conflicts'], false);

    myDialog.then(function(button) {
      switch (button) {
        case 'Abort':
          service_.transaction.abort();
          break;
        case 'Resolve Conflicts':
          service_.ourName = 'Transaction';
          service_.theirName = 'Repository';
          service_.ours = mergeFailure.ours;
          service_.theirs = mergeFailure.theirs;
          service_.ancestor = mergeFailure.ancestor;
          service_.features = mergeFailure.Feature;
          service_.beginResolution();
          break;
      }
    });
  }
}());
