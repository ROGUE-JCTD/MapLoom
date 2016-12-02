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

            /** Transform the model into a set of parameters appropriate
             *  for searching against the local Geonode API.
             */
            scope.getGeonodeSearchParams = function() {
              return {
                text: scope.keyword,
                category: getChecked(scope.categories, 'identifier'),
                owner: getChecked(scope.owners, 'username')
              };
              /*
              // check for a keyword search
              if (scope.keyword !== '') {
                params['title__icontains'] = scope.keyword;
              }
              // get the list of selected catagories, and owners
              params['category__identifier__in'] = getChecked(scope.categories, 'identifier');
              params['owner__username__in'] = getChecked(scope.owners, 'username');

              return params;
              */
            };

            /** The unified search assumes maploom is being run within
             *  geonode.  It will first try search GeoNode before trying to
             *  Search the a WMS source.
             *
             *  WARNING! This is just a a starting point! This should get
             *  more modernized with a proper Angular service provider.
             */
            scope.geonodeSearch = function() {
              var search_params = {};
              // check for a key word parameter
              if (scope.keyword !== '') {
                search_params['title__icontains'] = scope.keyword;
              }
              // get the list of selected catagories, and owners
              search_params['category__identifier__in'] = getChecked(scope.categories, 'identifier');
              search_params['owner__username__in'] = getChecked(scope.owners, 'username');

              var search_item = scope.startSearch('Local search...');

              // TODO: This should pull from a service or a model of some sort,
              //       instead of doing a direct HTTP request.
              $http({
                url: '/api/layers/',
                method: 'GET',
                params: search_params
              }).then(function(results) {
                // clear out the previous local-geonode layers.
                removeLayersFromOrigin('Exchange');
                // tag each layer with an origin before adding it to
                //  the results list.
                for (var i = 0, ii = results.data.objects.length; i < ii; i++) {
                  var lyr = Object.assign({_origin: 'Exchange'}, results.data.objects[i]);
                  lyr.date = new Date(lyr.date);
                  scope.layers.push(lyr);
                }
                search_item.state = 'finished';
              }, function() {
                search_item.state = 'error';
              });
            };

            /** Create an object with the appropriate search parameters
             *  for a search against a registry catalog.
             */
            scope.getRegistrySearchParams = function() {
              var params = {};
              if (scope.keyword !== '') {
                params['text'] = scope.keyword;
              }
              return params;
            };

            /** Transform a result from registry into the same format
             *  as the internal/GeoNode layer search results.
             */
            function transformRegistryLayer(regLayer) {
              return {
                '_origin' : 'Registry',
                'title': regLayer['title'],
                'abstract': regLayer['abstract'],
                'date': new Date(regLayer['layer_date']),
                'uuid': regLayer['layer_identifier']
              };
            }

            /** Search a catalog in a registry.
             */
            scope.searchRegistryCatalog = function(catalogName, catalogUri) {
              // create a new "search_item"
              var search_item = scope.startSearch(catalogName + ' Search...');

              // clear out the old registry layers.
              removeLayersFromOrigin('Registry');

              // kick off the search
              $http({
                method: 'GET',
                url: catalogUri,
                params: scope.getRegistrySearchParams()
              }).then(function(results) {
                if (results.data && results.data['a.matchDocs'] > 0) {
                  var docs = results.data['d.docs'];
                  for (var i = 0, ii = docs.length; i < ii; i++) {
                    scope.layers.push(transformRegistryLayer(docs[i]));
                  }
                }
                // indicate the item has finished.
                search_item.state = 'finished';
              }, function(err) {
                // indicate there was an error with the search.
                search_item.state = 'error';
              });
            };

            /** Prefix for the registry URL,
             *  TODO: This should come from the ConfigService.
             */
            scope.registryPrefix = '/registry';

            /** List of catalogs from the registry. */
            scope.catalogs = [];

            /** Get the list of catalogs from the registry.
             */
            scope.getCatalogs = function() {
              // TODO: This url should be configurable!
              return $http({
                method: 'GET',
                url: scope.registryPrefix + '/catalog'
              }).then(function(response) {
                // clear out the old catalogs list.
                scope.catalogs = [];
                for (var i = 0, ii = response.data.length; i < ii; i++) {
                  // add the prefix to the registry URL
                  var catalog = response.data[i];
                  // As of 30 November 2016 the search_url was a lie...
                  //catalog.search_url = scope.registryPrefix + catalog.search_url;
                  // So it is being set manually...
                  catalog.search_url = scope.registryPrefix + '/catalog/' + catalog.name + '/api/';
                  scope.catalogs.push(catalog);
                }
              });
            };

            var registryServerConf = {};
            var geonodeServerConf = {};

            /** Iterate through all the available searches.
             */
            scope.search = function() {
              console.log('Servers', serverService.getServers());
              // scope.geonodeSearch();
              // refresh the list of catalogs, then search them
              /*
              scope.getCatalogs().then(function() {
                // for each catalog, execute a search.
                for (var i = 0, ii = scope.catalogs.length; i < ii; i++) {
                  var catalog = scope.catalogs[i];
                  scope.searchRegistryCatalog(catalog.slug, catalog.search_url);
                }
              });
              */

              // search all catalogs
              // "/registry/api" end point should search all of the
              //  the catalogs at once.
              // scope.searchRegistryCatalog('Registry', scope.registryPrefix + '/api');
              var filter_options = scope.getGeonodeSearchParams();
              serverService.addSearchResultsForRegistry(registryServerConf, filter_options);
              serverService.addSearchResultsForGeonode(geonodeServerConf, filter_options);
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
              if (geonodeServerConf.layersConfig) {
                all_results = all_results.concat(geonodeServerConf.layersConfig);
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

            /** Serach when enter is pressed */
            scope.searchOnEnter = function(event) {
              if (event.keyCode == 13) {
                scope.search();
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

