(function() {

  var module = angular.module('loom_map_properties', []);

  module.directive('loomMapProperties',
      function(storyService, configService, $translate) {
        return {
          templateUrl: 'map/partial/mapproperties.tpl.html',
          link: function(scope, element, attrs) {
            scope.storyService = storyService;
            scope.configService = configService;
            scope.translate = $translate;
          }
        };
      });
})();
