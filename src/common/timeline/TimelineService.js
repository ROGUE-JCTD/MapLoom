(function() {
  var module = angular.module('loom_timeline_service', []);
  var stutils = storytools.core.time.utils;
  var service_ = null;
  var mapService_ = null;
  var boxService_ = null;
  var pinService_ = null;
  var timelineTicks_ = null;
  var currentTickIndex_ = null;
  var currentTime_ = null;
  var timelineTicksMap_ = null;
  var interval_ = null;
  var intervalPromise_ = null;
  var rootScope_ = null;
  var repeat_ = true;
  var filterByTime_ = true;
  var featureManagerService_ = null;
  var boxes_ = [];
  var pins_ = [];
  var timelinePointsList = [];
  var timelineGroupsList_ = [];
  var range_ = new stutils.Range(null, null);
  var filter_ = null;
  var pinsForMap_ = [];
  var showingPin = false;

  function computeTicks(layersWithTime) {

    var ticks = {};
    var totalRange = null;
    var intervals = [];
    function addTick(add) {
      add = stutils.getTime(add);
      if (add !== null && ! (add in ticks)) {
        ticks[add] = 1;
      }
    }
    layersWithTime.forEach(function(l) {
      var times = service_.getTimeDimension(l);
      var range;
      if (angular.isArray(times)) {
        // an array of instants or extents
        range = stutils.computeRange(times);
        if (range.isEmpty() !== true && range.end == range.start) {
          range.end += 1;
        }
        if (times.length) {
          if (stutils.isRangeLike(times[0])) {
            times.forEach(function(r) {
              addTick(r.start);
              if (totalRange === null) {
                totalRange = stutils.createRange(r);
              } else {
                totalRange.extend(r);
              }
            });
          } else {
            times.forEach(function(r) {
              addTick(r);
            });
          }
        }
        // add a tick at the end to ensure we get there
        /*jshint eqnull:true */
        if (range.end != null) {
          addTick(range.end);
        }
      } else if (times) {
        // a interval (range+duration)
        range = times;
        intervals.push(times);
      }
      if (totalRange === null) {
        // copy, will be modifying
        totalRange = stutils.createRange(range);
      } else {
        totalRange.extend(range);
      }
    });
    if (intervals.length) {
      intervals.sort(function(a, b) {
        return a.interval - b.interval;
      });
      var smallest = intervals[0];
      var start = totalRange.start;
      while (start <= totalRange.end) {
        addTick(start);
        start = smallest.offset(start);
      }
    }

    for (var iPin = 0; iPin < pinsForMap_.length; iPin += 1) {
      var pin = pinsForMap_[iPin];
      addTick(pin.start_time);
      addTick(pin.end_time);
    }

    ticks = Object.getOwnPropertyNames(ticks).map(function(t) {
      return parseInt(t, 10);
    });
    return ticks.sort(function(a, b) {
      return a - b;
    });
  }

  module.service('TimeMachine', function() {
    return {
      computeTicks: computeTicks
    };
  });

  module.provider('timelineService', function() {
    // public variable can be placed on scope
    this.hasLayerWithTime = false;

    this.$get = function(mapService, boxService, pinService, $interval, $rootScope, $filter, featureManagerService) {
      service_ = this;
      mapService_ = mapService;
      boxService_ = boxService;
      pinService_ = pinService;
      interval_ = $interval;
      rootScope_ = $rootScope;
      featureManagerService_ = featureManagerService;
      filter_ = $filter;

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

      // when a box is added, reinitialize the service.
      $rootScope.$on('box-added', function(event, chapter_index) {
        console.log('----[ timelineService, box added. initializing');
        boxes_ = boxService_.getBoxes(chapter_index);
        service_.initialize();
      });

      // when a box is removed, reinitialize the service.
      $rootScope.$on('box-removed', function(event, chapter_index) {
        console.log('----[ timelineService, box removed. initializing');
        boxes_ = boxService_.getBoxes(chapter_index);
        service_.initialize();
      });

      $rootScope.$on('startFeatureInsert', function(event) {
        if (service_.isPlaying()) {
          service_.stop();
        }
      });

      $rootScope.$on('begin-edit', function(event) {
        if (service_.isPlaying()) {
          service_.stop();
        }
      });

      $rootScope.$on('chapter-switch', function(event, chapter_index) {
        console.log('----[ timelineService, chapter switch. initializing', chapter_index);
        boxes_ = boxService_.getBoxes(chapter_index);
        pins_ = pinService_.getPins(chapter_index);
        pinsForMap_ = $filter('filter')(pins_, { values_: {in_map: true} });
        if (service_.isPlaying()) {
          service_.stop();
        }
        service_.initialize();
      });

      $rootScope.$on('chapter-added', function(event, chapter_index) {
        console.log('----[ timelineService, chapter add. initializing', chapter_index);
        boxes_ = boxService_.getBoxes(chapter_index);
        pins_ = pinService_.getPins(chapter_index);
        service_.initialize();
      });

      $rootScope.$on('pin-added', function(event, chapter_index) {
        console.log('----[ timelineService, pin added. initializing');
        pins_ = pinService_.getPins(chapter_index);
        mapService_.map.removeLayer(mapService_.pinLayer);
        pinsForMap_ = $filter('filter')(pins_, { values_: {in_map: true} });
        service_.initialize();
      });

      $rootScope.$on('pin-removed', function(event, chapter_index) {
        console.log('----[ timelineService, pin removed. initializing');
        pins_ = pinService_.getPins(chapter_index);
        pinsForMap_ = $filter('filter')(pins_, { values_: {in_map: true} });
        service_.initialize();
        if (pinsForMap_.length === 0) {
          mapService_.map.removeLayer(mapService_.pinLayer);
        }
      });

      $rootScope.$on('endFeatureInsert', function(event, save, layer, newFeature) {
        if (goog.isDefAndNotNull(save) && save === true && goog.isDefAndNotNull(layer) && goog.isDefAndNotNull(newFeature)) {
          var metadata = layer.get('metadata');
          var timeDimension = service_.getTimeDimension(layer);
          var addedTick = false;
          var newTick = null;
          var newDate = null;
          //Only add a tick on time enabled layers
          var numDates = 0;
          var firstDate = null;
          if (goog.isDefAndNotNull(timeDimension)) {
            for (var property in newFeature.properties) {
              var test = newFeature.properties[property];
              var type = typeof(test);
              //Date properties are passed via string representation
              if (type === 'string' && stutils.getTime(test) != null) {
                numDates += 1;
                if (firstDate === null) {
                  firstDate = test;
                }
              }
            }
            if (numDates > 0) {
              //Need to add a tick somehow
              if (numDates === 1) {
                newDate = firstDate;
                newTick = stutils.getTime(newDate);
                if (newTick !== null && !(newTick in timelineTicksMap_)) {
                  timelineTicksMap_[newTick] = 1;
                  addedTick = true;
                }
              } else {
                //TODO: Need to make admin geoserver request and add resulting tick from there.

              }
              if (!goog.isDefAndNotNull(metadata.timelineTicks)) {
                metadata.timelineTicks = [newDate];
              } else {
                metadata.timelineTicks.push(newDate);
              }
              if (addedTick === true) {
                timelineTicks_ = Object.getOwnPropertyNames(timelineTicksMap_).map(function(t) {
                  return parseInt(t, 10);
                });
                if (timelineTicks_.length > 0) {
                  timelineTicks_ = timelineTicks_.sort(function(a, b) {
                    return a - b;
                  });
                  var index = service_.timeToTick(currentTime_);
                  service_.setTimeTickIndex(index);
                }
                rootScope_.$broadcast('timeline-initialized');
              }
            }

          }

        }

      });

      // when a feature of a layer is edited, if the value of the attribute used as the time dimension changes,
      // we need to update the tick marks on the timeline and perhaps set current time to the new time.
      //
      // However, there is a problem. getCapabilities only returns whether there is a time dimension and if so, the values
      // of the time dimension. It doesn't specify which attribute of the layer was used to derive the time dimension.
      // To get the name of the attribute that was used to generate the time dimension, we need to use the rest endpoint
      // which is an admin-only endpoint.
      // rest enpoint where the attribute name can be found (when admin):
      // http:.../geoserver/rest/workspaces/<workspaces>/datastores/<datastore>/featuretypes/<layerName>.json
      //
      // another problem is firing another get capability every time a feature is edited.
      // okay workaround for now is to add a tick mark when *any* date attribute of the feature changes so long as the
      // old value was in the timeline values. This leaves the possibility of more ticks being added than should be but
      // they will will be temporary and when the map is reloaded, any potentially extra/'wrong' ticks will not be there
      // and new proper ones will be there.
      $rootScope.$on('endAttributeEdit', function(event, save, layer, changedAttributesNew, changedAttributesOld) {
        if (goog.isDefAndNotNull(save) && save === true) {
          var metadata = layer.get('metadata');
          var ticksChanged = false;
          var i = 0;
          var attributeType = '';

          //TODO: if the old time tick is not found, then attr must have not been used to generate time dimension.
          //      dont add tick!
          // remove old tick marks if changes to the feature doesn't leave any feature for that time slice.
          var foundOldTick = false;
          for (i = 0; i < changedAttributesOld.length; i++) {
            attributeType = metadata.schema[changedAttributesOld[i][0]]._type.toLowerCase();
            if (attributeType.indexOf('date') !== -1 || attributeType.indexOf('time') !== -1) {
              if (changedAttributesOld[i][1] in timelineTicksMap_) {
                foundOldTick = true;
                if (timelineTicksMap_[changedAttributesOld[i][1]] > 1) {
                  timelineTicksMap_[changedAttributesOld[i][1]] -= 1;
                } else {
                  ticksChanged = true;
                  delete timelineTicksMap_[changedAttributesOld[i][1]];
                }
              }
            }
          }

          // if no old tick mark found for this time change, do not add a new tick mark as it must have not been for the
          // attribute that was originally used to create
          if (foundOldTick === true) {
            // add new tick marks
            for (i = 0; i < changedAttributesNew.length; i++) {
              attributeType = metadata.schema[changedAttributesNew[i][0]]._type.toLowerCase();
              if (attributeType.indexOf('date') !== -1 || attributeType.indexOf('time') !== -1) {
                if (changedAttributesNew[i][1] in timelineTicksMap_) {
                  timelineTicksMap_[changedAttributesNew[i][1]] += 1;
                } else {
                  timelineTicksMap_[changedAttributesNew[i][1]] = 1;
                  ticksChanged = true;
                }
              }
            }
          }


          if (ticksChanged === true) {
            timelineTicks_ = Object.getOwnPropertyNames(timelineTicksMap_).map(function(t) {
              return parseInt(t, 10);
            });
            if (timelineTicks_.length > 0) {
              timelineTicks_.sort();

              // use what the timeline's time was. changing to the updated time of feature can be problematic because
              // we dont know for sure if the field being changed was used to generate the time dimension.
              var index = service_.timeToTick(currentTime_);
              service_.setTimeTickIndex(index);
            }
            rootScope_.$broadcast('timeline-initialized');
          }
        }
      });

      return service_;
    };

    this.initialize = function() {
      // TODO: only re-init if list of layers time enabled layers change.
      timelineTicksMap_ = {};
      var layersWithTime = 0;
      var layersWithTimeList = [];
      timelineGroupsList_ = [];

      var layers = mapService_.getLayers(true, true);
      timelinePointsList = [];
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var metadata = layer.get('metadata');
        if (goog.isDefAndNotNull(metadata)) {
          var timeDimension = service_.getTimeDimension(layer);
          if (goog.isDefAndNotNull(timeDimension)) {
            timelineGroupsList_.push({id: metadata.uniqueID, content: metadata.title});

            layersWithTime++;
            metadata.timeline = true;
            metadata.timelineTicks = timeDimension;
            layersWithTimeList.push(layer);

            for (var j = 0; j < timeDimension.length; j++) {
              var time = stutils.getTime(timeDimension[j]);
              if (goog.isDefAndNotNull(timelineTicksMap_[time])) {
                timelineTicksMap_[time] += 1;
              } else {
                timelineTicksMap_[time] = 1;
              }
            }
          }
        }
      }

      timelineTicks_ = computeTicks(layersWithTimeList);

      if (boxes_.length > 0) {
        for (var c = 0; c < boxes_.length; c++) {
          var box_range = stutils.createRange(boxes_[c].start_time, boxes_[c].end_time);
          console.log('----[ Info: Box Range ', box_range.toString());
          range_.extend(box_range);
          console.log('----[ Info: Total Range ', range_.toString());
          timelinePointsList.push({
            id: 'sb' + c,
            content: boxes_[c].title,
            start: (new Date(boxes_[c].start_time)).toISOString(),
            end: (new Date(boxes_[c].end_time)).toISOString(),
            type: 'background'
          });
        }
      } else {
        range_ = stutils.createRange(timelineTicks_[0], timelineTicks_[timelineTicks_.length - 1]);
      }

      var pinsForTimeline = filter_('filter')(pins_, { values_: {in_timeline: true} });

      if (pinsForTimeline.length > 0) {
        for (var iPin = 0; iPin < pinsForTimeline.length; iPin++) {
          var pin_range = stutils.createRange(pinsForTimeline[iPin].start_time, pinsForTimeline[iPin].end_time);
          console.log('----[ Info: Pin Range ', pin_range.toString());
          console.log('----[ Info: Total Range ', range_.toString());
          timelinePointsList.push({
            id: 'sp' + iPin,
            content: pinsForTimeline[iPin].title,
            start: (new Date(pinsForTimeline[iPin].start_time)).toISOString(),
            end: (new Date(pinsForTimeline[iPin].end_time)).toISOString(),
            type: 'background'
          });
        }
      }

      if (layersWithTime > 0 || boxes_.length > 0 || pinsForTimeline.length > 0) {
        rootScope_.timelineServiceEnabled = true;
        mapService_.showTimeline(true);
      } else {
        rootScope_.timelineServiceEnabled = false;
        mapService_.showTimeline(false);
      }

      if (timelineTicks_.length > 0) {
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
      } else {
        filterByTime_ = false;
      }
      service_.updateLayersTimes({ start: timelineTicks_[0], end: timelineTicks_[currentTickIndex_]});
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

    this.getTimeLineElements = function() {
      var elements = {
        'points': new vis.DataSet(timelinePointsList),
        'groups': new vis.DataSet(timelineGroupsList_)
      };

      return elements;
    };

    this.getTimeLineConfig = function() {
      var config = {
        min: range_.start || 0,
        max: range_.end || 0,
        start: range_.start || 0,
        end: range_.end || 0,
        height: 138,
        maxHeight: 138
      };
      return config;
    };

    this.getTimelineTicks = function() {
      return timelineTicks_;
    };

    this.timeToTick = function(time) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0 || !goog.isDefAndNotNull(time)) {
        return null;
      }
      var index = null;

      //TODO: use binary search and consider caching time objects on timeline.initialize instead of string compare
      if (timelineTicks_[timelineTicks_.length - 1] === time) {
        index = timelineTicks_.length - 1;
      } else {
        for (var j = 1; j < timelineTicks_.length; j++) {
          if (time < timelineTicks_[j]) {
            index = j - 1;
            break;
          }
        }
      }

      if (!goog.isDefAndNotNull(index)) {
        console.log('====[ ERROR: timeToTick could not find tick for the provided time: ', time, ', min: ', timelineTicks_[0], ', max: ', timelineTicks_[timelineTicks_.length - 1]);
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
        var min = timelineTicks_[0];
        var max = timelineTicks_[timelineTicks_.length - 1];
        var maxTimeAway = (maxPercentAway * 0.01) * (max - min);
        if (closestDist < maxTimeAway) {
          index = closestIndex;
        } else {
          index = null;
        }
      }

      return index;
    };

    this.setZoomCurrent = function(time) {
      if (!goog.isDefAndNotNull(time)) {
        return;
      }

      for (var i = 0; i < boxes_.length; i++) {
        var range = stutils.createRange(boxes_[i].get('start_time'), boxes_[i].get('end_time'));
        if (range.intersects(time)) {
          mapService_.zoomToExtent(boxes_[i].get('extent'));
          break;
        }
      }

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
      return timelineTicks_[0];
    };

    this.getTimeMax = function() {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return null;
      }
      return timelineTicks_[timelineTicks_.length - 1];
    };

    this.getTimeFromTick = function(index) {
      if (!goog.isDefAndNotNull(timelineTicks_) || index >= timelineTicks_.length || index < 0) {
        return null;
      }

      return timelineTicks_[index];
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
          currentTime_ = timelineTicks_[currentTickIndex_];
        }
        service_.updateLayersTimes({ start: timelineTicks_[0], end: timelineTicks_[currentTickIndex_]});
      } else {
        currentTime_ = null;
        currentTickIndex_ = null;
      }

      if (showingPin === false) {
        featureManagerService_.hide();
      }

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
    this.updateLayersTimes = function(range) {
      // TODO: skipping hidden layers. listen for when a layer is made visible, to force a refresh
      var layers = mapService_.getLayers(false, true);
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var metadata = layer.get('metadata');
        if (goog.isDefAndNotNull(metadata) && metadata.timeline === true) {
          var source = layer.getSource();
          if (goog.isDefAndNotNull(source)) {
            if (goog.isDefAndNotNull(source.updateParams)) {
              var start = new Date(range.start).toISOString();
              var end = new Date(range.end).toISOString();
              var time = end;
              if (!filterByTime_) {
                if (start != end) {
                  time = start + '/' + end;
                }
              }
              source.updateParams({
                TIME: time
              });
            }
          }
        }
      }

      if (pinsForMap_.length > 0) {
        this.updatePinsTimes(range);
      }


    };

    this.updatePinsTimes = function(range) {
      var features = [];

      if (this.getFilterByTime()) {
        //Instant playback the range should just be the end (current time)
        var instant_range = stutils.createRange(range.end, range.end + 1);
        range = instant_range;
      }

      for (var iPin = 0; iPin < pinsForMap_.length; iPin += 1) {
        var pin = pinsForMap_[iPin];
        var pinRange = stutils.createRange(pin.start_time, pin.end_time);
        if (pinRange.intersects(range)) {
          features.push(pin);
        }
      }

      if (features.length > 0) {
        mapService_.map.removeLayer(mapService_.pinLayer);
        mapService_.pinLayer.getSource().clear(true);
        mapService_.pinLayer.getSource().addFeatures(features);
        mapService_.map.addLayer(mapService_.pinLayer);
        var layerInfo = {};
        var pinsToDisplay = [];
        for (var iFinal = 0; iFinal < features.length; iFinal += 1) {
          if (features[iFinal].auto_show === true) {
            pinsToDisplay.push(features[iFinal]);
          }
        }
        if (pinsToDisplay.length > 0) {
          showingPin = true;
          layerInfo.features = pinsToDisplay;
          layerInfo.layer = mapService_.pinLayer;
          var position = pinsToDisplay[0].values_.geometry.flatCoordinates;
          featureManagerService_.show(layerInfo, position);
        }
      } else {
        showingPin = false;
        mapService_.map.removeLayer(mapService_.pinLayer);
        mapService_.pinLayer.getSource().clear(true);
      }
    };

    this.getTimeDimension = function(layer) {
      var timeDimension = null;
      if (goog.isDefAndNotNull(layer)) {
        var metadata = layer.metadata || layer.get('metadata');
        if (goog.isDefAndNotNull(metadata) && goog.isDefAndNotNull(metadata.dimensions) && !goog.isDefAndNotNull(metadata.timelineTicks)) {
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
              } else {// if (typeof(dimensions.values) is []) {
                timeDimension = [dimension.values];
                console.log(typeof(dimension.values));
              }
              break;
            }
          }
        } else {
          timeDimension = metadata.timelineTicks;
        }
      }
      return timeDimension;
    };

    this.percentToTime = function(percent) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return null;
      }
      var min = timelineTicks_[0];
      var max = timelineTicks_[timelineTicks_.length - 1];
      return Math.round((percent * 0.01) * (max - min) + min);
    };

    this.timeToPercent = function(time) {
      if (!goog.isDefAndNotNull(timelineTicks_) || timelineTicks_.length === 0) {
        return null;
      }
      var min = timelineTicks_[0];
      var max = timelineTicks_[timelineTicks_.length - 1];
      return ((time - min) / (max - min)) * 100;
    };
  });

}());
