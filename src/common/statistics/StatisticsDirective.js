(function() {
  var module = angular.module('loom_statistics_directive', []);


  module.directive('loomStatisticsView',
      function() {
        return {
          restrict: 'C',
          templateUrl: 'statistics/partial/statistics.tpl.html',
          link: function(scope, element) {

            var resetVariables = function() {
              scope.data = null;
              scope.selected = 'histogram';
            };

            resetVariables();

            scope.$on('getStatistics', function(evt, statistics) {
              scope.data = statistics;
            });

            function resizeModal() {
              var containerHeight = angular.element('#statistics-view-window .modal-content')[0].clientHeight;
              var headerHeight = angular.element('#statistics-view-window .modal-header')[0].clientHeight;

              var contentHeight = containerHeight - headerHeight;

              if (containerHeight === 0) {
                return;
              }

              element[0].parentElement.style.height = contentHeight + 'px';

              var bodyHeight = contentHeight;// - angular.element('#table-view-window .modal-footer')[0].clientHeight;
              angular.element('#statistics-view-window .modal-body')[0].style.height = bodyHeight + 'px';

            }

            $(window).resize(resizeModal);

            scope.fieldTypeSupportsHistogram = function(fieldType) {
              if (goog.isDefAndNotNull(fieldType)) {
                return true;
              }
              return false;
            };

            scope.fieldTypeSupportsDateHeatMap = function(fieldType) {
              if (goog.isDefAndNotNull(fieldType)) {
                if (fieldType === 'date' || fieldType === 'datetime') {
                  return true;
                }
              }
              return false;
            };

            scope.selectChart = function(chartType) {
              return scope.selected = chartType;
            };

            scope.isSelected = function(chartType) {
              return scope.selected === chartType;
            };

          }
        };
      });

  module.directive('loomStatisticsChart',
      function() {
        return {
          restrict: 'EA',

          link: function(scope, element, attrs) {
            var divWidth = 538;
            var divHeight = 360;
            var margin = {top: 30, bottom: 10, left: 45, right: 10};

            scope.$watch('data', function(newVals, oldVals) {
              if (goog.isDefAndNotNull(newVals) && goog.isDefAndNotNull(newVals)) {
                scope.data = newVals;
                console.log('New Data value: ', newVals);
                scope.render();
              }
            }, true);

            scope.$watch('selected', function(newVals, oldVals) {
              console.log('Selected: ', scope.selected);
              scope.render();
            }, true);

            scope.render = function() {
              if (scope.selected === 'pie') {
                return scope.renderPieChart();
              }
              return scope.renderHistogram();
            };

            scope.clearData = function() {
              d3.select(element[0]).selectAll('*').remove();
            };

            scope.color = function() {
              return d3.scale.category20();
            };

            scope.renderHistogram = function() {
              var data = scope.data;
              scope.clearData();

              if (!data || !(goog.isDefAndNotNull(data.statistics) &&
                  goog.isDefAndNotNull(data.statistics.uniqueValues))) {
                return;
              }

              var histogram = d3.entries(data.statistics.uniqueValues);
              var chartWidth = divWidth - margin.left - margin.right;
              var chartHeight = divHeight - margin.top - margin.bottom;
              var color = scope.color();
              var yScale = d3.scale.linear().domain([data.statistics.min, data.statistics.max])
                  .range([chartHeight, margin.bottom]);
              var xScale = d3.scale.ordinal().domain(d3.keys(data.statistics.uniqueValues))
                  .rangeBands([margin.left + 10, chartWidth], 0.25, 0.25);
              var sliceHoverClass = 'path-red-fill';

              scope.renderLegend(histogram);

              var svg = d3.select(element[0])
                  .append('svg:svg')
                  .attr('width', divWidth)
                  .style('margin-left', d3.select('.statistics-legend').node().offsetWidth);

              // set the height based on the calculations above
              svg.attr('height', divHeight);

              //create the rectangles for the bar chart
              svg.selectAll('rect')
                  .data(histogram).enter()
                  .append('rect')
                  .attr('id', function(d, index) {
                    return 'histogram-chart-slice-path-' + index;})
                  .classed('black-stroke', true)
                  .attr('width', xScale.rangeBand())
                  .attr('y', function(d) {
                    return yScale(d.value);
                  })
                  .attr('x', function(d, i) {
                    return xScale(d.key);
                  })
                  .attr('fill', function(d, i) {
                    return color(i);
                  })
                  .attr('height', function(d) { return chartHeight - yScale(d.value) + 1; });

              var yAxis = d3.svg.axis()
                  .scale(yScale)
                  .orient('left');

              svg.append('g')
                  .attr('class', 'y axis')
                  .attr('transform', 'translate(' + margin.left + ',0)')
                  .call(yAxis)
                  .selectAll('text')
                  .classed('no-select', true);

              var xAxis = d3.svg.axis()
                  .scale(xScale)
                  .orient('bottom');

              svg.append('g')
                  .attr('class', 'x axis')
                  .attr('transform', 'translate(0,' + (chartHeight + margin.bottom) + ')')
                  .call(xAxis)
                  .selectAll('text')
                  .classed('no-select', true);


              var addSliceHoverClasses = function(event) {
                var target = '#' + event.currentTarget.id;
                d3.select(target).classed(sliceHoverClass, true);
              };

              var removeSliceHoverClasses = function(event) {
                var target = '#' + event.currentTarget.id;
                d3.select(target).classed(sliceHoverClass, false);
              };

              for (var index = 0; index < histogram.length; index++) {
                var pathSelector = '#histogram-chart-slice-path-' + index;
                $(pathSelector).hover(addSliceHoverClasses, removeSliceHoverClasses);
              }
            };

            scope.renderPieChart = function() {
              var data = scope.data;
              scope.clearData();
              if (!data || !(goog.isDefAndNotNull(data.statistics) &&
                  goog.isDefAndNotNull(data.statistics.uniqueValues))) {
                return;
              }

              //var w = width - margin.left - margin.right;
              // get the width of the parent div with this (after everything has rendered)
              // d3.select('#statistics-chart-area').node().offsetWidth
              var chartHeight = divHeight - margin.top - margin.bottom;
              var r = chartHeight / 2;
              var color = scope.color();
              var sliceHoverClass = 'path-red-fill';

              uniqueValues = d3.entries(data.statistics.uniqueValues);

              scope.renderLegend(uniqueValues);

              var svg = d3.select(element[0])
                  .append('svg:svg')
                  .attr('id', 'pie-chart')
                  .data([uniqueValues])
                  .attr('width', divWidth)
                  .attr('height', divHeight)
                  .append('svg:g')
                  .attr('transform', 'translate(' + divWidth / 2 + ',' + divHeight / 2 + ')')
                  .style('margin-left', d3.select('.statistics-legend').node().offsetWidth);

              var pie = d3.layout.pie().value(function(d) {return d.value;});
              var arc = d3.svg.arc().outerRadius(r);

              var arcs = svg.selectAll('g.slice')
                  .data(pie).enter()
                  .append('g')
                  .attr('class', 'arc');

              arcs.append('path')
                  .attr('fill', function(d, i) {
                    return color(i);})
                  .classed('pie-chart-slice black-stroke', true)
                  .attr('id', function(d, index) {
                    return 'pie-chart-slice-path-' + index;})
                  .attr('d', function(d) {
                    console.log(arc(d));
                    return arc(d);
                  });

              var addSliceHoverClasses = function(event) {
                var target = '#' + event.currentTarget.id;
                d3.select(target).classed(sliceHoverClass, true);
              };

              var removeSliceHoverClasses = function(event) {
                var target = '#' + event.currentTarget.id;
                d3.select(target).classed(sliceHoverClass, false);
              };

              for (var index = 0; index < uniqueValues.length; index++) {
                var pathSelector = '#pie-chart-slice-path-' + index;
                $(pathSelector).hover(addSliceHoverClasses, removeSliceHoverClasses);
              }
            };

            scope.renderLegend = function(data) {

              if (!goog.isDefAndNotNull(data)) {
                return;
              }
              var maxLength = 0;
              var color = scope.color();

              var legendDiv = d3.select(element[0])
                  .append('div')
                  .attr('class', 'statistics-legend');

              var legend = legendDiv
                  .append('table')
                  .attr('class', 'statistics-legend-table');

              var tr = legend.append('tbody')
                  .selectAll('tr')
                  .data(data)
                  .enter()
                  .append('tr')
                  .attr('id', function(d, index) {
                    return scope.selected + 'legend-row-' + index;
                  });

              tr.append('td')
                  .append('svg')
                  .attr('width', '16')
                  .attr('height', '16')
                  .append('rect')
                  .attr('width', '16')
                  .attr('height', '16')
                  .attr('fill', function(d, i) {
                    return color(i);
                  });

              tr.append('td')
                  .text(function(d) {
                    if (goog.isDefAndNotNull(d.key)) {
                      if (d.key.length > maxLength) {
                        maxLength = d.key.length;
                      }
                      return d.key;
                    }
                    return;
                  })
                  .classed('statistics-legend-text no-select', true)
                  .attr('data-toggle', 'tooltip')
                  .attr('data-placement', 'right')
                  .attr('title', function(d) {
                        return d.key + ': ' + d.value;
                      });

              var calculatedWidth = 29 + (5 * maxLength);
              if (calculatedWidth > 125) {
                calculatedWidth = 125;
              }
              tableWidth = legend.node().offsetWidth;
              $('.statistics-legend').width(tableWidth);
              //d3.select('.statistics-legend').style('width', tableWidth + 'px');
              //console.log('calculated width', tableWidth + 'px');
            };
          }
        };
      });
}());
