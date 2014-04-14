(function() {

  var module = angular.module('loom_password_directive', []);

  module.directive('loomPasswordDialog',
      function() {
        return {
          replace: true,
          templateUrl: 'modal/partials/password.tpl.html'
        };
      }
  );
})();
