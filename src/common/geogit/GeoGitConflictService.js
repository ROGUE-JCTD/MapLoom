(function() {
  var module = angular.module('loom_geogit_conflict_service', []);

  // services
  var rootScope_, geogitService_, diffService_, dialogService_;

  var service_ = null;

  module.provider('geogitConflictService', function() {

    this.ours = null;
    this.theirs = null;
    this.ancestor = null;
    this.numConflicts = null;
    this.features = null;

    this.$get = function($rootScope, geogitService, diffService, dialogService) {
      service_ = this;
      rootScope_ = $rootScope;
      geogitService_ = geogitService;
      diffService_ = diffService;
      dialogService_ = dialogService;
      if (rootScope_ && geogitService_ && diffService_) {

      }
      return this;
    };

    this.beginConflictResolution = function(mergeReport) {
      service_.ours = mergeReport.ours;
      service_.theirs = mergeReport.theirs;
      service_.ancestor = mergeReport.ancestor;
      service_.numConflicts = mergeReport.conflicts;
      service_.features = mergeReport.Feature;

      // Loop through features and add them to the Diff Service
      goog.array.forEach(features, function(element) {
        switch (element.type) {
          case 'ADD': break;
          case 'MODIFY': break;
          case 'DELETE': break;
          case 'MERGED': break;
          case 'CONFLICT': break;
        }
      });

      dialogService_.warn(
          'Conflicts', 'There are' + service_.numConflicts + 'conflicts that need to be resolved before continuing.');
    };
  });

}());
