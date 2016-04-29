(function() {
  var module = angular.module('loom_box_service', []);
  var boxes_ = [[]];
  var service_ = null;
  var rootScope_ = null;
  //var pulldownService_ = null;
  //var q_ = null;
  var httpService_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var Box = function(data) {
    ol.Feature.call(this, data);
    this.start_time = getTime(this.start_time);
    this.end_time = getTime(this.end_time);
  };
  Box.prototype = Object.create(ol.Feature.prototype);
  Box.prototype.constructor = Box;
  var model_attributes = ['id', '_id', 'title', 'description', 'start_time', 'end_time', 'extent'];
  var filterPropertiesFromValidation = ['id', '_id', 'description'];

  model_attributes.forEach(function(prop) {
    Object.defineProperty(Box.prototype, prop, {
      get: function() {
        var val = this.get(prop);
        return typeof val === 'undefined' ? null : val;
      },
      set: function(val) {
        this.set(prop, val);
      }
    });
  });

  module.provider('boxService', function() {
    this.$get = function($rootScope, $http, $q, $location, $translate, pulldownService, dialogService, configService) {
      service_ = this;
      rootScope_ = $rootScope;
      httpService_ = $http;
      dialogService_ = dialogService;
      translate_ = $translate;
      //pulldownService_ = pulldownService;
      //q_ = $q;

      if (goog.isDefAndNotNull(configService.configuration.chapters)) {
        var num_chapters = configService.configuration.chapters.length;
        for (var iChapter = 0; iChapter < num_chapters; iChapter += 1) {
          if (!goog.isDefAndNotNull(boxes_[iChapter])) {
            boxes_.push([]);
          }
        }
      }

      $rootScope.$on('chapter-added', function(event, config) {
        console.log('---Box Service: chapter-added');
        boxes_.push([]);
      });

      $rootScope.$on('chapter-removed', function(event, chapter_index) {
        console.log('---Box Service: chapter-removed', chapter_index);
        boxes_.splice(chapter_index, 1);
      });
      // when a map is saved, save the boxes.
      $rootScope.$on('map-saved', function(event, config) {
        console.log('----[ boxService, notified that the map was saved', config);
        httpService_.post('/maps/' + config.map.id + '/boxes', new ol.format.GeoJSON().writeFeatures(boxes_[config.chapter_index], {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'})).success(function(data) {
          console.log('----[ boxService, saved. ', data);
          return 'success';
        });
      });

      $rootScope.$on('map-created', function(event, config) {
        if (goog.isDefAndNotNull(config) && goog.isDefAndNotNull(config.id)) {
          console.log('----[ boxService, map created. initializing', config);
          httpService_({
            url: '/maps/' + config.map.id + '/boxes',
            method: 'GET'
          }).then(function(result) {
            console.log(result);
            var geojson = result.data;
            geojson.features.map(function(f) {
              var props = f.properties;
              props.start_time *= 1000;
              props.end_time *= 1000;
              var storyBox = new Box(props);
              service_.addBox(storyBox);
            });
          });
        }
      });

      return service_;
    };

    this.getBoxes = function(chapter_index) {
      return boxes_[chapter_index] || [];
    };

    this.removeBox = function(storyBox, chapter_index) {

      var response = dialogService_.warn(translate_.instant('remove_box'), translate_.instant('sure_remove_box'),
          [translate_.instant('yes_btn'), translate_.instant('no_btn')], false).then(function(button) {
        switch (button) {
          case 0:
            for (var i = 0; i < boxes_[chapter_index].length; i++) {
              if (storyBox.id == boxes_[chapter_index][i].id) {
                boxes_[chapter_index].splice(i, 1);
                rootScope_.$broadcast('box-removed', chapter_index);
                toastr.success('Storybox has been removed', 'Delete Storybox');
                return storyBox.id;
              }
            }
            break;
          case 1:
            return null;
        }
      });
      return response;
    };

    this.updateBox = function(box, chapter_index) {
      //TODO: more may need to be done here like updating the map extent
      rootScope_.$broadcast('box-added', chapter_index);
    };

    this.validateBoxProperty = function(box, propertyName) {
      return (box.hasOwnProperty(propertyName) && (goog.isDefAndNotNull(box[propertyName]) && !goog.string.isEmptySafe(box[propertyName])));
    };

    this.validateAllBoxProperties = function(box) {
      var invalid_props = [];
      for (var iProp = 0; iProp < model_attributes.length; iProp += 1) {
        var property = model_attributes[iProp];
        if (!this.validateBoxProperty(box, property) && !goog.array.contains(filterPropertiesFromValidation, property)) {
          invalid_props.push(property);
        }
      }
      if (invalid_props.length > 0) {
        return invalid_props;
      }
      return true;
    };

    this.addBox = function(props, chapter_index) {
      var boxValidated = this.validateAllBoxProperties(props);
      if (boxValidated !== true) {
        translate_(boxValidated).then(function(translations) {
          var invalid_string = 'These properties must be set before saving a StoryBox: ';
          for (var iProp = 0; iProp < boxValidated.length; iProp += 1) {
            var property = boxValidated[iProp];
            var translatedProp = translations[property];
            translatedProp = translatedProp.concat(', ');
            invalid_string = invalid_string.concat(translatedProp);
          }
          toastr.error(invalid_string, 'Cannot save StoryBox');
        });
        return false;
      }
      if (getTime(props.start_time) > getTime(props.end_time)) {
        toastr.error('Start Time must be before End Time', 'Invalid Time');
        return false;
      }
      var storyBox = new Box(props);
      boxes_[chapter_index].push(storyBox);
      rootScope_.$broadcast('box-added', chapter_index);
      console.log('-- BoxService.addBox, added: ', storyBox);

      return true;
    };

  });
}());
