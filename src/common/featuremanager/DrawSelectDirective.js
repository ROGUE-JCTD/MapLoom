(function() {

  var module = angular.module('loom_drawselect_directive', []);

  module.directive('loomDrawselect',
      function($translate, mapService) {
        return {
          templateUrl: 'featuremanager/partial/drawselect.tpl.html',
          link: function(scope) {
            scope.mapService = mapService;
            scope.drawType = null;
            scope.geometryTypes = ['Point', 'LineString', 'Polygon'];
          }
        };
      }
  );
})();

