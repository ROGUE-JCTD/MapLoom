(function() {

  var module = angular.module('loom_timeline_directive', []);

  module.directive('loomTimeline',
      function($rootScope, timelineService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'timeline/partials/timeline.tpl.html',
          link: function(scope) {
            scope.isPlaying = false;
            scope.timeMin = null;
            scope.timeMax = null;
            scope.timeCurrentPercent = 0;
            scope.timelineService = timelineService;

            // Essentially bind the timelineService.currentTime_ to scope.timeCurrentPercent but we have to do a
            // conversion to get the date change to a percent
            scope.$on('timeline-timeupdated', function(event, newTime) {
              var percent = 0;
              if (goog.isDefAndNotNull(newTime)) {
                percent = timelineService.timeToPercent(newTime);
              }
              scope.timeCurrentPercent = percent;
            });

            // Essentially bind scope.timeCurrentPercent to timelineService.currentTime_ but convert percent to time
            scope.$watch('timeCurrentPercent', function(newPercent) {
              var time = timelineService.percentToTime(newPercent);
              var currentTime = timelineService.getTimeCurrent();

              // Note: we need to catch a loop where when timelineService.currentTime_ is change by, say, the interval trigger,
              //       we update scope.timeCurrentPercent but when that triggers a change, we don't set timelineService.currentTime_
              //       again
              if (goog.isDefAndNotNull(currentTime) && time !== currentTime) {
                timelineService.setTimeCurrent(time);
              }
            });

            scope.onPlay = function() {
              scope.isPlaying = true;
              timelineService.start();
            };

            scope.onPause = function() {
              scope.isPlaying = false;
              timelineService.stop();
            };

            scope.onNextTick = function() {
              timelineService.setTimeNextTick();
            };

            scope.onPrevTick = function() {
              timelineService.setTimePrevTick();
            };
          }
        };
      }
  );
})();
