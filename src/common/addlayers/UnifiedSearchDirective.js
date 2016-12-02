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
            /*
            var mapHeight = Math.round(480 / 2) + 'px';
            scope.mapStyle = {width: '100%', height: mapHeight};
            */
            scope.layerConfig = {Title: 'Title'};
            scope.selectedLayer = {};

            scope.cart = [];
            cartLayerId = [];
            scope.pagination = {sizeDocuments: 1, pages: 1};
            scope.catalogList = [];

            /** Layer definitions to be added to the map. */
            scope.selectedLayers = {};

            /** Layers returned from the current search parameters */
            scope.layers = [];

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
              if (item._checked === true) {
                item._checked = false;
              } else {
                item._checked = true;
              }
              scope.search();
            };

            /** Take a list which has _checked and value attributes
             *  and return a list of the checked values.
             *
             *  @return {Array} a List of checked values, empty list if none checked.
             */
            function getChecked(obj, value) {
              var selected = [];
              for (var i = 0, ii = obj.length; i < ii; i++) {
                if (obj[i]._checked === true) {
                  selected.push(obj[i][value]);
                }
              }
              return selected;
            }

            /** When an origin updates, the previous results from that
             *  origin needs to be removed from the results list.
             */
            function removeLayersFromOrigin(origin) {
              var new_layers = [];
              for (var i = 0, ii = scope.layers.length; i < ii; i++) {
                if (scope.layers[i]._origin != origin) {
                  new_layers.push(scope.layers[i]);
                }
              }
              scope.layers = new_layers;
            }

            /** Stack of searches, used just for UI display to
             *  indicate to the user that multiple queries may have
             *  all been fired at the same time.
             */
            scope.searches = [];

            /** Create a 'search item', this is a descriptor
             *  for the type of search that is being executed.
             */
            scope.startSearch = function(desc) {
              var item = {
                description: desc,
                state: 'running'
              };
              scope.searches.push(item);
              return item;
            };

            /** Create a search object from objects in the model.
             */
            scope.getSearchParams = function() {
              return {
                text: scope.keyword,
                category: getChecked(scope.categories, 'identifier'),
                owner: getChecked(scope.owners, 'username')
              };
            };

            var registryServerConf = {};
            /** Get the local geoserver configuration */
            var servers = {
              'registry' : null,
              'geoserver' : null
            };

            /** Iterate through all the available searches.
             */
            scope.search = function() {
              console.log('server', serverService.getServers());
              // init the server configs before searching them.
              if (servers['geoserver'] == null) {
                // get the local GeoServer configuration.
                servers['geoserver'] = serverService.getServerByName('Local Geoserver');
              }
              if (servers['registry'] == null) {
              }
              var filter_options = scope.getSearchParams();
              serverService.addSearchResultsForRegistry(registryServerConf, filter_options);

              console.log('My Servers', servers);

              // GeoNode searches apply to the local geoserver instance.
              serverService.addSearchResultsForGeonode(servers['geoserver'], filter_options);
            };

            /** Sort a list of layer configurations based on the current
             *  sort function.
             *  TODO: Add more sort functions (date, title, ascent )
             *
             *  @param {Array} results array of layer configs.
             *
             */
            scope.applySort = function(results) {
              var sort_fn = function(a, b) {
                return (a.title < b.title) ? -1 : 1;
              };

              return results.sort(sort_fn);
            };


            /** Aggregate the reuslts from the GeoServer and Registry searches
             *  and return the list of matching layers appropriately sorted.
             */
            scope.getResults = function() {
              //var sort = '';
              var all_results = [];
              if (registryServerConf.layersConfig) {
                all_results = all_results.concat(registryServerConf.layersConfig);
              }
              if (servers.geoserver && servers.geoserver.layersConfig) {
                all_results = all_results.concat(servers.geoserver.layersConfig);
              }

              return scope.applySort(all_results);
            };

            /** Remove a layer from the selected list.
             */
            scope.removeLayer = function(layer) {
              delete scope.selectedLayers[layer.uuid];
            };

            /** Select a layer from the list */
            scope.toggleLayer = function(layer) {
              if (layer._checked === true) {
                layer._checked = false;
                scope.removeLayer(layer);
              } else {
                // set the layer as "checked" using the
                //   "internal" _checked
                // copy the definition
                var lyr = Object.assign({}, layer);
                // add to selected layer.
                scope.selectedLayers[layer.uuid] = lyr;
                layer._checked = true;
              }
            };

            /** Count the number of selected layers
             */
            scope.getSelectedLayerCount = function() {
              var count = 0;
              for (var key in scope.selectedLayers) {
                count++;
                if (key) { }
              }
              return count;
            };

            /** Handy check to see if a layer is selected
             */
            scope.isLayerSelected = function(layer) {
              return goog.isDefAndNotNull(scope.selectedLayers[layer.uuid]);
            };

            /** Search when enter is pressed */
            scope.searchOnEnter = function(event) {
              if (event.keyCode == 13) {
                scope.search();
              }
            };

            /** Add the selected layers to the map
             */
            scope.addLayers = function() {
              /*
              layersConfig.forEach(function(config) {
                LayersService.addLayer(config, scope.currentServerId);
              });
              */
              for (var uuid in scope.selectedLayers) {
                var layer = scope.selectedLayers[uuid];
                console.log('selected layer', uuid, layer.serverId);
                LayersService.addLayer(layer, layer.serverId);
                console.log('added');
              }
            };

            /** Load the filter lists on startup */
            function populateSearchFilters() {
              fetchCategories();
              fetchOwners();
            }

            // TODO: Find a way to make this happen only on open.
            populateSearchFilters();

            /* Resize the dialog on startup */
            onResize();

            $(window).resize(onResize);

          }
        };
      }
  );
})();

