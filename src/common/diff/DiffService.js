(function() {
  var module = angular.module('loom_diff_service', []);

  // Private Variables
  var adds = [];
  var modifies = [];
  var deletes = [];
  var rootScope = null;

  module.provider('diffService', function() {
    this.$get = function($rootScope) {
      rootScope = $rootScope;
      return this;
    };

    this.getAdds = function() {
      return adds;
    };

    this.getModifies = function() {
      return modifies;
    };

    this.getDeletes = function() {
      return deletes;
    };

    this.performDiff = function(repo, from, to) {
      adds = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-34f32ac32'}
      ];
      modifies = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-ffc2380ba'},
        {repo: 'repo1', layer: 'layer2', feature: 'fid-87291defa'}
      ];
      deletes = [
        {repo: 'repo1', layer: 'layer2', feature: 'fid-23cdfa320'}
      ];
      rootScope.$broadcast('diff_performed', repo, from, to);
    };

    this.clearDiff = function() {
      adds = [];
      modifies = [];
      deletes = [];
      rootScope.$broadcast('diff_cleared');
    };

    this.hasDifferences = function() {
      return (adds.length + modifies.length + deletes.length !== 0);
    };
  });

}());
