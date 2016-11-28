(function() {

  var module = angular.module('loom_unifiedlayers_directive', []);
  //    'rzModule',
  //    'loom_addlayersfilter_directive'

  module.directive('loomUnifiedlayers',
      function($rootScope, configService, serverService, mapService, geogigService, $translate, dialogService, $timeout, LayersService, $http) {
        return {
          templateUrl: 'addlayers/partials/unifiedLayerSearch.tpl.html',
          link: function(scope, element) {
            /** List of owners. */
            scope.owners = [];

            /** List of categories */
            scope.categories = [];

            /** Keyword search */
            scope.keyword = '';

            /** Settings for the slider */
            scope.slider = {
              options: {},
              minValue: 1900,
              maxValue: 2017  /* TODO: Max should be the current year. */
            };

            /** Map Settings. */
            scope.previewCenter = [40, 30];
            scope.previewZoom = 1;
            scope.previewLayers = [
              new ol.layer.Tile({
                source: new ol.source.OSM()
              })
            ];
            var mapHeight = Math.round(480 / 2) + 'px';
            scope.mapStyle = {width: '100%', height: mapHeight};
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



            /** Get the list of categories for the filter list.
             */
            function fetchCategories() {
              $http.get('/api/categories').then(function(results) {
                scope.categories = results.data.objects;
              });
            }

            /** Get the list of owners for the filter lists.
             */
            function fetchOwners() {
              $http.get('/api/owners').then(function(results) {
                scope.owners = results.data.objects;
              });
            }

            /** Handle resizing of the dialog when the window size changes.
             *
             */
            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            /** Toggle boolean filters to be either "on" or "off"
             *  by changing the "_checked" value.
             */
            scope.toggleFilter = function(item) {
              console.log('toggleFilter', item._checked);
              if (item._checked === true) {
                item._checked = false;
              } else {
                item._checked = true;
              }
            };

            /** Count the number of selected layers
             */
            scope.getSelectedLayerCount = function() {
              return 999;
            };

            onResize();

            /* Load the filter lists on startup */
            // TODO: Find a way to make this happen only on open.
            //scope.$on('modal-opened', function() {
            fetchCategories();
            fetchOwners();
            //});

            $(window).resize(onResize);

          }
        };
      }
  );
})();

