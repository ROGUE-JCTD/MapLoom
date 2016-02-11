(function() {
  var module = angular.module('loom_box_service', []);
  var boxes_ = [];
  var service_ = null;
  var rootScope_ = null;
  var pulldownService_ = null;
  var q_ = null;
  var httpService_ = null;
  var Box = function(data) {
    ol.Feature.call(this, data);
    this.start_time = getTime(this.start_time);
    this.end_time = getTime(this.end_time);
  };
  Box.prototype = Object.create(ol.Feature.prototype);
  Box.prototype.constructor = Box;
  var model_attributes = ['id', '_id', 'title', 'description', 'start_time', 'end_time', 'extent'];

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
      pulldownService_ = pulldownService;
      q_ = $q;

      // when a map is saved, save the boxes.
      $rootScope.$on('map-saved', function(event, config) {
        console.log('----[ boxService, notified that the map was saved', config);
        httpService_.post('/maps/' + config.id + '/boxes', new ol.format.GeoJSON().writeFeatures(boxes_, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'})).success(function(data) {
          console.log('----[ boxService, saved. ', data);
          return 'success';
        });
      });

      $rootScope.$on('map-created', function(event, config) {
        if (goog.isDefAndNotNull(config) && goog.isDefAndNotNull(config.id)) {
          console.log('----[ boxService, map created. initializing', config);
          httpService_({
            url: '/maps/' + config.id + '/boxes',
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

    this.getBoxes = function() {
      return boxes_;
    };

    this.removeBox = function(storyBox) {

      for (var i = 0; i < boxes_.length; i++) {
        if (storyBox._id == boxes_[i]._id) {
          boxes_.splice(i, 1);
          break;
        }
      }

    };

    this.addBox = function(props, loaded) {
      var deferredResponse = q_.defer();
      var storyBox = new Box(props);
      boxes_.push(storyBox);
      rootScope_.$broadcast('box-added', storyBox);
      console.log('-- BoxService.addBox, added: ', storyBox);
      pulldownService_.showStoryboxPanel();

      return deferredResponse.promise;
    };

  });
}());
