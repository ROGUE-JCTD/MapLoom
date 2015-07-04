(function() {

  var module = angular.module('loom_timeline_directive', []);

  module.directive('loomTimeline',
      function($rootScope, timelineService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'timeline/partials/timeline.tpl.html',
          link: function(scope) {
            scope.isPlaying = timelineService.isPlaying;
            scope.timeMin = null;
            scope.timeMax = null;
            scope.timeCurrentPercent = 0;
            scope.timeCurrentPercentToolTip = '';
            scope.timelineService = timelineService;
            scope.getRepeat = timelineService.getRepeat;
            scope.setRepeat = timelineService.setRepeat;

            // activate current time popover
            $('.timeline-slider').popover('hide');

            // Essentially bind the timelineService.currentTime_ to scope.timeCurrentPercent but we have to do a
            // conversion to get the date change to a percent
            scope.$on('timeline-timeupdated', function(event, newTime) {
              var percent = 0;
              if (goog.isDefAndNotNull(newTime)) {
                percent = timelineService.timeToPercent(newTime);
              }
              scope.timeCurrentPercent = percent;
              scope.timeCurrentPercentToolTip = new Date(newTime).toDateString();
              $('.timeline-slider').data('bs.popover').options.content = scope.timeCurrentPercentToolTip;
              if ($('.timeline-slider').parent().is(':visible')) {
                $('.timeline-slider').popover('show');
              }
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
              $('.timeline-slider').popover('show');
              timelineService.start();
            };

            scope.onPause = function() {
              $('.timeline-slider').popover('hide');
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
