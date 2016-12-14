(function() {

  var module = angular.module('loom_helpicon_directive', []);

  module.directive('loomHelpicon',
      function($rootScope, configService, $translate, $http) {
        return {
          templateUrl: 'addlayers/partials/helpicon.tpl.html',
          scope: {
            helpKey: '@help'
          },
          link: function(scope, element, attrs) {
            scope.helpText = $translate.instant(scope.helpKey);
          }
        };
      }
  );
})();
