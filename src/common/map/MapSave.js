(function() {

  var module = angular.module('loom_map_save', []);

  module.directive('loomMapSave',
      function(storyService, configService, $translate) {
        return {
          templateUrl: 'map/partial/mapsave.tpl.html',
          link: function(scope, element, attrs) {
            scope.storyService = storyService;
            scope.configService = configService;
            scope.translate = $translate;
          }
        };
      });
})();
