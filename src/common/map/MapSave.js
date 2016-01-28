(function() {

  var module = angular.module('loom_map_save', []);

  module.directive('loomMapSave',
      function(mapService, configService, $translate) {
        return {
          templateUrl: 'map/partial/mapsave.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapService = mapService;
            scope.configService = configService;
            scope.translate = $translate;
          }
        };
      });
})();
