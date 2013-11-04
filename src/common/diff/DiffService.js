(function() {
  var module = angular.module('loom_diff_service', []);

  // Private Variables
  var rootScope = null;
  var service_ = null;

  module.provider('diffService', function() {
    this.adds = [];
    this.modifies = [];
    this.deletes = [];
    this.conflicts = [];
    this.merges = [];
    this.title = 'Diffs';
    this.clickCallback = null;

    this.$get = function($rootScope) {
      rootScope = $rootScope;
      service_ = this;
      return this;
    };

    this.populate = function(_changeList, _repo) {
      service_.adds = [];
      service_.modifies = [];
      service_.deletes = [];
      service_.conflicts = [];
      service_.merges = [];
      if (goog.isDefAndNotNull(_changeList) && goog.isArray(_changeList)) {
        goog.array.forEach(_changeList, function(change) {
          var splitFeature = change.id.split('/');
          var feature = {
            repo: _repo,
            layer: splitFeature[0],
            feature: splitFeature[1]
          };
          switch (change.change) {
            case 'ADDED':
              service_.adds.push(feature);
              break;
            case 'REMOVED':
              service_.deletes.push(feature);
              break;
            case 'MODIFIED':
              service_.modifies.push(feature);
              break;
            case 'CONFLICT':
              service_.conflicts.push(feature);
              break;
            case 'MERGED':
              service_.merges.push(feature);
              break;
          }
        });
      }
      rootScope.$broadcast('diff_performed', _repo);
    };

    this.performDiff = function(repo, from, to) {
      this.adds = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-34f32ac32'}
      ];
      this.modifies = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-ffc2380ba'},
        {repo: 'repo1', layer: 'layer2', feature: 'fid-87291defa'}
      ];
      this.deletes = [
        {repo: 'repo1', layer: 'layer2', feature: 'fid-23cdfa320'}
      ];
      this.merges = [
        {repo: 'repo1', layer: 'layer4', feature: 'fid-aa3426cda'}
      ];
      this.conflicts = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-3487badc0'}
      ];
      rootScope.$broadcast('diff_performed', repo, from, to);
    };

    this.clearDiff = function() {
      this.adds = [];
      this.modifies = [];
      this.deletes = [];
      this.conflicts = [];
      this.merges = [];
      rootScope.$broadcast('diff_cleared');
    };

    this.hasDifferences = function() {
      return (this.adds.length + this.modifies.length + this.deletes.length + this.conflicts.length !== 0);
    };

    this.setTitle = function(title) {
      this.title = title;
    };
  });

}());
