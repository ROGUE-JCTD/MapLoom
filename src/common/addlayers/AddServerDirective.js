(function() {

  var module = angular.module('loom_add_server_directive', []);

  module.directive('loomAddServer',
      function(serverService, $translate, $rootScope, dialogService, mapService) {
        return {
          templateUrl: 'addlayers/partials/addserver.tpl.html',
          link: function(scope, element) {
            scope.serverService = serverService;
            scope.loading = false;

            scope.reset = function() {
              scope.type = 'WMS';
              scope.name = null;
              scope.url = null;
              scope.editing = false;
              scope.server = null;
            };

            scope.reset();

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
              scope.loading = true;
              serverService.addServer(config).then(function(server) {
                scope.loading = false;
                $rootScope.$broadcast('server-added-through-ui', server.id);
                scope.reset();
                element.closest('.modal').modal('hide');
              }, function() {
                scope.loading = false;
                dialogService.error($translate.instant('error'),
                    $translate.instant('failed_to_add_server'), [$translate.instant('btn_ok')]);
              });
            };

            scope.getPattern = function() {
              //if (scope.type === 'WMS') {
              //  return new RegExp('/wms');
              //} else {
              //  return new RegExp('');
              //}
              return new RegExp('');
            };

            scope.getPlaceholder = function() {
              if (scope.type === 'WMS') {
                return 'http://url/geoserver/wms';
              } else if (scope.type === 'TMS') {
                return 'http://url/1.0.0/';
              }
            };

            scope.editServer = function() {
              scope.server.name = scope.name;
              if (goog.isDefAndNotNull(scope.server.config)) {
                scope.server.config.name = scope.name;
              }
              if (scope.server.url !== scope.url || (scope.server.isVirtualService === true &&
                  scope.url !== scope.server.virtualServiceUrl)) {
                var layers = mapService.getLayers(true, true);
                for (var index = 0; index < layers.length; index++) {
                  if (layers[index].get('metadata').serverId == scope.server.id) {
                    dialogService.error($translate.instant('server'),
                        $translate.instant('remove_layers_first'), [$translate.instant('btn_ok')]);
                    element.closest('.modal').modal('hide');
                    scope.reset();
                    return;
                  }
                }
                dialogService.warn($translate.instant('server'), $translate.instant('edit_server'),
                    [$translate.instant('yes_btn'), $translate.instant('no_btn')], false).then(function(button) {
                  switch (button) {
                    case 0:
                      scope.server.url = scope.url;
                      serverService.replaceVirtualServiceUrl(scope.server);
                      scope.loading = true;
                      var doWork = function() {
                        serverService.populateLayersConfig(scope.server, true).then(function() {
                          scope.loading = false;
                          element.closest('.modal').modal('hide');
                          scope.reset();
                        }, function() {
                          scope.loading = false;
                          element.closest('.modal').modal('hide');
                          scope.reset();
                        });
                      };
                      dialogService.promptCredentials(scope.server.url, false).then(function(credentials) {
                        scope.server.username = credentials.username;
                        scope.server.authentication =
                            $.base64.encode(credentials.username + ':' + credentials.password);

                        var serverBaseUrl = removeUrlLastRoute(scope.server.url);
                        var serverAuthenticationUrl = serverBaseUrl + '/rest/settings.json';
                        serverAuthenticationUrl = serverAuthenticationUrl.replace('http://', 'http://null:null@');
                        ignoreNextScriptError = true;
                        $.ajax({
                          url: serverAuthenticationUrl,
                          type: 'GET',
                          dataType: 'jsonp',
                          jsonp: 'callback',
                          error: function() {
                            ignoreNextScriptError = false;
                          },
                          complete: doWork
                        });
                      }, function(reject) {
                        scope.server.username = $translate.instant('anonymous');
                        scope.server.authentication = undefined;
                        doWork();
                      });
                  }
                });
              } else {
                element.closest('.modal').modal('hide');
                scope.reset();
              }
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                scope.reset();
              }
            };

            scope.$on('modal-closed', closeModal);

            scope.$watch('type', function() {
              if (!scope.editing) {
                scope.url = null;
              }
            });

            scope.$on('server-edit', function(event, server) {
              element.closest('.modal').modal('show');
              if (server.ptype == 'gxp_tmssource') {
                scope.type = 'TMS';
              } else if (server.ptype == 'gxp_wmscsource') {
                scope.type = 'WMS';
              }
              scope.editing = true;
              scope.name = server.name;
              scope.url = server.url;

              if (server.isVirtualService === true) {
                scope.url = server.virtualServiceUrl;
              }

              scope.server = server;
            });
          }
        };
      }
  );
})();
