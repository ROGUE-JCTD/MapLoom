(function() {

  var module = angular.module('loom_add_server_directive', []);

  module.directive('loomAddServer',
      function(serverService, $translate) {
        return {
          templateUrl: 'addlayers/partials/addserver.tpl.html',
          link: function(scope) {
            scope.serverService = serverService;
            scope.type = 'WMS';
            scope.name = null;
            scope.url = null;

            angular.element('#server-name')[0].attributes.placeholder.value = $translate('server_name');
          }
        };
      }
  );
})();
