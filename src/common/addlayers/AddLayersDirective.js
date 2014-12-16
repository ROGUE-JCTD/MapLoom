(function() {

  var module = angular.module('loom_addlayers_directive', []);

  module.directive('loomAddlayers',
      function($rootScope, serverService, mapService, geogigService, $translate, dialogService) {
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
            var server = serverService.getServerLocalGeoserver();
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
              var length = layersConfig.length;
              for (var index = 0; index < length; index += 1) {
                var config = layersConfig[index];
                if (config.add) {
                  // NOTE: minimal config is the absolute bare minimum info that will be send to webapp containing
                  //       maploom such as geonode. At this point, only source (server id), and name are used. If you
                  //       find the need to add more parameters here, you need to put them in MapService.addLayer
                  //       instead. that's because MapService.addLayer may be invoked from here, when a saved
                  //       map is opened, or when a map is created from a layer in which case the logic here will be
                  //       skipped! note, when MapService.addLayer is called, server's getcapabilities (if applicable)
                  //       has already been resolved so you can used that info to append values to the layer.
                  var minimalConfig = {
                    name: config.Name,
                    source: scope.currentServerId
                  };
                  mapService.addLayer(minimalConfig);

                  config.add = false;
                }
              }
            };

            scope.changeCredentials = function() {
              serverService.changeCredentials(scope.currentServer);
            };

            scope.filterAddedLayers = function(layerConfig) {
              var show = true;
              var layers = mapService.getLayers(true, true);
              for (var index = 0; index < layers.length; index++) {
                var layer = layers[index];
                if (goog.isDefAndNotNull(layer.get('metadata')) &&
                    goog.isDefAndNotNull(layer.get('metadata').config)) {
                  var conf = layer.get('metadata').config;
                  if (conf.source === scope.currentServerId) {
                    if (conf.name === layerConfig.Name) {
                      show = false;
                      break;
                    }
                  }
                }
              }
              return show;
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
              if (server === serverService.getServerLocalGeoserver()) {
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
                scope.setCurrentServerId(serverService.getServerLocalGeoserver().id);
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
