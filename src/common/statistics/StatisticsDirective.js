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

              var bodyHeight = contentHeight;
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

            scope.$watch('data', function(newVals, oldVals) {
              if (goog.isDefAndNotNull(newVals) && goog.isDefAndNotNull(newVals)) {
                scope.data = newVals;
                console.log('New Data value: ', newVals);
                if (goog.isDefAndNotNull(scope.data) || goog.isDefAndNotNull(scope.data.statistics) &&
                    goog.isDefAndNotNull(scope.data.statistics.uniqueValues)) {

                  scope.resetVariables();
                  obj = scope.data.statistics.uniqueValues;

                  for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                      var label = scope.validateChartText(key);
                      if (!goog.isDefAndNotNull(scope.uniqueValueMin) || obj[key] < scope.uniqueValueMin) {
                        scope.uniqueValueMin = obj[key];
                      }

                      if (!goog.isDefAndNotNull(scope.uniqueValueMax) || obj[key] > scope.uniqueValueMax) {
                        scope.uniqueValueMax = obj[key];
                      }

                      if (!goog.isDefAndNotNull(scope.maxLabelLength) || label.length > scope.maxLabelLength) {
                        scope.maxLabelLength = label.length;
                      }
                    }
                  }

                  if (scope.uniqueValueMin === scope.uniqueValueMax) {
                    scope.uniqueValueMin = 0;
                  }
                  if (scope.uniqueValueMin > scope.uniqueValueMax) {
                    var max = scope.uniqueValueMin;
                    scope.uniqueValueMin = scope.uniqueValueMax;
                    scope.uniqueValueMax = max;
                  }

                }
                scope.render();
              }
            }, true);

            scope.$watch('selected', function(newVals, oldVals) {
              scope.render();
            }, true);

            scope.render = function() {
              if (scope.selected === 'pie') {
                return scope.renderPieChart();
              }
              return scope.renderHistogram();
            };

            scope.resetVariables = function() {
              scope.divWidth = 550;
              scope.divHeight = 450;
              scope.margin = {top: 30, bottom: 10, left: 45, right: 10};
              scope.uniqueValueMin = null;
              scope.uniqueValueMax = null;
              scope.maxLabelLength = null;
            };

            scope.resetVariables();

            scope.clearData = function() {
              d3.select(element[0]).selectAll('*').remove();
            };

            scope.color = function() {
              return d3.scale.category20();
            };

            scope.renderHistogram = function() {
              var data = scope.data;

              if (!data || !(goog.isDefAndNotNull(data.statistics) &&
                  goog.isDefAndNotNull(data.statistics.uniqueValues))) {
                return;
              }
              scope.clearData();

              var histogram = d3.entries(data.statistics.uniqueValues);
              var maxxAxisLabelWidth = 40;

              var distributeWidth = Math.max(scope.divWidth, 33 * histogram.length);
              scope.divWidth = distributeWidth;
              var chartWidth = scope.divWidth - scope.margin.left - scope.margin.right;
              var chartHeight = scope.divHeight - scope.margin.top - scope.margin.bottom;
              var color = scope.color();
              var yScale = d3.scale.linear().domain([scope.uniqueValueMin, scope.uniqueValueMax])
                  .range([chartHeight, scope.margin.bottom]);
              var xScale = d3.scale.ordinal().domain(d3.keys(data.statistics.uniqueValues))
                  .rangeBands([scope.margin.left + 10, chartWidth], 0.25, 0.25);
              var sliceHoverClass = 'path-red-fill';

              var xAxisLabelCollision = goog.isDefAndNotNull(scope.maxLabelLength) &&
                  7 * 0.4 * scope.maxLabelLength + 20 > xScale.rangeBand();

              if (xAxisLabelCollision) {
                chartHeight = chartHeight - maxxAxisLabelWidth;
                yScale = d3.scale.linear().domain([scope.uniqueValueMin, scope.uniqueValueMax])
                  .range([chartHeight, scope.margin.bottom]);
              }

              scope.renderLegend(histogram);

              var svg = d3.select(element[0])
                  .append('div')
                  .attr('id', 'loom-statistics-histogram')
                  .attr('width', scope.divWidth)
                  .append('svg:svg')
                  .attr('width', scope.divWidth);

              // set the height based on the calculations above
              svg.attr('height', scope.divHeight);

              var yAxis = d3.svg.axis()
                  .scale(yScale)
                  .orient('left');

              svg.append('g')
                  .attr('class', 'y axis')
                  .attr('transform', 'translate(' + scope.margin.left + ',0)')
                  .call(yAxis)
                  .selectAll('text')
                  .classed('no-select', true);

              svg.selectAll('g').filter(function(d) { return d; })
                  .classed('minor', true);

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

              var xAxis = d3.svg.axis()
                  .scale(xScale)
                  .orient('bottom')
                  .tickPadding(10)
                  .tickFormat(function(d) {
                    if (goog.isDefAndNotNull(d) && (d.length * 7 * 0.4 > maxxAxisLabelWidth - 15)) {
                      var trunc = d.substring(0, 8);
                      if (d.length > 8) {
                        trunc += '...';
                      }
                      return trunc;
                    }
                    return scope.validateChartText(d);
                  });

              svg.append('g')
                  .attr('class', 'x axis')
                  .attr('transform', 'translate(0,' + (chartHeight + scope.margin.bottom) + ')')
                  .call(xAxis)
                  .selectAll('text')
                  .classed('no-select x-axis-label', true);

              if (xAxisLabelCollision) {
                svg.selectAll('.x-axis-label')
                    .attr('transform', 'rotate(90)')
                    .style('text-anchor', 'start')
                    .attr('y', 0)
                    .attr('x', 9)
                    .attr('dy', '.35em');
              }

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

            scope.validateChartText = function(text) {
              if (text === '') {
                return '[Empty String]';
              }
              return text;
            };

            scope.renderPieChart = function() {
              var data = scope.data;

              if (!data || !(goog.isDefAndNotNull(data.statistics) &&
                  goog.isDefAndNotNull(data.statistics.uniqueValues))) {
                return;
              }
              scope.clearData();

              //var w = width - margin.left - margin.right;
              // get the width of the parent div with this (after everything has rendered)
              // d3.select('#statistics-chart-area').node().offsetWidth
              scope.divWidth = 600;
              var chartWidth = scope.divWidth - scope.margin.left - scope.margin.right;
              var chartHeight = scope.divHeight - scope.margin.top - scope.margin.bottom;
              var r = chartHeight / 2;
              var color = scope.color();
              var sliceHoverClass = 'path-red-fill';

              uniqueValues = d3.entries(data.statistics.uniqueValues);

              scope.renderLegend(uniqueValues);

              var svg = d3.select(element[0])
                  .append('div')
                  .attr('id', 'loom-statistics-pie')
                  .attr('width', scope.divWidth)
                  .append('svg:svg')
                  .attr('width', chartWidth)
                  .attr('height', chartHeight)
                  .attr('id', 'pie-chart')
                  .data([uniqueValues])
                  .append('svg:g')
                  .attr('transform', 'translate(' + chartWidth / 2 + ',' + chartHeight / 2 + ')')
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
                  .text(function(d, i) {
                    return scope.validateChartText(d.key);
                  })
                  .classed('statistics-legend-text no-select', true)
                  .attr('data-toggle', 'tooltip')
                  .attr('data-placement', 'right')
                  .attr('title', function(d) {
                    return scope.validateChartText(d.key) + ': ' + d.value;
                      });
            };
          }
        };
      });
}());
