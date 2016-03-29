(function() {

  var module = angular.module('loom_welcome_tour', []);

  module.directive('loomWelcomeTour',
      function(storyService, configService, $translate) {
        return {
          templateUrl: 'tour/partial/tour.tpl.html',
          link: function(scope, element, attrs) {
            scope.storyService = storyService;
            scope.configService = configService;
            scope.translate = $translate;
          }
        };
      });
})();
