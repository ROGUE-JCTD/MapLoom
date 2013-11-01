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
            scope.isBaseLayer = function(layer) {
              if (layer.source_ instanceof ol.source.OSM) {
                return true;
              } else {
                return false;
              }
            };
            scope.expandLegend = function() {
              if (legendOpen === false) {
                //check to see if there is any content in the legend and expand it if there is
                if (angular.element('.legend-item').length > 0) {
                  angular.element('#legend-panel').collapse('show');
                  element[0].style.width = '250px';
                  legendOpen = true;
                }
              } else {
                angular.element('#legend-panel').collapse('hide');
                element[0].style.width = '90px';
                legendOpen = false;
              }
            };
          }
        };
      });
}());
