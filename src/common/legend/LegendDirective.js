(function() {
  var module = angular.module('loom_legend_directive', []);

  var legendOpen = true;
  //var panelWidth = 0;

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
            scope.expandLegend = function() {
              if (legendOpen === false) {
                if (angular.element('.legend-item').length > 0) {
                  angular.element('#legend-container')[0].style.visibility = 'visible';
                  angular.element('#legend-panel').collapse('show');
                  legendOpen = true;
                }
              } else {
                angular.element('#legend-panel').collapse('hide');
                legendOpen = false;

                //the timeout is so the transition will finish before hiding the div
                setTimeout(function() {
                  angular.element('#legend-container')[0].style.visibility = 'hidden';
                }, 350);
              }
            };
          }
        };
      });
}());
