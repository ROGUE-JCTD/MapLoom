(function() {

  var module = angular.module('loom_addlayersfilter_directive', []);

  module.directive('loomAddlayersfilter', function($timeout) {
    return {
      templateUrl: 'addlayers/partials/addlayersfilter.tpl.html',
      link: function(scope, element) {

        var topIndex = -1;
        var minIndex = 11;
        scope.sliderValues = ['5000M BC', '500M BC', '50M BC', '5M BC', '1M BC', '100K BC', '10K BC', '1K BC', '500 BC', '100 BC',
          0, 100, 500, 1000, 1500, 1600, 1700, 1800, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 1991, 1992, 1993,
          1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013,
          2014, 2015, 2016, 2017, 2018, 2019, 2020, 2050, 2100, 'Future'].slice(minIndex, topIndex);
        var sliderValues = scope.sliderValues.slice();
        var changeSliderValues = false;
        var histogram = {};

        scope.minValue = scope.sliderValues[0];
        scope.maxValue = scope.sliderValues[scope.sliderValues.length - 1];

        scope.sliderValues.getValue = function(key) {
          return scope.sliderValue(key);
        };

        scope.defaultSliderValue = function() {
          return {
            minValue: 0,
            maxValue: sliderValues.length - 1,
            options: {
              floor: 0,
              ceil: sliderValues.length - 1,
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

        scope.$on('slideEnded', function() {
          if (changeSliderValues) {
            scope.sliderValues = sliderValues.slice();
            changeSliderValues = false;
          }
        });

        function dateRangeHistogram(counts, sliderValues) {
          if (!sliderValues || !counts) {
            return [];
          }
          var suma = 0, sliderIndex = 0, histogram = [];
          for (var i = 0; i < counts.length; i++) {
            var count = counts[i];
            var sliderValue = Number(sliderValues[sliderIndex]);
            suma = suma + count.count;
            yearCount = Number(count.value.substring(0, 4));
            yearCountNext = counts[i + 1] === undefined ? null : Number(counts[i + 1].value.substring(0, 4));

            if (yearCount === sliderValue || (yearCount < sliderValue && yearCountNext > sliderValue)) {
              histogram.push({key: sliderValue, count: suma});
              suma = 0;
              sliderIndex++;
            }
            while (
                sliderIndex < sliderValues.length &&
                (isNaN(sliderValue) || yearCount > sliderValue ||
                (i + 1 === counts.length && yearCount <= sliderValue))
            ) {
              histogram.push({key: sliderValue, count: 0});
              sliderIndex++;
              sliderValue = Number(sliderValues[sliderIndex]);
              i = yearCount === sliderValue ? i - 1 : i;
            }
          }
          return histogram;
        }

        function makeHistogram(histogram) {

          function renderingSvgBars() {
            if (histogram.counts) {
              histogram.barsWidth = $('#bars').width();
              var barsheight = 40;
              var rectWidth = histogram.barsWidth / histogram.counts.length;
              var svgRect = histogram.counts.map(function(bar, barKey) {
                var height = histogram.maxValue === 0 ? 0 : barsheight * bar.count / histogram.maxValue;
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

          $(window).resize(renderingSvgBars);

          histogram.maxValue = Math.max.apply(null, histogram.counts.map(function(obj) {
            return obj.count;
          }));
          histogram.counts = dateRangeHistogram(histogram.counts, scope.sliderValues);
          renderingSvgBars();
        }

        scope.$on('dateRangeHistogram', function(even, histogramData) {
          makeHistogram(histogramData);
        });

        $('#registry-layer-dialog').on('shown.bs.modal', function() {
          $timeout(function() {
            scope.$broadcast('rzSliderForceRender');
          });
        });
      }
    };
  });
}());
