(function() {
  var module = angular.module('loom_statistics_service', []);

  //var http_ = null;
  var service_ = null;
  //var q_ = null;

  module.provider('statisticsService', function() {
    this.$get = function($q, $http) {
      http_ = $http;
      service_ = this;
      q_ = $q;
      return this;
    };

    this.getBarData = function(layer, field) {
      return [
        {name: 'Station 1', score: 98},
        {name: 'Station 2', score: 96},
        {name: 'Station 3', score: 75},
        {name: 'Station 4', score: 48}
      ];
    };

    this.getSummaryStatistics = function(layer, field) {
      return {
        count: 1462,
        unqiueValues: 1091,
        min: 36.618,
        max: 86.2747,
        range: 49.6567,
        sum: 106165,
        mean: 72.6165,
        median: 74.2404
      };
    };

    this.getStatistics = function(layer, field) {
      var statistics = {};
      statistics.field = field;
      statistics.fieldname = field.name;
      statistics.barData = service_.getBarData(layer, field);
      statistics.summaryStatistics = service_.getSummaryStatistics(layer, field);

      return statistics;
    };


  });
}());

