(function() {

  var module = angular.module('loom_map_properties', []);

  module.directive('loomMapProperties',
      function(mapService, configService, $translate) {
        console.log(configService);
        return {
          templateUrl: 'map/partial/mapproperties.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapService = mapService;
            scope.configService = configService;
            scope.translate = $translate;
          }
        };
      });
})();
