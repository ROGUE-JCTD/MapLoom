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
              scope.selectedChartType = 'pie';
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
              scope.selectedChartType = chartType;
            };

            scope.isSelected = function(chartType) {
              return scope.selectedChartType === chartType;
            };

          }
        };
      });

  module.directive('loomStatisticsBarGraph',
      function() {
        return {
          restrict: 'EA',

          link: function(scope, element, attrs) {
            //var margin = parseInt(attrs.margin, 10) || 20;
            //var barHeight = parseInt(attrs.barHeight, 10) || 20;
            //var barPadding = parseInt(attrs.barPadding, 10) || 5;
            //var labelColor = attrs.labelColor || 'black';

            var svg = d3.select(element[0])
                .append('svg')
                .style('width', '100%');

            scope.$watch('data', function(newVals, oldVals) {
              if (goog.isDefAndNotNull(newVals) && goog.isDefAndNotNull(newVals)) {
                scope.render(newVals);
              }
            }, true);

            scope.render = function(data) {
              svg.selectAll('*').remove();

              console.log('>>> Rendering bar chart data: ', data);

              if (!data || !(goog.isDefAndNotNull(data.statistics) &&
                  goog.isDefAndNotNull(data.statistics.uniqueValues))) {
                return;
              }

              var margin = {top: 30, bottom: 30, left: 10, right: 10};
              var barPadding = 8;

              histogram = d3.entries(data.statistics.uniqueValues);

              var divWidth = 538;
              var chartWidth = divWidth - (margin.left - margin.right);
              var width = (chartWidth / histogram.length) - barPadding;
              var height = 300;
              var color = d3.scale.category20();
              var yScale = d3.scale.linear().domain([data.statistics.min, data.statistics.max]).range([height, 0]);


              // set the height based on the calculations above
              svg.attr('height', height);

              //create the rectangles for the bar chart
              svg.selectAll('rect')
                  .data(histogram).enter()
                  .append('rect')
                  .classed('black-stroke', true)
                  .attr('height', function(d) { return height - yScale(d.value); })
                  .attr('width', width)
                  .attr('y', function(d) {
                    return yScale(d.value);
                  })
                  .attr('x', function(d, i) {
                    return i * (width + barPadding);
                  })
                  .attr('fill', function(d) {
                    return color(d.value);
                  });
            };
          }
        };
      });

  module.directive('loomStatisticsPieChart',
      function() {
        return {
          restrict: 'EA',

          link: function(scope, element, attrs) {
            var sliceHoverClass = attrs['slice-hover-class'] || 'path-red-fill';
            //var margin = parseInt(attrs.margin, 10) || 20;
            //var barHeight = parseInt(attrs.barHeight, 10) || 20;
            //var barPadding = parseInt(attrs.barPadding, 10) || 5;
            //var labelColor = attrs.labelColor || 'black';
            var labelSlices = false;

            //d3.select(element[0])

            scope.$watch('data', function(newVals, oldVals) {
              if (goog.isDefAndNotNull(newVals)) {
                scope.renders(newVals);
              }
            }, true);

            scope.reset = function() {
              $('#pie-chart').remove();
            };

            scope.renders = function(data) {

              if (!data || !(goog.isDefAndNotNull(data.statistics) &&
                  goog.isDefAndNotNull(data.statistics.uniqueValues))) {
                scope.reset();
                return;
              }

              var margin = {top: 30, bottom: 30, left: 10, right: 10};
              //var w = width - margin.left - margin.right;
              // get the width of the parent div with this (after everything has rendered)
              // d3.select('#statistics-chart-area').node().offsetWidth
              var divWidth = 538;
              var divHeight = 300;
              var chartHeight = divHeight - margin.top - margin.bottom;
              var r = chartHeight / 2;
              var color = d3.scale.category20();

              uniqueValues = d3.entries(data.statistics.uniqueValues);

              var legendDiv = d3.select(element[0])
                  .append('div')
                  .attr('class', 'pie-chart-legend');

              var legend = legendDiv
                  .append('table')
                  .attr('class', 'pie-chart-legend-table');

              var tr = legend.append('tbody')
                  .selectAll('tr')
                  .data(uniqueValues)
                  .enter()
                  .append('tr')
                  .attr('id', function(d, index) {
                    return 'pie-legend-row-' + index;
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
                  .classed('pie-chart-legend-text', true);

              var svg = d3.select(element[0])
                  .append('svg:svg')
                  .attr('id', 'pie-chart')
                  .data([uniqueValues])
                  .attr('width', divWidth)
                  .attr('height', divHeight)
                  .append('svg:g').
                  attr('transform', 'translate(' + divWidth / 2 + ',' + divHeight / 2 + ')');

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

              if (labelSlices) {
                arcs.append('text')
                    .classed('pie-chart-text no-select', true)
                    .attr('id', function(d, index) {
                      return 'pie-chart-slice-text-' + index;})
                    .attr('transform', function(d) {
                      d.innerRadius = 0;
                      d.outerRadius = r;
                      return 'translate(' + arc.centroid(d) + ')';})
                    .attr('text-anchor', 'middle')
                    .text(function(d, i) {
                      return uniqueValues[i].key;}
                    );
              }

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
          }
        };
      });
}());
