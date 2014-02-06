(function() {

  var module = angular.module('loom_remoteselect_directive', []);

  module.directive('loomRemoteselect',
      function($translate, remoteService) {
        return {
          templateUrl: 'sync/partials/remoteselect.tpl.html',
          link: function(scope) {
            scope.remoteService = remoteService;
            scope.selectedRepo = null;
            scope.finish = function() {
              $('#remoteSelectDialog').modal('toggle');
              remoteService.verificationResult.resolve(scope.selectedRepo);
              scope.selectedRepo = null;
            };
          }
        };
      }
  );
})();
