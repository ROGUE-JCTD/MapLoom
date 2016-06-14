(function() {

  var module = angular.module('loom_addlayersfilter_directive', []);

  module.directive('loomAddlayersfilter', function($timeout) {
    return {
      templateUrl: 'addlayers/partials/addlayersfilter.tpl.html',
      link: function(scope, element) {

        scope.sliderValues = ['5000M BC', '500M BC', '50M BC', '5M BC', '1M BC', '100K BC', '10K BC', '1K BC', '500 BC', '100 BC', 0, 100, 500, 1000, 1500, 1600, 1700, 1800, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2050, 2100, 'Future'];
        var sliderValues = scope.sliderValues.slice();
        var changeSliderValues = false;
        var histogram = {};

        scope.minValue = scope.sliderValues[10];
        scope.maxValue = scope.sliderValues[scope.sliderValues.length - 2];

        scope.sliderValues.getValue = function(key) {
          return scope.sliderValue(key);
        };

        scope.defaultSliderValue = function() {
          return {
            minValue: 10,
            maxValue: sliderValues.length - 2,
            options: {
              floor: 10,
              ceil: sliderValues.length - 2,
              step: 1,
              noSwitching: true, hideLimitLabels: true,
              getSelectionBarColor: function() {
                return '#77d5d5';
              },
              translate: function() {
                return '';
              }
            }
          };
        };

        scope.slider = scope.defaultSliderValue();

        scope.setRange = function(inputId) {
          inputId = inputId || 'inputMaxValue';
          var inputValue = element.find('#' + inputId).val();
          inputValue = isNaN(Number(inputValue)) ? inputValue : Number(inputValue);
          var keySlider = sliderValues.indexOf(inputValue);
          if (keySlider !== -1) {
            if (inputId === 'inputMaxValue') {
              scope.slider.maxValue = keySlider;
            }else if (inputId === 'inputMinValue') {
              scope.slider.minValue = keySlider;
            }
            scope.sliderValues = sliderValues.slice();
            changeSliderValues = false;
            scope.$broadcast('changeSliderValues');
          }else {
            changeSliderValues = true;
          }
        };

        function renderingSvgBars() {
          if (histogram.buckets) {
            histogram.barsWidth = $('#bars').width();
            var barsheight = 40;
            var rectWidth = histogram.barsWidth / histogram.buckets.length;
            var svgRect = histogram.buckets.map(function(bar, barKey) {
              var height = histogram.maxValue === 0 ? 0 : barsheight * bar.doc_count / histogram.maxValue;
              var y = barsheight - height;
              var translate = (rectWidth) * barKey;
              return '<g transform="translate(' + translate + ', 0)">' +
                     '  <rect width="' + rectWidth + '" height="' + height + '" y="' + y + '" fill="#E4E4E4"></rect>' +
                     '</g>';
            });
            var svgbar = '<svg width="100%" height="' + barsheight + '">' + svgRect.join('') + '</svg>';
            $('#bars').html(svgbar);
          }
        }

        scope.$on('dateRangeHistogram', function(even, histogramData) {
          histogram = histogramData;
          histogram.maxValue = Math.max.apply(null, histogram.buckets.map(function(obj) {
            return obj.doc_count;
          }));
          renderingSvgBars();
        });
        window.onresize = renderingSvgBars;

        scope.$on('slideEnded', function() {
          if (changeSliderValues) {
            scope.sliderValues = sliderValues.slice();
            changeSliderValues = false;
          }
        });

        $('#add-layer-dialog').on('shown.bs.modal', function() {
          $timeout(function() {
            scope.$broadcast('rzSliderForceRender');
          });
        });
      }
    };
  });
}());
