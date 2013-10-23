(function() {

  var module = angular.module('loom_dialog_directive', []);

  module.directive('loomDialog',
      function() {
        return {
          replace: true,
          templateUrl: 'modal/partials/dialog.tpl.html'
        };
      }
  );
})();
