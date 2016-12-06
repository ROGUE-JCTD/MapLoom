(function() {

  var module = angular.module('loom_helpicon_directive', []);

  module.directive('loomHelpicon',
      function($rootScope, configService, $translate, $http) {
        return {
          templateUrl: 'addlayers/partials/helpicon.tpl.html',
          scope: {
            helpLink: '@help'
          },
          link: function(scope, element, attrs) {
            scope.showHelp = function() {
              console.info('This should probably show a tooltip.');
              console.info('Setting @help to HTML or a URL should do it.');
            };
          }
        };
      }
  );
})();
