(function() {
  var module = angular.module('loom_legend_directive', []);

  var legendOpen = false;

  module.directive('loomLegend',
      function($rootScope, mapService, serverService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'legend/partial/legend.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope, element) {
            scope.mapService = mapService;
            scope.serverService = serverService;

            var openLegend = function() {
              angular.element('#legend-container')[0].style.visibility = 'visible';
              angular.element('#legend-panel').collapse('show');
              legendOpen = true;
            };
            var closeLegend = function() {
              angular.element('#legend-panel').collapse('hide');
              legendOpen = false;

              //the timeout is so the transition will finish before hiding the div
              setTimeout(function() {
                angular.element('#legend-container')[0].style.visibility = 'hidden';
              }, 350);
            };

            scope.toggleLegend = function() {
              if (legendOpen === false) {
                if (angular.element('.legend-item').length > 0) {
                  openLegend();
                }
              } else {
                closeLegend();
              }
            };

            scope.getLegendUrl = scope.mapService.getLegendUrl;

            scope.$on('layer-added', function() {
              if (legendOpen === false) {
                openLegend();
              }
            });

            scope.$on('layerRemoved', function() {
              //close the legend if the last layer is removed
              if (legendOpen === true && angular.element('.legend-item').length == 1) {
                closeLegend();
              }
            });
          }
        };
      });
}());
