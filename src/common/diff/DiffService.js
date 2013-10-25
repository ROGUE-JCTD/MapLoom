(function() {
  var module = angular.module('loom_diff_service', []);

  // Private Variables
  var rootScope = null;

  module.provider('diffService', function() {
    this.adds = [];
    this.modifies = [];
    this.deletes = [];
    this.conflicts = [];
    this.merges = [];
    this.title = 'Diffs';

    this.$get = function($rootScope) {
      rootScope = $rootScope;
      return this;
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
