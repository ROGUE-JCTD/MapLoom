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
                  .transition()
                  .duration(1000)
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
}());
