(function() {

  var module = angular.module('loom_timeline_directive', []);

  var elementSlider_ = null;

  module.directive('loomTimeline',
      function($rootScope, timelineService, $timeout) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'timeline/partials/timeline.tpl.html',
          link: function(scope, element) {
            scope.isPlaying = timelineService.isPlaying;
            scope.timeMin = null;
            scope.timeMax = null;
            scope.timeCurrentPercent = 0;
            scope.timeCurrentPercentToolTip = '';
            scope.timelineService = timelineService;
            scope.getRepeat = timelineService.getRepeat;
            scope.setRepeat = timelineService.setRepeat;
            scope.setFilterByTime = timelineService.setFilterByTime;
            scope.getFilterByTime = timelineService.getFilterByTime;
            scope.show_timeline = true;
            scope.toggleTimeline = function() {
              scope.show_timeline = scope.show_timeline === false ? true : false;

              var element = $('#timeline');

              if (scope.show_timeline) {
                element.show('slow');
              } else {
                element.hide('slow');
              }

            };
            var timeline = null;
            var sliders = element.find('.timeline-slider');
            elementSlider_ = sliders[0];

            // activate current time popover
            sliders.popover('hide');

            // Essentially bind the timelineService.currentTime_ to scope.timeCurrentPercent but we have to do a
            // conversion to get the date change to a percent
            scope.$on('timeline-timeupdated', function(event, newTime) {
              var percent = 0;
              if (goog.isDefAndNotNull(newTime)) {
                percent = timelineService.timeToPercent(newTime);
              }
              scope.timeCurrentPercent = percent;
              scope.timeCurrentPercentToolTip = (new Date(newTime)).toUTCString();
              sliders.data('bs.popover').options.content = scope.timeCurrentPercentToolTip;
              if (timeline != null) {
                var c = new Date(newTime);
                timeline.setCurrentTime(c);

                currentWindow = timeline.getWindow();

                if (c > currentWindow.end || c < currentWindow.start) {
                  timeline.moveTo(c);
                }
              }
              if (sliders.parent().is(':visible')) {
                sliders.popover('show');
              }
            });

            scope.$on('timeline-initialized', function() {

              // Configuration for the Timeline

              var container = document.getElementById('timeline');
              var elements = timelineService.getTimeLineElements();

              var options = timelineService.getTimeLineConfig();

              if (goog.isDefAndNotNull(options)) {
                if (timeline === null) {
                  timeline = new vis.Timeline(container, elements.points, options);
                  timeline.setGroups(elements.groups);
                  timeline.moveTo(new Date());
                } else {
                  timeline.setOptions(options);
                  timeline.setItems(elements.points);
                  timeline.setGroups(elements.groups);
                }
              }

              timeline.on('timechanged', function(properties) {
                console.log(properties);
                timeline.moveTo(timeline.getCustomTime(), {animate: false});
              });

              timeline.on('select', function(properties) {
                timeline.setSelection(properties.items, {focus: true});
              });

              timeline.on('rangechanged', function(properties) {
              });

              timeline.on('rangechange', function(properties) {
              });

              // create the tick marks for the slider
              if (elementSlider_.hasAttribute('min') && elementSlider_.hasAttribute('max') && elementSlider_.hasAttribute('step')) {
                var list = $('#timesliderTickDataList')[0];
                var timelineTicks = timelineService.getTimelineTicks();
                list.innerHTML = '';
                for (var i = 0; i < timelineTicks.length; i++) {
                  list.innerHTML += '<option value=' + Math.round(timelineService.timeToPercent(timelineTicks[i])) + '></option>';
                }
                elementSlider_.parentNode.insertBefore(list, elementSlider_.nextSibling);
              }
              $timeout(function() {
                sliders.popover('show');
                $('.timeline-background2 .popover-content').click(function() {
                  sliders.popover('hide');
                });
              });
            });

            // Essentially bind scope.timeCurrentPercent to timelineService.currentTime_ but convert percent to time
            scope.$watch('timeCurrentPercent', function(newPercent) {
              var time = timelineService.percentToTime(newPercent);
              var currentTime = timelineService.getTimeCurrent();

              // Note: we need to catch a loop where when timelineService.currentTime_ is change by, say, the interval trigger,
              //       we update scope.timeCurrentPercent but when that triggers a change, we don't set timelineService.currentTime_
              //       again
              if (goog.isDefAndNotNull(currentTime) && time !== currentTime) {
                // 'improve' the current percent (meant for when user drags the slider) by snapping to any ticks that are
                // less than one slider step (1%) away
                var closestTick = timelineService.getClosestTick(time, 1);
                if (goog.isDefAndNotNull(closestTick)) {
                  timelineService.setTimeTickIndex(closestTick);
                } else {
                  timelineService.setTimeCurrent(time);
                }
              }

            });

            scope.onPlay = function() {
              timelineService.start();
              sliders.popover('show');
            };

            scope.onPause = function() {
              timelineService.stop();
              sliders.popover('show');
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
