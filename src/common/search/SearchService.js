(function() {
  var module = angular.module('loom_search_service', []);

  var httpService_ = null;
  var q_ = null;
  var configService_ = null;
  var mapService_ = null;

  module.provider('searchService', function() {
    this.$get = function($http, $q, configService, mapService) {
      httpService_ = $http;
      q_ = $q;
      configService_ = configService;
      mapService_ = mapService;

      return this;
    };

    this.performSearch = function(address) {
      var currentView = mapService_.map.getView().getView2D().calculateExtent([$(window).height(), $(window).width()]);
      var minBox = ol.proj.transform([currentView[0], currentView[1]],
          mapService_.map.getView().getView2D().getProjection(), 'EPSG:4326');
      var maxBox = ol.proj.transform([currentView[2], currentView[3]],
          mapService_.map.getView().getView2D().getProjection(), 'EPSG:4326');
      currentView[0] = minBox[0];
      currentView[1] = minBox[1];
      currentView[2] = maxBox[0];
      currentView[3] = maxBox[1];
      var promise = q_.defer();
      var nominatimUrl = configService_.configuration.nominatimUrl;
      if (nominatimUrl.substr(nominatimUrl.length - 1) === '/') {
        nominatimUrl = nominatimUrl.substr(0, nominatimUrl.length - 1);
      }
      var url = nominatimUrl + '/search?q=' + encodeURIComponent(address) +
          '&format=json&limit=30&viewboxlbrt=' + encodeURIComponent(currentView.toString());
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

      return promise.promise;
    };
  });
}());
