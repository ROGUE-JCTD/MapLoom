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
        {bin: 'Station 1', value: 98},
       {bin: 'Station 2', value: 96},
        {bin: 'Station 3', value: 75},
        {bin: 'Station 4', value: 48}
      ];
    };

    this.getSummaryStatistics = function(layer, field) {
      number = {
        type: 'number',
        populatedCount: 1462,
        totalCount: 2043,
        unqiueValues: {
          '10.5': 23
        },
        min: 36.618,
        max: 86.2747,
        range: 49.6567,
        sum: 106165,
        mean: 72.6165,
        median: 74.2404,
        stdDev: 15.324,
        coefficient: 0.0123
      };

      strStats = {
        type: 'string',
        count: 13,
        uniqueValueCounts: {
          'In Progress': 12,
          'Finalized': 1100
        }
      };

      dateStats = {
        type: 'date',
        count: 13,
        uniqueValueCounts: {
          '12321323434': 11,
          '12321323423': 23
        },
        min: 12321323423,
        max: 12321323434,
        range: 49.6567,
        // sum will likely not make sense in date/time/datetime cases
        sum: 106165,
        // delta in ms
        mean: 72.6165,
        median: 74.2404,
        stdDev: 15.324,
        coefficient: 0.0123
      };

      return number;

    };

    this.getStatistics = function(layer, field) {
      var deferred = q_.defer();

      var statistics = {};
      statistics.field = field;
      statistics.fieldname = field.name;
      statistics.barData = service_.getBarData(layer, field);
      statistics.summaryStatistics = service_.getSummaryStatistics(layer, field);

      deferred.resolve(statistics);
      return deferred.promise;
    };


  });
}());

