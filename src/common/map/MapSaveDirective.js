(function() {

  var module = angular.module('loom_savemap_directive', []);

  module.directive('loomSaveMap',
      function(mapService, configService) {
        return {
          restrict: 'AC',
          templateUrl: 'map/partial/savemap.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapService = mapService;
            scope.configService = configService;
          }
        };
      });
})();
