(function() {
  var module = angular.module('loom_search_service', []);

  var httpService_ = null;
  var q_ = null;
  var configService_ = null;
  var mapService_ = null;
  var searchlayer_ = null;

  module.provider('searchService', function() {
    this.$get = function($rootScope, $http, $q, $translate, configService, mapService) {
      httpService_ = $http;
      q_ = $q;
      configService_ = configService;
      mapService_ = mapService;

      searchlayer_ = new ol.layer.Vector({
        metadata: {
          title: $translate.instant('search_results'),
          internalLayer: true
        },
        source: new ol.source.Vector({
          parser: null
        }),
        style: function(feature, resolution) {
          return [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 8,
              fill: new ol.style.Fill({
                color: '#D6AF38'
              }),
              stroke: new ol.style.Stroke({
                color: '#000000'
              })
            })
          })];
        }
      });

      $rootScope.$on('translation_change', function() {
        searchlayer_.get('metadata').title = $translate.instant('search');
      });

      return this;
    };

    this.performSearch = function(address, type) {
      var currentView = mapService_.map.getView().calculateExtent([$(window).height(), $(window).width()]);
      var minBox = ol.proj.transform([currentView[0], currentView[1]],
          mapService_.map.getView().getProjection(), 'EPSG:4326');
      var maxBox = ol.proj.transform([currentView[2], currentView[3]],
          mapService_.map.getView().getProjection(), 'EPSG:4326');
      currentView[0] = minBox[0];
      currentView[1] = minBox[1];
      currentView[2] = maxBox[0];
      currentView[3] = maxBox[1];
      var promise = q_.defer();
      var nominatimUrl = configService_.configuration.nominatimUrl;
      if (nominatimUrl.substr(nominatimUrl.length - 1) === '/') {
        nominatimUrl = nominatimUrl.substr(0, nominatimUrl.length - 1);
      }

      if (goog.isDefAndNotNull(type) && type == 'layer') {
        var elastic_url = '/api/base/search/?q=' + encodeURIComponent(address) + '&limit=100&offset=0&is_published';

        httpService_.get(elastic_url).then(function(response) {
          if (goog.isDefAndNotNull(response.data) && goog.isArray(response.data.objects)) {
            console.log('----- Search results.', response.data);
            var results = [];
            forEachArrayish(response.data.objects, function(result) {
              results.push({
                thumbnail_url: result.thumbnail_url,
                name: result.title,
                abstract: result.abstract,
                id: result.id,
                url: result.detail_url,
                typename: result.typename
              });
            });
            promise.resolve(results);
          } else {
            promise.reject(response.status);
          }
        }, function(reject) {
          promise.reject(reject.status);
        });
      }
      else {
        var url = nominatimUrl + '/search?q=' + encodeURIComponent(address) + '&format=json&limit=30&viewboxlbrt=' + encodeURIComponent(currentView.toString());
        httpService_.get(url).then(function(response) {
          if (goog.isDefAndNotNull(response.data) && goog.isArray(response.data)) {
            var results = [];
            forEachArrayish(response.data, function(result) {
              var bbox = result.boundingbox;
              for (var i = 0; i < bbox.length; i++) {
                bbox[i] = parseFloat(bbox[i]);
              }
              results.push({
                location: [parseFloat(result.lon), parseFloat(result.lat)],
                boundingbox: bbox,
                name: result.display_name
              });
            });
            promise.resolve(results);
          } else {
            promise.reject(response.status);
          }
        }, function(reject) {
          promise.reject(reject.status);
        });
      }

      return promise.promise;
    };

    this.populateSearchLayer = function(results) {
      searchlayer_.getSource().clear();
      mapService_.map.removeLayer(searchlayer_);
      mapService_.map.addLayer(searchlayer_);
      forEachArrayish(results, function(result) {
        var olFeature = new ol.Feature();
        olFeature.setGeometry(new ol.geom.Point(ol.proj.transform(result.location, 'EPSG:4326',
            mapService_.map.getView().getProjection())));
        searchlayer_.getSource().addFeature(olFeature);
      });
    };

    this.clearSearchLayer = function() {
      searchlayer_.getSource().clear();
      mapService_.map.removeLayer(searchlayer_);
    };
  });
}());
