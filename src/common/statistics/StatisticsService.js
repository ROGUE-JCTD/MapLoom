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
        uniqueValues: {
        },
        min: 100,
        max: 0,
        range: 49.6567,
        sum: 106165,
        mean: 72.6165,
        median: 74.2404,
        stdDev: 15.324,
        coefficient: 0.0123
      };

      for (i = 0; i < Math.floor((Math.random() * 35) + 1); i++) {
        var random = Math.floor((Math.random() * 100) + 1);
        number.uniqueValues[i] = random;

        if (random > number.max || typeof(number.max) === 'undefined') {
          number.max = random;
        } else if (random < number.min || typeof(number.min) === 'undefined') {
          number.min = random;
        }
      }


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
      var statistics = {};
      statistics.field = field;
      statistics.fieldname = field.name;
      statistics.statistics = service_.getSummaryStatistics(layer, field);
      return statistics;
    };


  });
}());

