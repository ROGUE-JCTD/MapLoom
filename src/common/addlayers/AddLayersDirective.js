(function() {

  var module = angular.module('loom_addlayers_directive', [
    'rzModule',
    'loom_addlayersfilter_directive'
  ]);

  module.directive('loomAddlayers',
      function($rootScope, serverService, mapService, geogigService, $translate, dialogService, $timeout) {
        return {
          templateUrl: 'addlayers/partials/addlayers.tpl.html',
          link: function(scope, element) {
            var searchFavorites = false;
            var searchHyper = true;
            scope.serverService = serverService;
            scope.currentServerId = -1;
            scope.currentServer = null;
            scope.filterLayers = null;
            scope.filterOptions = {
              owner: null,
              text: null,
              from: null,
              size: 10
            };
            scope.previewCenter = [40, 30];
            scope.previewZoom = 1;
            scope.previewLayers = [
              new ol.layer.Tile({
                source: new ol.source.OSM()
              })
            ];
            scope.layerConfig = {Title: 'Title'};
            scope.selectedLayer = {};
            scope.cart = [];
            cartLayerName = [];
            scope.pagination = {sizeDocuments: 1, pages: 1};

            var resetText = function() {
              scope.filterOptions.text = null;
            };
            var resetOwner = function() {
              scope.filterOptions.owner = null;
            };
            var resetFrom = function() {
              scope.filterOptions.from = null;
            };
            //angular.element('#layer-filter')[0].attributes.placeholder.value = $translate.instant('filter_layers');
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

            var clearFilters = function() {
              resetText();
              resetOwner();
              resetFrom();
              searchFavorites = false;
              searchHyper = false;
            };

            scope.defaultSearch = function() {
              clearFilters();
              scope.search();
            };

            scope.searchMyUploads = function() {
              clearFilters();
              scope.filterOptions.owner = true;
              scope.search();
            };

            scope.searchHyper = function() {
              clearFilters();
              searchHyper = true;
              scope.search();
            };

            scope.searchMyFavorites = function() {
              clearFilters();
              searchFavorites = true;
              scope.search();
            };

            scope.applyFilters = function() {
            };

            scope.getResults = function() {
              return serverService.getLayersConfigByName('Local Geoserver');
            };

            scope.nextPage = function() {
              if (scope.filterOptions.from !== null) {
                scope.filterOptions.from += scope.filterOptions.size;
              } else {
                scope.filterOptions.from = scope.filterOptions.size;
              }
              scope.search();
            };
            scope.hasNext = function() {
              return scope.getResults().length === scope.filterOptions.size;
            };
            scope.hasPrevious = function() {
              return scope.filterOptions.from !== null;
            };
            scope.previousPage = function() {
              if (scope.filterOptions.from !== null) {
                scope.filterOptions.from -= scope.filterOptions.size;
                if (scope.filterOptions.from < 1) {
                  scope.filterOptions.from = null;
                }
              }
              scope.search();
            };

            scope.search = function() {
              if (searchFavorites) {
                serverService.addSearchResultsForFavorites(serverService.getServerLocalGeoserver(), scope.filterOptions);
              } else if (searchHyper) {
                serverService.addSearchResultsForHyper(serverService.getServerLocalGeoserver(), scope.filterOptions);
                getSizedocuments();
              } else {
                serverService.populateLayersConfigElastic(serverService.getServerLocalGeoserver(), scope.filterOptions);
              }
            };

            function getSizedocuments() {
              serverService.getNumberOfDocsForHyper(serverService.getServerLocalGeoserver(), function(docsStats) {
                if (docsStats) {
                  scope.pagination.sizeDocuments = docsStats.indices.hypermap.total.docs.count || scope.sizeDocuments;
                  scope.pagination.pages = Math.floor(scope.pagination.sizeDocuments / scope.filterOptions.size);
                }
              });
            }

            scope.search();
            scope.getCurrentServerName = function() {
              var server = serverService.getServerById(scope.currentServerId);
              if (goog.isDefAndNotNull(server)) {
                return server.name;
              }

              return '';
            };

            scope.selectRow = function(layerConfig) {
              scope.selectedLayer = layerConfig;
              scope.addToCart(layerConfig);
            };

            var addLayer = function(layerConfig) {
              if (layerConfig.add) {
                // NOTE: minimal config is the absolute bare minimum info that will be send to webapp containing
                //       maploom such as geonode. At this point, only source (server id), and name are used. If you
                //       find the need to add more parameters here, you need to put them in MapService.addLayer
                //       instead. that's because MapService.addLayer may be invoked from here, when a saved
                //       map is opened, or when a map is created from a layer in which case the logic here will be
                //       skipped! note, when MapService.addLayer is called, server's getcapabilities (if applicable)
                //       has already been resolved so you can used that info to append values to the layer.
                var minimalConfig = {
                  name: layerConfig.Name,
                  source: scope.currentServerId
                };
                mapService.addLayer(minimalConfig);
                mapService.zoomToExtentForProjection(layerConfig.extent, ol.proj.get(layerConfig.CRS));
              }
            };
            scope.addLayers = function() {

              scope.selectedLayer = {};
              $('#add-layer-dialog').modal('hide');
              scope.cart.forEach(addLayer);
              scope.clearCart();
            };

            var bboxStyle = function() {
              return new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: 'blue',
                  width: 2
                }),
                fill: new ol.style.Fill({
                  color: 'rgba(0, 0, 255, 0.05)'
                })
              });
            };

            scope.previewLayer = function(layerConfig) {
              layerConfig.CRS = ['EPSG:4326'];
              scope.currentLayer = layerConfig;
              var layer = mapService.createLayerWithFullConfig(layerConfig, scope.currentServerId);
              var bboxLayer = mapService.createGeoJSONLayerFromCoordinatesWithProjection(layerConfig.extent, mapService.getProjection());
              bboxLayer.setStyle(bboxStyle());
              scope.previewLayers = [
                new ol.layer.Tile({
                  source: new ol.source.OSM()
                }),
                layer,
                bboxLayer
              ];
            };

            scope.addToCart = function(layerConfig) {
              var layerCopi = layerConfig.Name;
              var configIndex = cartLayerName.indexOf(layerCopi);
              if (configIndex === -1) {
                cartLayerName.push(layerCopi);
                scope.cart.push(layerConfig);
              } else {
                cartLayerName.splice(configIndex, 1);
                scope.cart.splice(configIndex, 1);
              }
            };

            scope.isInCart = function(layerConfig) {
              return cartLayerName.indexOf(layerConfig.Name) !== -1 ? true : false;
            };

            scope.clearCart = function() {
              scope.cart = [];
              cartLayerName = [];
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
