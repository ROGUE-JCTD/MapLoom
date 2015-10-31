(function() {
  var module = angular.module('loom_timeline_service', []);

  var service_ = null;
  var mapService_ = null;
  var timelineTicks_ = null;
  var currentTickIndex_ = null;
  var currentTime_ = null;
  var interval_ = null;
  var intervalPromise_ = null;
  var rootScope_ = null;
  var repeat_ = true;
  var filterByTime_ = true;
  var featureManagerService_ = null;

  module.provider('timelineService', function() {
    // public variable can be placed on scope
    this.hasLayerWithTime = false;

    this.$get = function(mapService, $interval, $rootScope, featureManagerService) {
      service_ = this;
      mapService_ = mapService;
      interval_ = $interval;
      rootScope_ = $rootScope;
      featureManagerService_ = featureManagerService;

      // when a layer is added, reinitialize the service.
      $rootScope.$on('layer-added', function(event, layer) {
        console.log('----[ timelineService, layer added. initializing');
        service_.initialize();
      });

      // when a layer is removed, reinitialize the service.
      $rootScope.$on('layerRemoved', function(event, layer) {
        console.log('----[ timelineService, layer removed. initializing');
        service_.initialize();
      });

      return service_;
    };

    this.initialize = function() {
      // TODO: only re-init if list of layers time enabled layers change.
      var uniqueTicks = {};
      var layersWithTime = 0;

      var layers = mapService_.getLayers(true, true);
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var metadata = layer.get('metadata');
        if (goog.isDefAndNotNull(metadata)) {
          var timeDimension = service_.getTimeDimension(layers[i]);
          if (goog.isDefAndNotNull(timeDimension)) {
            layersWithTime++;
            metadata.timeline = true;
            metadata.timelineTicks = timeDimension;

            for (var j = 0; j < timeDimension.length; j++) {
              if (goog.isDefAndNotNull(uniqueTicks[timeDimension])) {
                uniqueTicks[timeDimension[j]] += 1;
              } else {
                uniqueTicks[timeDimension[j]] = 1;
              }
            }
          }
        }
      }

      if (layersWithTime > 0) {
        rootScope_.timelineServiceEnabled = true;
        mapService_.showTimeline(true);
      } else {
        rootScope_.timelineServiceEnabled = false;
        mapService_.showTimeline(false);
      }

      timelineTicks_ = Object.keys(uniqueTicks);
      if (timelineTicks_.length > 0) {
        timelineTicks_.sort();
        service_.setTimeTickIndex(0);
      }

      rootScope_.$broadcast('timeline-initialized');
    };

    this.getFilterByTime = function() {
      return filterByTime_;
    };

    this.setFilterByTime = function(filterByTime) {
      if (goog.isDefAndNotNull(filterByTime) && filterByTime === true) {
        filterByTime_ = true;
        service_.updateLayersTimes(currentTickIndex_);
      } else {
        filterByTime_ = false;
        service_.updateLayersTimes();
      }
    };

    this.getRepeat = function() {
      return repeat_;
    };

    this.isPlaying = function() {
      if (goog.isDefAndNotNull(intervalPromise_)) {
        return true;
      }
      return false;
    };

    this.setRepeat = function(repeat) {
      if (goog.isDefAndNotNull(repeat) && repeat === true) {
        repeat_ = true;
      } else {
        repeat_ = false;
      }
    };

    this.start = function() {
      service_.stop();
      intervalPromise_ = interval_(function() {
        var success = service_.setTimeNextTick();
        // cancel interval if reached end of ticks
        if (success === false) {
          interval_.cancel(intervalPromise_);
          intervalPromise_ = null;
        }
      }, 1000);
    };

    this.stop = function() {
      if (goog.isDefAndNotNull(intervalPromise_)) {
        interval_.cancel(intervalPromise_);
        intervalPromise_ = null;
      }
    };

    this.getTimelineTicks = function() {
      return timelineTicks_;
    };

    this.timeToTick = function(time) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0 || !goog.isDefAndNotNull(time)) {
        return null;
      }
      var timeStr = (new Date(time)).toISOString();
      var index = null;

      //TODO: use binary search and consider caching time objects on timeline.initialize instead of string compare
      if (timelineTicks_[timelineTicks_.length - 1] === timeStr) {
        index = timelineTicks_.length - 1;
      } else {
        for (var j = 1; j < timelineTicks_.length; j++) {
          if (timeStr < timelineTicks_[j]) {
            index = j - 1;
            break;
          }
        }
      }

      if (!goog.isDefAndNotNull(index)) {
        console.log('====[ ERROR: timeToTick could not find tick for the provided time: ', timeStr, ', min: ', timelineTicks_[0], ', max: ', timelineTicks_[timelineTicks_.length - 1]);
      }

      return index;
    };

    this.getClosestTick = function(time, maxPercentAway) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0 || !goog.isDefAndNotNull(time)) {
        return null;
      }

      // get the logical tick that corresponds to time. Then see if time is closer to its next tick or the tick itself
      // once we know which tick is closest, make sure it is less than maxPercentAway
      var index = service_.timeToTick(time);
      if (goog.isDefAndNotNull(index)) {
        var tickDist = time - Date.parse(timelineTicks_[index]);
        // assume index is closest one until we prove otherwise
        var closestIndex = index;
        var closestDist = tickDist;
        if (index + 1 < timelineTicks_.length) {
          var tickAfterDist = Date.parse(timelineTicks_[index + 1]) - time;
          if (tickAfterDist < tickDist) {
            closestIndex = index + 1;
            closestDist = tickAfterDist;
          }
        }
        var min = Date.parse(timelineTicks_[0]);
        var max = Date.parse(timelineTicks_[timelineTicks_.length - 1]);
        var maxTimeAway = (maxPercentAway * 0.01) * (max - min);
        if (closestDist < maxTimeAway) {
          index = closestIndex;
        } else {
          index = null;
        }
      }

      return index;
    };

    this.setTimeCurrent = function(time) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return;
      }
      var index = service_.timeToTick(time);
      service_.setTimeTickIndex(index, time);
    };

    this.getTimeCurrent = function(asDateObject) {
      if (goog.isDefAndNotNull(asDateObject) && asDateObject) {
        return new Date(asDateObject);
      }
      return currentTime_;
    };

    this.getTimeMin = function() {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return null;
      }
      return Date.parse(timelineTicks_[0]);
    };

    this.getTimeMax = function() {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return null;
      }
      return Date.parse(timelineTicks_[timelineTicks_.length - 1]);
    };

    this.getTimeFromTick = function(index) {
      if (!goog.isDefAndNotNull(timelineTicks_) || index >= timelineTicks_.length || index < 0) {
        return null;
      }

      return Date.parse(timelineTicks_[index]);
    };

    this.setTimeTickIndex = function(index, time) {
      if (!goog.isDefAndNotNull(timelineTicks_) || index >= timelineTicks_.length || index < 0) {
        return;
      }

      if (goog.isDefAndNotNull(time)) {
        var timeStr = (new Date(time)).toISOString();
        var timeValid = false;
        if (timeStr >= timelineTicks_[index]) {
          if (index + 1 < timelineTicks_.length) {
            if (timeStr < timelineTicks_[index + 1]) {
              timeValid = true;
            }
          } else {
            timeValid = true;
          }
        }

        if (timeValid === false) {
          console.log('----[ Warning: setTimeTickIndex called with time that is not withing range of the provided index. ignoring time.', index, time);
          time = null;
        }
      }

      if (goog.isDefAndNotNull(index)) {
        currentTickIndex_ = index;
        if (goog.isDefAndNotNull(time)) {
          currentTime_ = time;
        } else {
          currentTime_ = Date.parse(timelineTicks_[currentTickIndex_]);
        }
        service_.updateLayersTimes(currentTickIndex_);
      } else {
        currentTime_ = null;
        currentTickIndex_ = null;
      }

      featureManagerService_.hide();

      console.log('---- timelineService.time updated: ', (new Date(currentTime_)).toISOString());
      rootScope_.$broadcast('timeline-timeupdated', currentTime_);
    };

    this.setTimeNextTick = function() {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return;
      }
      var success = true;
      if (goog.isDefAndNotNull(currentTickIndex_)) {
        if (currentTickIndex_ + 1 < timelineTicks_.length) {
          service_.setTimeTickIndex(currentTickIndex_ + 1);
        } else {
          if (repeat_) {
            service_.setTimeTickIndex(0);
          } else {
            success = false;
          }
        }
      }
      return success;
    };

    this.setTimePrevTick = function() {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return;
      }

      if (goog.isDefAndNotNull(currentTickIndex_)) {
        if (currentTickIndex_ - 1 >= 0) {
          service_.setTimeTickIndex(currentTickIndex_ - 1);
        } else {
          if (repeat_) {
            service_.setTimeTickIndex(timelineTicks_.length - 1);
          }
        }
      }
    };

    // only set layer time based on ticks to avoid generating a lot of requests for times that
    // do not have data associated with them
    this.updateLayersTimes = function(tickIndex) {
      // TODO: skipping hidden layers. listen for when a layer is made visible, to force a refresh
      var layers = mapService_.getLayers(false, true);
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var metadata = layer.get('metadata');
        if (goog.isDefAndNotNull(metadata) && metadata.timeline === true) {
          var source = layer.getSource();
          if (goog.isDefAndNotNull(source)) {
            if (goog.isDefAndNotNull(source.updateParams)) {
              if (filterByTime_) {
                if (goog.isDefAndNotNull(timelineTicks_) && tickIndex < timelineTicks_.length && tickIndex >= 0) {
                  source.updateParams({
                    TIME: timelineTicks_[tickIndex]
                  });
                }
              } else {
                source.updateParams({
                  TIME: '-99999999999-01-01T00:00:00.0Z/99999999999-01-01T00:00:00.0Z'
                });
              }
            }
          }
        }
      }
    };

    this.getTimeDimension = function(layer) {
      var timeDimension = null;
      if (goog.isDefAndNotNull(layer)) {
        var metadata = layer.get('metadata');
        if (goog.isDefAndNotNull(metadata) && goog.isDefAndNotNull(metadata.dimensions)) {
          for (var index = 0; index < metadata.dimensions.length; index++) {
            var dimension = metadata.dimensions[index];
            if (dimension.name === 'time') {
              if (dimension.values.length === 0) {
                //  layer with list of times but no entries in it. can happen when creating a new empty layer
                timeDimension = [];
              } else if (dimension.values.indexOf(',') !== -1) {
                timeDimension = dimension.values.split(',');
              } else if (dimension.values.indexOf('/') !== -1) {
                //TODO: generate an entry using start..stop interval etc
                timeDimension = [];
                console.log('====[[ time interval not supported yet');
              }
              break;
            }
          }
        }
      }
      return timeDimension;
    };

    this.percentToTime = function(percent) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return null;
      }
      var min = Date.parse(timelineTicks_[0]);
      var max = Date.parse(timelineTicks_[timelineTicks_.length - 1]);
      return Math.round((percent * 0.01) * (max - min) + min);
    };

    this.timeToPercent = function(time) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return null;
      }
      var min = Date.parse(timelineTicks_[0]);
      var max = Date.parse(timelineTicks_[timelineTicks_.length - 1]);
      return ((time - min) / (max - min)) * 100;
    };
  });

}());
