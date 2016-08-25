(function() {

  var module = angular.module('loom_registrylayers_directive', [
    'rzModule',
    'loom_addlayersfilter_directive'
  ]);

  module.directive('loomRegistrylayers',
      function($rootScope, configService, serverService, mapService, geogigService, $translate, dialogService, $timeout, LayersService) {
        return {
          templateUrl: 'addlayers/partials/registryLayers.tpl.html',
          link: function(scope, element) {
            var searchFavorites = false;
            var searchHyper = true;
            var mapPreviewChangeCount = 0;
            var savedLayers = configService.configuration.map['layers'];
            scope.currentServerId = -1;
            scope.filterOptions = {
              owner: null,
              text: null,
              docsPage: 1,
              size: 10,
              minYear: null,
              maxYear: null,
              mapPreviewCoordinatesBbox: null,
              histogramFlag: true
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
            cartLayerId = [];
            scope.pagination = {sizeDocuments: 1, pages: 1};
            scope.catalogList = [];

            var server = serverService.getRegistryLayerConfig();
            if (goog.isDefAndNotNull(server)) {
              scope.currentServerId = 0;
            }

            var resetText = function() {
              scope.filterOptions.text = null;
            };
            var resetOwner = function() {
              scope.filterOptions.owner = null;
            };
            var resetDocsPage = function() {
              scope.filterOptions.docsPage = 1;
            };
            var resetMapPreview = function() {
              if (mapPreviewChangeCount > 1) {
                mapPreviewChangeCount = 0;
                scope.filterOptions.mapPreviewCoordinatesBbox = null;
                $rootScope.$broadcast('resetMap');
              }
            };

            var clearFilters = function() {
              resetText();
              resetOwner();
              resetDocsPage();
              searchFavorites = false;
              searchHyper = false;
            };

            scope.resetDocsPage = resetDocsPage;

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
              resetMapPreview();
              scope.slider = scope.defaultSliderValue();
              searchHyper = true;
              scope.search();
            };

            scope.searchMyFavorites = function() {
              clearFilters();
              searchFavorites = true;
              scope.search();
            };

            scope.getResults = function() {
              return server.layersConfig;
            };


            scope.nextPage = function() {
              scope.filterOptions.docsPage++;
              scope.search();
            };
            scope.hasNext = function() {
              if (scope.pagination.currentPage > 0) {
                return scope.pagination.pages > scope.pagination.currentPage;
              }
              return false;
            };
            scope.hasPrevious = function() {
              return scope.filterOptions.docsPage > 1;
            };
            scope.previousPage = function() {
              if (scope.filterOptions.docsPage > 1) {
                scope.filterOptions.docsPage--;
              }
              scope.search();
            };

            scope.search = function() {
              searchRangeValues();
              if (searchFavorites) {
                serverService.addSearchResultsForFavorites(serverService.getRegistryLayerConfig(), scope.filterOptions);
              } else if (searchHyper) {
                serverService.addSearchResultsForHyper(server, scope.filterOptions, scope.catalog);
              } else {
                serverService.populateLayersConfigElastic(serverService.getRegistryLayerConfig(), scope.filterOptions);
              }
            };

            scope.$on('totalOfDocs', function(event, totalDocsCount) {
              scope.pagination.sizeDocuments = totalDocsCount;
              scope.pagination.showdocs = scope.pagination.sizeDocuments < 10 ? scope.pagination.sizeDocuments : scope.filterOptions.size;
              scope.pagination.docsSoFar = goog.isDefAndNotNull(scope.filterOptions.from) ? scope.filterOptions.from + 10 : scope.filterOptions.size;
              scope.pagination.docsSoFar = scope.pagination.docsSoFar > totalDocsCount ? totalDocsCount : scope.pagination.docsSoFar;
              scope.pagination.currentPage = scope.filterOptions.docsPage;
              scope.pagination.pages = Math.ceil(scope.pagination.sizeDocuments / scope.filterOptions.size);
            });

            $('#registry-layer-dialog').on('shown.bs.modal', function() {
              serverService.getCatalogList(function(catalogList) {
                scope.catalogList = catalogList.data;
                scope.catalog = scope.catalogList[0];
                scope.search();
              });
            });

            scope.$on('slideEnded', function() {
              resetDocsPage();
              scope.search();
            });
            scope.$on('changeSliderValues', function() {
              resetDocsPage();
              scope.search();
            });

            scope.$on('moveendMap', function(event, coordinates) {
              mapPreviewChangeCount++;
              if (mapPreviewChangeCount > 1) {
                coordinatesBbox = mapService.createBBoxFromCoordinatesFromProjectionIntoProjection(coordinates, mapService.getProjection(), 'EPSG:4326')[0];
                //[min_y, min_x TO max_y, max_x] from the lower-left to the upper-right.
                scope.filterOptions.mapPreviewCoordinatesBbox = '[' + coordinatesBbox[0][1] + ',' +
                    mapService.angleNormalize(coordinatesBbox[0][0]) + ' TO ' + coordinatesBbox[2][1] + ',' +
                    mapService.angleNormalize(coordinatesBbox[2][0]) + ']';
                scope.search();
              }
            });

            function searchRangeValues() {
              if (goog.isDefAndNotNull(scope.sliderValues)) {
                if (scope.slider.minValue === 0 && scope.slider.maxValue === scope.sliderValues.length - 1) {
                  scope.filterOptions.minYear = '*';
                  scope.filterOptions.maxYear = '*';
                } else {
                  scope.filterOptions.minYear = scope.sliderValues[scope.slider.minValue] + '-01-01';
                  scope.filterOptions.maxYear = scope.sliderValues[scope.slider.maxValue] + '-01-01T00:00:00';
                }
                scope.filterOptions.sliderValues = scope.sliderValues;
              }
            }

            scope.selectRow = function(layerConfig) {
              scope.selectedLayer = layerConfig;
              scope.addToCart(layerConfig);
            };

            var addLayer = function(layerConfig) {
              layerConfig['registry'] = true;
              LayersService.addLayer(layerConfig, scope.currentServerId, server);
            };

            scope.addLayers = function() {
              scope.selectedLayer = {};
              $('#registry-layer-dialog').modal('hide');
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
                layer,
                bboxLayer
              ];
            };

            scope.addToCart = function(layerConfig) {
              var layerId = layerConfig.layerId;
              var idIndex = cartLayerId.indexOf(layerId);
              if (idIndex === -1) {
                cartLayerId.push(layerId);
                scope.cart.push(layerConfig);
              } else {
                cartLayerId.splice(idIndex, 1);
                scope.cart.splice(idIndex, 1);
              }
            };

            scope.isInCart = function(layerConfig) {
              var idInCart = cartLayerId.indexOf(layerConfig.layerId) !== -1 ? true : false;
              return idInCart;
            };

            scope.clearCart = function() {
              scope.cart = [];
              cartLayerId = [];
            };

            scope.filterAddedLayers = function(layerConfig) {
              return LayersService.filterAddedLayers(layerConfig, scope.currentServerId, layerConfig.name);
            };

            scope.$on('layers-loaded', function() {
              if (!scope.$$phase && !$rootScope.$$phase) {
                scope.$apply();
              }
            });

            scope.addRegistryLayersFromSavedMap = function(savedLayers) {
              for (var lyr in savedLayers) {
                var iteratedlayer = configService.configuration.map['layers'][lyr];
                if (iteratedlayer['registry']) {
                  scope.addToCart(iteratedlayer.registryConfig);
                  scope.addLayers();
                  return true;
                }
              }
            };

            // load saved registry layers if they exist
            scope.addRegistryLayersFromSavedMap();
          }
        };
      }
  );
})();
