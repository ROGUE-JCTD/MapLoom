(function() {

  var module = angular.module('loom_add_server_directive', []);

  module.directive('loomAddServer',
      function(serverService, $translate, $rootScope) {
        return {
          templateUrl: 'addlayers/partials/addserver.tpl.html',
          link: function(scope, element) {
            scope.serverService = serverService;
            scope.type = 'WMS';
            scope.name = null;
            scope.url = null;

            scope.addServer = function(info) {
              var config = {
                name: info.name,
                url: info.url
              };

              if (info.type === 'TMS') {
                config.ptype = 'gxp_tmssource';
                if (goog.isDefAndNotNull(config.url) && config.url.lastIndexOf('/') !== config.url.length - 1) {
                  config.url += '/';
                }
              } else {
                config.ptype = 'gxp_wmscsource';
              }

              serverService.addServer(config).then(function(server) {
                $rootScope.$broadcast('server-added-through-ui', server.id);
              });

              scope.type = 'WMS';
              scope.name = null;
              scope.url = null;

              element.closest('.modal').modal('hide');
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
