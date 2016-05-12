(function() {

  var module = angular.module('loom_map_publish', []);

  module.directive('loomMapPublish',
      function(storyService, configService, $translate) {
        return {
          templateUrl: 'map/partial/mappublish.tpl.html',
          link: function(scope, element, attrs) {
            scope.storyService = storyService;
            scope.configService = configService;
            scope.translate = $translate;
          }
        };
      });
})();
