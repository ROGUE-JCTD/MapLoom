(function() {

  var module = angular.module('loom_addlayers_directive', []);

  module.directive('loomAddlayers',
      function($rootScope, serverService, mapService, geogigService, $translate, dialogService, LayersService) {
        return {
          templateUrl: 'addlayers/partials/addlayers.tpl.html',
          link: function(scope, element) {
            scope.serverService = serverService;
            scope.currentServerId = -1;
            scope.currentServer = null;
            scope.filterLayers = null;

            angular.element('#layer-filter')[0].attributes.placeholder.value = $translate.instant('filter_layers');
            scope.setCurrentServerId = function(serverId) {
              var server = serverService.getServerById(serverId);
              if (goog.isDefAndNotNull(server)) {
                scope.currentServerId = serverId;
                scope.currentServer = server;
              }
            };

            scope.getConnectedString = function() {
              return $translate.instant('connected_as', {value: scope.currentServer.username});
            };

            // default to the Local Geoserver. Note that when a map is saved and loaded again,
            // the order of the servers might be different and MapLoom should be able to handle it accordingly
            var server = serverService.getElasticLayerConfig();
            if (goog.isDefAndNotNull(server)) {
              scope.setCurrentServerId(server.id);
            }

            scope.getCurrentServerName = function() {
              var server = serverService.getServerById(scope.currentServerId);
              if (goog.isDefAndNotNull(server)) {
                return server.name;
              }

              return '';
            };

            scope.addLayers = function(layersConfig) {
              // if the server is not a typical server and instead the hardcoded ones
              layersConfig.forEach(function(config) {
                LayersService.addLayer(config, scope.currentServerId);
              });
            };

            scope.changeCredentials = function() {
              serverService.changeCredentials(scope.currentServer);
            };

            scope.filterAddedLayers = function(layerConfig) {
              return LayersService.filterAddedLayers(layerConfig, scope.currentServerId, layerConfig.Name);
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                scope.filterLayers = null;
              }
            };
            scope.$on('modal-closed', closeModal);

            scope.clearFilter = function() {
              scope.filterLayers = '';
            };

            scope.$on('layers-loaded', function() {
              if (!scope.$$phase && !$rootScope.$$phase) {
                scope.$apply();
              }
            });

            // when a server is added to server service, if we do not have a server selected, if localGeoserver
            // is added, make it the selected server
            scope.$on('server-added', function(event, id) {
              var server = serverService.getServerById(id);
              if (server.isLocal) {
                scope.setCurrentServerId(id);
              } else if (scope.currentServerId == -1 && server === serverService.getServerByName('OpenStreetMap')) {
                scope.setCurrentServerId(id);
              }
            });

            scope.removeServer = function(id) {
              var layers = mapService.getLayers(true, true);
              for (var index = 0; index < layers.length; index++) {
                if (layers[index].get('metadata').serverId == id) {
                  dialogService.error($translate.instant('server'),
                      $translate.instant('remove_layers_first'), [$translate.instant('btn_ok')]);
                  return;
                }
              }
              dialogService.warn($translate.instant('server'), $translate.instant('remove_server'),
                  [$translate.instant('yes_btn'), $translate.instant('no_btn')], false).then(function(button) {
                switch (button) {
                  case 0:
                    serverService.removeServer(id);
                    break;
                }
              });
            };

            scope.editServer = function(server) {
              $rootScope.$broadcast('server-edit', server);
            };

            scope.$on('server-removed', function(event, server) {
              if (scope.currentServerId == server.id) {
                scope.setCurrentServerId(serverService.getElasticLayerConfig().id);
              }
            });

            scope.$on('server-added-through-ui', function(event, id) {
              scope.setCurrentServerId(id);
            });

            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
          }
        };
      }
  );
})();
