(function() {

  var module = angular.module('loom_add_server_directive', []);

  module.directive('loomAddServer',
      function(serverService, $translate, $rootScope) {
        return {
          templateUrl: 'addlayers/partials/addserver.tpl.html',
          link: function(scope) {
            scope.serverService = serverService;
            scope.type = 'WMS';
            scope.name = null;
            scope.url = null;
            scope.addServer = function(info) {
              var id = serverService.addServer(info);
              $rootScope.$broadcast('server-added', id);
              scope.type = 'WMS';
              scope.name = null;
              scope.url = null;
            };

            scope.getPattern = function() {
              if (scope.type === 'WMS') {
                return new RegExp('/wms');
              } else {
                return new RegExp('');
              }
            };

            scope.getPlaceholder = function() {
              if (scope.type === 'WMS') {
                return 'http://url/wms';
              } else if (scope.type === 'TMS') {
                return 'http://url/1.0.0/';
              }
            };

            scope.$watch('type', function() {
              scope.name = null;
              scope.url = null;
            });
          }
        };
      }
  );
})();
