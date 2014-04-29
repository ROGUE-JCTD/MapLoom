(function() {

  var module = angular.module('loom_timeline_directive', []);

  module.directive('loomTimeline',
      function() {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'timeline/partials/timeline.tpl.html',
          link: function(scope) {
            scope.isPlaying = false;

            scope.onPlay = function() {
              scope.isPlaying = true;
            };

            scope.onPause = function() {
              scope.isPlaying = false;
            };
          }
        };
      }
  );
})();
