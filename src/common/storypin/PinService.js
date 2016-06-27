(function() {
  var module = angular.module('loom_pin_service', []);
  var pins_ = [[]];
  var service_ = null;
  var rootScope_ = null;
  //var q_ = null;
  var httpService_ = null;
  //var exclusiveModeService_ = null;
  //var mapService_ = null;
  var translate_ = null;
  var dialogService_ = null;
  var mapService_ = null;
  var Pin = function(data) {
    var copyData = angular.copy(data);
    delete data.geometry;
    ol.Feature.call(this, data);
    this.properties = data;
    this.setGeometry(new ol.geom.Point(copyData.geometry.coordinates));
    this.start_time = getTime(this.start_time);
    this.end_time = getTime(this.end_time);
  };
  Pin.prototype = Object.create(ol.Feature.prototype);
  Pin.prototype.constructor = Pin;
  var model_attributes = ['title', 'id', '_id', 'content', 'media', 'start_time', 'end_time', 'in_map', 'in_timeline', 'pause_playback', 'auto_show'];
  var filterPropertiesFromValidation = ['id', '_id', 'content', 'media', 'in_map', 'in_timeline', 'pause_playback', 'auto_show'];
  var embed_width = '"180"';
  var embed_height = '"180"';

  model_attributes.forEach(function(prop) {
    Object.defineProperty(Pin.prototype, prop, {
      get: function() {
        var val = this.get(prop);
        return typeof val === 'undefined' ? null : val;
      },
      set: function(val) {
        this.set(prop, val);
      }
    });
  });

  module.provider('pinService', function() {
    this.$get = function($rootScope, $http, dialogService, $translate, mapService, configService) {
      service_ = this;
      rootScope_ = $rootScope;
      httpService_ = $http;
      dialogService_ = dialogService;
      translate_ = $translate;
      mapService_ = mapService;
      if (goog.isDefAndNotNull(configService.configuration.chapters)) {
        angular.forEach(configService.configuration.chapters, function(config, index) {
          if (!goog.isDefAndNotNull(pins_[index])) {
            pins_.push([]);
          }
          httpService_({
            url: '/maps/' + config.id + '/annotations',
            method: 'GET'
          }).then(function(result) {
            console.log(result);
            var geojson = result.data;
            geojson.features.map(function(f) {
              var props = f.properties;
              props.geometry = $.parseJSON(f.geometry);
              props.geometry.coordinates = ol.proj.transform(props.geometry.coordinates, 'EPSG:4326', 'EPSG:3857');
              props.id = f.id;
              props.start_time = props.start_time * 1000;
              props.end_time = props.end_time * 1000;
              var storyPin = new Pin(props);
              pins_[index].push(storyPin);
            });
          });
        });
      }

      $rootScope.$on('chapter-added', function(event, config) {
        console.log('---Pin Service: chapter-added');
        pins_.push([]);
      });

      $rootScope.$on('chapter-removed', function(event, chapter_index) {
        console.log('---Pin Service: chapter-removed', chapter_index);
        pins_.splice(chapter_index, 1);
      });
      // when a map is saved, save the boxes.
      $rootScope.$on('map-saved', function(event, config) {
        console.log('----[ pinService, notified that the map was saved', config);
        var annotations = pins_[config.chapter_index];
        var clones = [];
        annotations.forEach(function(a) {
          var clone = a.clone();
          if (a.get('start_time') !== undefined) {
            a.set('start_time', getTime(a.get('start_time')));
            clone.set('start_time', a.get('start_time') / 1000);
          }
          if (a.get('end_time') !== undefined) {
            a.set('end_time', getTime(a.get('end_time')));
            clone.set('end_time', a.get('end_time') / 1000);
          }
          clones.push(clone);
        });
        httpService_.post('/maps/' + config.map.id + '/annotations', new ol.format.GeoJSON().writeFeatures(clones, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'})).success(function(data) {
          console.log('----[ pinService, saved. ', data);
          function noId(pin) {
            return !goog.isDefAndNotNull(pin.getId());
          }
          var current_pins = pins_[config.chapter_index].filter(noId);
          if (goog.isDefAndNotNull(data.ids)) {
            for (var i = 0; i < current_pins.length; i++) {
              if (!goog.isDefAndNotNull(current_pins[i].getId())) {
                current_pins[i].setId(data.ids[i]);
              }
            }
          }
          return 'success';
        });
      });

      $rootScope.$on('map-created', function(event, config) {
        if (goog.isDefAndNotNull(config) && goog.isDefAndNotNull(config.id)) {
          console.log('----[ pinService, map created. initializing', config);
          httpService_({
            url: '/maps/' + config.map.id + '/annotations',
            method: 'GET'
          }).then(function(result) {
            console.log(result);
            var geojson = result.data;
            geojson.features.map(function(f) {
              var props = f.properties;
              props.start_time *= 1000;
              props.end_time *= 1000;
              var storyPin = new Pin(props);
              service_.addPin(storyPin);
            });
          });
        }
      });

      return service_;
    };

    this.getPins = function(chapter_index) {
      return pins_[chapter_index] || [];
    };

    this.reorderPins = function(from_index, to_index) {
      pins_.splice(to_index, 0, pins_.splice(from_index, 1)[0]);
    };

    this.removePin = function(storyPin, chapter_index) {
      var response = dialogService_.warn(translate_.instant('remove_pin'), translate_.instant('sure_remove_pin'),
          [translate_.instant('yes_btn'), translate_.instant('no_btn')], false).then(function(button) {
        switch (button) {
          case 0:
            for (var i = 0; i < pins_[chapter_index].length; i++) {
              if (storyPin._id == pins_[chapter_index][i]._id) {
                pins_[chapter_index].splice(i, 1);
                rootScope_.$broadcast('pin-removed', chapter_index);
                toastr.success('StoryPin has been removed', 'Delete StoryPin');
                return storyPin.id;
              }
            }
            break;
          case 1:
            return null;
        }
      });
      return response;

    };

    this.validatePinProperty = function(pin, propertyName) {
      return (pin.hasOwnProperty(propertyName) && (goog.isDefAndNotNull(pin[propertyName]) && !goog.string.isEmptySafe(pin[propertyName])));
    };

    this.validateAllPinProperties = function(pin) {
      var invalid_props = [];
      var copy_attribs = angular.copy(model_attributes);
      copy_attribs.push('geometry');
      for (var iProp = 0; iProp < copy_attribs.length; iProp += 1) {
        var property = copy_attribs[iProp];
        if (!this.validatePinProperty(pin, property) && !goog.array.contains(filterPropertiesFromValidation, property)) {
          invalid_props.push(property);
        }
      }
      if (invalid_props.length > 0) {
        return invalid_props;
      }
      return true;
    };

    this.isUrl = function(str) {
      if (!/^(f|ht)tps?:\/\//i.test(str)) {
        return false;
      }
      return true;
    };

    this.defaultPinValues = function(pin) {
      Object.keys(pin).forEach(function(key, index) {
        if (pin[key] === '') {
          if (key === 'in_timeline' || key === 'auto_show' || key === 'pause_playback') {
            pin[key] = false;
          } else if (key === 'in_map') {
            pin[key] = true;
          } else {
            pin[key] = null;
          }
        } else if (pin[key] === 'TRUE') {
          pin[key] = true;
        } else if (pin[key] === 'FALSE') {
          pin[key] = false;
        }
      });

      return pin;
    };

    this.bulkPinAdd = function(pins, chapter_index) {
      var failedToAdd = 0;
      for (var iPin = 0; iPin < pins.length; iPin += 1) {
        var pin = pins[iPin];

        pin = this.defaultPinValues(pin);

        pin.id = new Date().getUTCMilliseconds();
        pin.geometry = {coordinates: [pin['longitude'], pin['latitude']]};
        delete pin['longitude'];
        delete pin['latitude'];


        if (this.validateAllPinProperties(pin) !== true) {
          failedToAdd += 1;
          continue;
        }

        if (getTime(pin.start_time) > getTime(pin.end_time)) {
          failedToAdd += 1;
          continue;
        }

        if (goog.isDefAndNotNull(pin.media) && !this.isUrl(pin.media)) {
          pin.media = pin.media.replace(/width="\d+"/i, 'width=' + embed_width);
          pin.media = pin.media.replace(/height="\d+"/i, 'height=' + embed_height);

        }

        var storyPin = new Pin(pin);
        pins_[chapter_index].push(storyPin);
      }
      rootScope_.$broadcast('pin-added', chapter_index);
    };

    this.addPin = function(props, chapter_index) {
      var pinValidated = this.validateAllPinProperties(props);
      if (pinValidated !== true) {
        translate_(pinValidated).then(function(translations) {
          var invalid_string = 'These properties must be set before saving a StoryPin: ';
          for (var iProp = 0; iProp < pinValidated.length; iProp += 1) {
            var property = pinValidated[iProp];
            var translatedProp = translations[property];
            translatedProp = translatedProp.concat(', ');
            invalid_string = invalid_string.concat(translatedProp);
          }
          toastr.error(invalid_string, 'Cannot save StoryPin');
        });
        return false;
      }
      if (getTime(props.start_time) > getTime(props.end_time)) {
        toastr.error('Start Time must be before End Time', 'Invalid Time');
        return false;
      }
      //TODO: Check media whitelist and sanitize embed size.
      if (goog.isDefAndNotNull(props.media) && !this.isUrl(props.media)) {
        props.media = props.media.replace(/width="\d+"/i, 'width=' + embed_width);
        props.media = props.media.replace(/height="\d+"/i, 'height=' + embed_height);

      }
      var storyPin = new Pin(props);
      pins_[chapter_index].push(storyPin);
      rootScope_.$broadcast('pin-added', chapter_index);
      console.log('-- pinService.addPin, added: ', storyPin);
      return true;
    };


    this.updatePin = function(pin, chapter_index) {
      //Only set new geometry if location was saved on pin object
      if (goog.isDefAndNotNull(pin.geometry)) {
        mapService_.removeDraw();
        mapService_.removeSelect();
        mapService_.removeModify();
        mapService_.map.removeLayer(mapService_.editLayer);
        var newGeom = new ol.geom.Point(pin.geometry.coordinates);
        pin.setGeometry(newGeom);
      }
      for (var iPin = 0; iPin < pins_.length; iPin += 1) {
        if (pin.id === pins_[iPin].id) {
          pins_[iPin] = pin;
        }
      }
      rootScope_.$broadcast('pin-added', chapter_index);
      toastr.success('Your StoryPin has been saved', 'StoryPin Saved');
    };

  });
}());
