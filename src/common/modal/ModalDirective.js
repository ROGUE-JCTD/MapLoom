(function() {

  var module = angular.module('loom_modal_directive', []);

  module.directive('loomModal',
      function($rootScope) {
        return {
          replace: true,
          transclude: true,
          scope: {
            title: '@modalTitle',
            closeButton: '@closeButton'
          },
          templateUrl: 'modal/partials/modal.tpl.html',
          link: function(scope, element, attrs) {
            scope.contentHidden = true;

            attrs.$observe('closeButton', function(val) {
              if (!angular.isDefined(val)) {
                scope.closeButton = true;
              }
            });
            scope.closeModal = function() {
              $rootScope.$broadcast('modal-closed', element);
              element.closest('.modal').modal('hide');
            };
          }
        };
      }
  );
})();
