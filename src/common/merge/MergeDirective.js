(function() {

  var module = angular.module('loom_merge_directive', []);

  module.directive('loomMerge',
      function(geogitService) {
        return {
          templateUrl: 'merge/partials/merge.tpl.html',
          link: function(scope) {
            scope.geogitService = geogitService;
          }
        };
      }
  );
})();
