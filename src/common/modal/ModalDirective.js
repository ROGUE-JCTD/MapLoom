(function() {

  var module = angular.module('loom_modal_directive', []);

  module.directive('loomModal',
      function() {
        return {
          replace: true,
          transclude: true,
          scope: {
            title: '@modalTitle'
          },
          templateUrl: 'modal/partials/modal.tpl.html'
        };
      }
  );
})();
