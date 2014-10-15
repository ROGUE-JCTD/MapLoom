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
              scope.selected = 'pie';
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
            var divHeight = 300;
            var margin = {top: 30, bottom: 30, left: 70, right: 10};

            scope.$watch('data', function(newVals, oldVals) {
              if (goog.isDefAndNotNull(newVals) && goog.isDefAndNotNull(newVals)) {
                scope.data = newVals;
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

              var barPadding = 8;
              var histogram = d3.entries(data.statistics.uniqueValues);
              var chartWidth = divWidth + margin.left + margin.right;
              var width = (chartWidth / histogram.length) - barPadding;
              var height = 300;
              var color = scope.color();
              var yScale = d3.scale.linear().domain([data.statistics.min, data.statistics.max]).range([height, 0]);
              var sliceHoverClass = 'path-red-fill';

              var svg = d3.select(element[0])
                  .append('svg:svg')
                  .attr('width', '100%');

              var yAxis = d3.svg.axis()
                  .scale(yScale)
                  .orient('left');

              svg.append('g')
                  .attr('class', 'x axis')
                  .attr('transform', 'translate(' + width + ',0)')
                  .call(yAxis);

              // set the height based on the calculations above
              svg.attr('height', height);

              //create the rectangles for the bar chart
              svg.selectAll('rect')
                  .data(histogram).enter()
                  .append('rect')
                  .attr('id', function(d, index) {
                    return 'histogram-chart-slice-path-' + index;})
                  .classed('black-stroke', true)
                  .attr('height', function(d) { return height - yScale(d.value); })
                  .attr('width', width)
                  .attr('y', function(d) {
                    return yScale(d.value) + margin.top;
                  })
                  .attr('x', function(d, i) {
                    return i * (width + barPadding) + margin.left;
                  })
                  .attr('fill', function(d, i) {
                    return color(i);
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
                var pathSelector = '#histogram-chart-slice-path-' + index;
                $(pathSelector).hover(addSliceHoverClasses, removeSliceHoverClasses);
              }

              scope.renderLegend(uniqueValues);
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
                  .attr('transform', 'translate(' + divWidth / 2 + ',' + divHeight / 2 + ')');

              var w = $('#pie-chart').width();
              console.log('WDITH:', w);

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

              tr.append('td').text(function(d) {
                return d.key;
              })
                  .classed('statistics-legend-text', true);
            };
          }
        };
      });
}());
