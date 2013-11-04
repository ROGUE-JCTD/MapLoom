(function() {

  var module = angular.module('loom_modal_directive', []);

  module.directive('loomModal',
      function() {
        return {
          replace: true,
          transclude: true,
          scope: {
            title: '@modalTitle',
            closeButton: '@closeButton'
          },
          templateUrl: 'modal/partials/modal.tpl.html',
          link: function(scope, element, attrs) {
            attrs.$observe('closeButton', function(val) {
              if (!angular.isDefined(val)) {
                scope.closeButton = true;
              }
            });
          }
        };
      }
  );
})();
