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
            };

            resetVariables();

            scope.$on('getStatistics', function(evt, statistics) {
              scope.data = statistics;
            });

            function resizeModal() {
              var containerHeight = angular.element('#statistics-view-window .modal-content')[0].clientHeight;
              var headerHeight = angular.element('#statistics-view-window .modal-header')[0].clientHeight;

              var contentHeight = containerHeight - headerHeight;
              //if conatainerHeight is 0 then the modal is closed so we shouldn't bother resizing
              if (containerHeight === 0) {
                return;
              }

              element[0].parentElement.style.height = contentHeight + 'px';

              var bodyHeight = contentHeight;// - angular.element('#table-view-window .modal-footer')[0].clientHeight;
              angular.element('#statistics-view-window .modal-body')[0].style.height = bodyHeight + 'px';

              //resize the panel to account for the filter text box and padding
              angular.element('#statistics-view-window .panel')[0].style.height = bodyHeight - 134 + 'px';
            }

            $(window).resize(resizeModal);

          }
        };
      });

  module.directive('loomStatisticsBarGraph',
      function() {
        return {
          restrict: 'EA',

          link: function(scope, element, attrs) {
            var margin = parseInt(attrs.margin, 10) || 20;
            var barHeight = parseInt(attrs.barHeight, 10) || 20;
            var barPadding = parseInt(attrs.barPadding, 10) || 5;
            var labelColor = attrs.labelColor || 'black';

            var svg = d3.select(element[0])
                .append('svg')
                .style('width', '100%');

            scope.$watch('data', function(newVals, oldVals) {
              if (goog.isDefAndNotNull(newVals) && goog.isDefAndNotNull(newVals.barData)) {
                scope.render(newVals.barData);
              }
            }, true);

            scope.render = function(data) {
              svg.selectAll('*').remove();

              console.log('>>> Rendering bar chart data: ', data);

              if (!data) {
                return;
              }

              var width = d3.select(element[0]).node().offsetWidth + margin,
                  height = data.length * (barHeight + barPadding),
                  color = d3.scale.category20(),
                  xScale = d3.scale.linear()
                      .domain([0, d3.max(data, function(d) {
                        return d.score;
                      })])
                      .range([0, width]);

              // set the height based on the calculations above
              svg.attr('height', height);

              //create the rectangles for the bar chart
              svg.selectAll('rect')
                  .data(data).enter()
                  .append('rect')
                  .attr('height', barHeight)
                  .attr('width', 300)
                  .attr('x', Math.round(margin / 2))
                  .attr('y', function(d, i) {
                    return i * (barHeight + barPadding);
                  })
                  .attr('fill', function(d) { return color(d.score); })
                  .attr('width', function(d) {
                    return xScale(d.score);
                  });

              svg.selectAll('text')
                  .data(data)
                  .enter()
                  .append('text')
                  .attr('fill', labelColor)
                  .attr('y', function(d, i) {
                    return i * (barHeight + barPadding) + 15;
                  })
                  .attr('x', 15)
                  .text(function(d) {
                    return d.name + ' (scored: ' + d.score + ')';
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

            //d3.select(element[0])

            scope.$watch('data', function(newVals, oldVals) {
              console.log('>>> Data has changed: ', newVals);
              if (goog.isDefAndNotNull(newVals) && goog.isDefAndNotNull(newVals.statistics) &&
                  goog.isDefAndNotNull(newVals.statistics.uniqueValues)) {
                scope.render(newVals.statistics.uniqueValues);
              }
            }, true);

            scope.reset = function() {
              $('#pie-chart').remove();
            };

            scope.render = function(data) {

              if (!data) {
                return;
              } else {
                scope.reset();
              }

              var margin = {top: 10, bottom: 10, left: 10, right: 10};
              //var w = width - margin.left - margin.right;
              var divWidth = 550 / 2;
              var h = 300 - margin.top - margin.bottom;
              var r = (h - 20) / 2;
              var color = d3.scale.category20();

              data = d3.entries(data);

              var svg = d3.select(element[0])
                  .append('svg:svg')
                  .attr('id', 'pie-chart')
                  .data([data])
                  .attr('width', '100%')
                  .attr('height', h)
                  .append('svg:g')
                  .attr('transform', 'translate(' + divWidth / 2 + ',' + r + ')');

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
                  .classed({'pie-chart-slice': true, 'black-stroke': true})
                  .attr('tooltip-append-to-body', true)
                  .attr('tooltip', function(d) {
                    return d.key;
                  })
                  .attr('id', function(d, index) {
                    return 'pie-chart-slice-path-' + index;})
                  .attr('d', function(d) {
                    console.log(arc(d));
                    return arc(d);
                  });

              arcs.append('text')
                  .classed({'pie-chart-text': true, 'no-select': true})
                  .attr('id', function(d, index) {
                    return 'pie-chart-slice-text-' + index;})
                  .attr('transform', function(d) {
                    d.innerRadius = 0;
                    d.outerRadius = r;
                    return 'translate(' + arc.centroid(d) + ')';}).attr('text-anchor', 'middle').text(function(d, i) {
                    return data[i].key;}
                  );

              var addSliceHoverClasses = function(event) {
                var target = '#' + event.currentTarget.id;
                classes = {};
                classes[sliceHoverClass] = true;
                d3.select(target).classed(classes);
                $(target).tooltip({title: 'test'});
                $(target).tooltip('show');
              };

              var removeSliceHoverClasses = function(event) {
                var target = '#' + event.currentTarget.id;
                classes = {};
                classes[sliceHoverClass] = false;
                d3.select(target).classed(classes);
                $(target).tooltip('hide');
              };

              for (var index = 0; index < data.length; index++) {
                var pathSelector = '#pie-chart-slice-path-' + index;
                $(pathSelector).hover(addSliceHoverClasses, removeSliceHoverClasses);
              }
            };
          }
        };
      });
}());
