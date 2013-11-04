(function() {
  var module = angular.module('loom_conflict_service', []);

  // Private Variables
  var featureDiffService_ = null;
  var diffService_ = null;
  var pulldownService_ = null;
  var service_ = null;

  module.provider('conflictService', function() {
    this.features = null;
    this.ours = null;
    this.theirs = null;
    this.ancestor = null;
    this.repoId = null;
    this.currentFeature = null;

    this.$get = function($rootScope, $location, diffService, pulldownService, featureDiffService) {
      diffService_ = diffService;
      pulldownService_ = pulldownService;
      featureDiffService_ = featureDiffService;
      service_ = this;
      return this;
    };

    this.selectFeature = function(index) {
      currentFeature = this.features[index];
    };

    this.resolveConflict = function(index) {
      currentFeature.resolved = true;
    };

    this.beginResolution = function() {
      diffService_.setTitle('Merge Results');
      diffService_.clickCallback = featureClicked;
      diffService_.populate(service_.features);
      pulldownService_.conflictsMode();
    };
  });

  function featureClicked(feature) {
    var fid = feature.layer + '/' + feature.feature;
    for (var i = 0; i < service_.features.length; i++) {
      if (fid === service_.features[i].id) {
        featureDiffService_.setFeature(service_.features[i]);
        featureDiffService_.ours = service_.ours;
        featureDiffService_.theirs = service_.theirs;
        featureDiffService_.ancestor = service_.ancestor;
        featureDiffService_.repoId = service_.repoId;
        $('#feature-diff-dialog').modal('show');
        service_.currentFeature = i;
        break;
      }
    }
  }
}());
