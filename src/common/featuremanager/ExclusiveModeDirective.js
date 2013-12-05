(function() {

  var module = angular.module('loom_exclusive_mode_directive', []);

  module.directive('loomExclusiveMode',
      function(exclusiveModeService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'featuremanager/partial/exclusivemode.tpl.html',
          link: function(scope) {
            scope.exclusiveModeService = exclusiveModeService;
          }
        };
      }
  );
})();
