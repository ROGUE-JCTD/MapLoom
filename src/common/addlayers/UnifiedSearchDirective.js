(function() {

  var module = angular.module('loom_unifiedlayers_directive', [
    'rzModule',
    'loom_helpicon_directive'
  ]);
  //    'loom_addlayersfilter_directive'

  module.directive('loomUnifiedlayers',
      function($rootScope, configService, serverService, mapService, geogigService, $translate, dialogService, $timeout, LayersService, $http) {
        return {
          templateUrl: 'addlayers/partials/unifiedLayerSearch.tpl.html',
          link: function(scope, element) {
            /** How to sort the results */
            scope.sortBy = ['Title', true];

            /** The text description for the number of layers to be added to the map. */
            scope.addLayersText = '';

            /** Text describing the number of layers found from the search. */
            scope.pagingTitle = '';

            scope.availableSorts = [
              ['Title', true],
              ['Title', false],
              ['Date', true],
              ['Date', false]
            ];

            /** These are used for label output, req'd for translation support */
            scope.sortField = 'Title';
            scope.sortAscending = 'Ascending';

            /** List of owners. */
            scope.owners = [];

            /** List of categories */
            scope.categories = [];

            /** Keyword search */
            scope.keyword = '';

            /** Settings for the slider
             *  Shamelessly copied and pasted from AddLayersFilterDirective,
             */
            var topIndex = -1;
            var minIndex = 11;
            scope.sliderValues = ['5000M BC', '500M BC', '50M BC', '5M BC', '1M BC', '100K BC', '10K BC', '1K BC', '500 BC', '100 BC',
              0, 100, 500, 1000, 1500, 1600, 1700, 1800, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 1991, 1992, 1993,
              1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013,
              2014, 2015, 2016, 2017, 2018, 2019, 2020, 2050, 2100, 'Future'].slice(minIndex, topIndex);
            var sliderValues = scope.sliderValues.slice();
            var changeSliderValues = false;

            scope.sliderMinValue = scope.sliderValues[0];
            scope.sliderMaxValue = scope.sliderValues[scope.sliderValues.length - 1];

            scope.sliderValues.getValue = function(key) {
              return scope.sliderValue(key);
            };

            scope.defaultSliderValue = function() {
              return {
                minValue: 0,
                maxValue: sliderValues.length - 1,
                options: {
                  floor: 0,
                  ceil: sliderValues.length - 1,
                  step: 1,
                  noSwitching: true, hideLimitLabels: true,
                  getSelectionBarColor: function() {
                    return '#77d5d5';
                  },
                  translate: function() {
                    return '';
                  }
                }
              };
            };

            scope.slider = scope.defaultSliderValue();

            scope.setRange = function(inputId) {
              inputId = inputId || 'inputMaxValue';
              var inputValue = element.find('#' + inputId).val();
              inputValue = isNaN(Number(inputValue)) ? inputValue : Number(inputValue);
              var keySlider = sliderValues.indexOf(inputValue);
              if (keySlider !== -1) {
                if (inputId === 'inputMaxValue') {
                  scope.slider.maxValue = keySlider;
                }else if (inputId === 'inputMinValue') {
                  scope.slider.minValue = keySlider;
                }
                scope.sliderValues = sliderValues.slice();
                changeSliderValues = false;
                scope.$broadcast('changeSliderValues');
              }else {
                changeSliderValues = true;
              }
            };

            scope.$on('slideEnded', function() {
              if (changeSliderValues) {
                scope.sliderValues = sliderValues.slice();
                changeSliderValues = false;
              }
              scope.sliderMinValue = scope.sliderValues[0]; //sliderValues[scope.slider.minValue];
            });



            /** Map Settings. */
            scope.previewCenter = [40, 30];
            scope.previewZoom = 1;


            /** Predefine the bbox styling function for the preview layer.
             */
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

            scope.bboxes = new ol.source.Vector({});
            scope.previewLayers = [];

            /** Convert an extent array into an openlayers
             *   geometry.
             *
             *  @param {Array} extent Array of [minx,miny,maxx,maxy].
             *
             * @return {ol.geom.Polygon}
             */
            var extentToPolygon = function(extent) {
              return ol.geom.Polygon.fromExtent(extent).transform('EPSG:4326', 'EPSG:3857');
            };

            /** When the preview map is moved it sets an extent in
             *  the scope to narrow the search.
             */
            scope.curentExtent = [];

            /** Counter that filters out non-user instigated bbox changes. */
            var mapPreviewChangeCount = 0;

            /** When the map is moved, set a bbox filter */
            scope.$on('moveendMap', function(event, coordinates) {
              // Add 1 to avoid accidentally setting a filter
              //  when the map is loaded.
              mapPreviewChangeCount++;
              if (mapPreviewChangeCount > 1) {
                var target_crs = 'EPSG:4326';
                scope.bbox = mapService.createBBoxFromCoordinatesFromProjectionIntoProjection(coordinates, mapService.getProjection(), target_crs)[0];
                scope.search();
              }
            });

            /** Preview a bounding box on the map by drawing it
             *  in a calming blue rectangle.
             *
             *  @param {LayerConfig} layer The layer definition from the server.
             *
             */
            scope.previewBbox = function(layer) {
              var extent = null;

              if (layer.extent) {
                extent = layer.extent;
              }

              if (extent !== null) {
                scope.bboxes.addFeature(new ol.Feature(extentToPolygon(extent)));
              }
            };

            /** Remove any bounding boxes on the map.
             */
            scope.clearBbox = function() {
              scope.bboxes.clear();
            };


            /** The number of results allowed per page */
            scope.pageSize = 8;

            /** The current page being shown */
            scope.currentPage = 0;

            /** Maximum number pages, updated with results */
            scope.maxPages = 0;

            /** Array of "pages" that are valid. Handy for rendering the
             *   pager in the template.
             */
            scope.pages = [];

            /** Short cut for knowing the number of current results */
            scope.resultsCount = 0;

            /** Change the page */
            scope.changePage = function(pageNumber) {
              // clamp the page range
              if (pageNumber < 0) {
                pageNumber = 0;
              } else if (pageNumber >= scope.maxPages) {
                pageNumber = scope.maxPages - 1;
              }
              scope.currentPage = pageNumber;
            };

            /** Uncheck all of the settings in a "_checked" type
             *  filter list.
             */
            var checkNone = function(lookup) {
              for (var i = 0, ii = lookup.length; i < ii; i++) {
                lookup[i]._checked = false;
              }
            };

            /** Clear a field element.
             */
            scope.clear = function(filterType, silent) {
              // reset the filterOptions
              switch (filterType) {
                case 'all':
                  var all = ['bbox', 'owner', 'category', 'keyword', 'date'];
                  for (var i = 0, ii = all.length; i < ii; i++) {
                    scope.clear(all[i], true);
                  }
                  break;
                case 'bbox':
                  scope.bbox = [];
                  scope.mapPreviewChangeCount = 0;
                  // TOD0: set map to max extent
                  break;
                case 'owner':
                  checkNone(scope.owners);
                  break;
                case 'category':
                  checkNone(scope.categories);
                  break;
                case 'keyword':
                  scope.keyword = '';
                  break;
                case 'date':
                  scope.slider.minValue = 0;
                  scope.slider.maxValue = scope.sliderValues.length - 1;
                  scope.$broadcast('changeSliderValues');
                  break;
              }

              // if silent has been set to true then
              //   the search is not executed.
              if (silent !== true) {
                scope.search();
              }
            };

            /** Check to see if a particular filter has been set.
             *
             *  @param {String} filterType Name of the filter (bbox, owner, category, keyword, date)
             *
             * @return {Boolean} True when set, False when not set.
             */
            scope.isSet = function(filterType) {
              switch (filterType) {
                case 'bbox':
                  return scope.bbox.length > 1;
                case 'owner':
                  return getChecked(scope.owners, 'username').length > 0;
                case 'category':
                  return getChecked(scope.categories, 'identifier').length > 0;
                case 'keyword':
                  return (scope.keyword !== '');
                case 'date':
                  var date_filter = getDateFilter();
                  return (goog.isDefAndNotNull(date_filter.minYear) || goog.isDefAndNotNull(date_filter.maxYear));
              }
            };

            scope.layerConfig = {Title: 'Title'};

            scope.pagination = {sizeDocuments: 1, pages: 1};

            /** Layer definitions to be added to the map. */
            scope.selectedLayers = {};

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


            /** Get an object that represents a date filter.
             *
             *  This may return either an empty object.
             *  An object with either minYear, maxYear, or both.
             */
            function getDateFilter() {
              var date_filter = {};
              if (goog.isDefAndNotNull(scope.sliderValues)) {
                if (scope.slider.minValue !== 0) {
                  date_filter.minYear = sliderValues[scope.slider.minValue] + '-01-01';
                }
                if (scope.slider.maxValue !== scope.sliderValues.length - 1) {
                  date_filter.maxYear = sliderValues[scope.slider.maxValue] + '-01-01T00:00:00';
                }
              }
              return date_filter;
            }

            /** Create a search object from objects in the model.
             */
            scope.getSearchParams = function() {
              return Object.assign(getDateFilter(), {
                text: scope.keyword,
                category: getChecked(scope.categories, 'identifier'),
                owner: getChecked(scope.owners, 'username'),
                bbox: scope.bbox
              });
            };

            /** Get the local geoserver configuration */
            var servers = {
              registry: null,
              geoserver: null
            };

            /** Iterate through all the available searches.
             */
            scope.search = function() {
              var filter_options = scope.getSearchParams();

              // init the server configs before searching them.
              if (servers.geoserver == null) {
                // get the local GeoServer configuration.
                servers.geoserver = serverService.getServerByName('Local Geoserver');
              }
              // GeoNode searches apply to the local geoserver instance.
              serverService.addSearchResultsForGeonode(servers.geoserver, filter_options);

              // check to see if registry is enabled
              if (configService.configuration.registryEnabled) {
                // ensure the service is enabled.
                if (servers.registry == null) {
                  // configure registry
                  servers.registry = serverService.getRegistryLayerConfig();
                }
                serverService.addSearchResultsForRegistry(servers.registry, filter_options);
              }

              // reset the results list to the first 'page'.
              scope.currentPage = 0;
            };

            scope.filterAddedLayers = function(layerConfig, serverId) {
              return LayersService.filterAddedLayers(layerConfig, serverId, layerConfig.name);
            };

            /** Sort a list of layer configurations based on the current
             *  sort function.
             *
             *  @param {Array} results array of layer configs.
             *
             */
            scope.applySort = function(results) {
              // this is a little trick that essentially
              //  flips the order when returned by the sort
              //  function.
              var asc = -1, dsc = 1;
              if (!scope.sortBy[1]) {
                asc = 1;
                dsc = -1;
              }
              // title is the default sort.
              var sort_fn = function(a, b) {
                return (a.Title < b.Title) ? asc : dsc;
              };

              // sorting by date is also supported.
              if (scope.sortBy[0] == 'Date') {
                sort_fn = function(a, b) {
                  if (!goog.isDefAndNotNull(a.layerDate)) {
                    return asc;
                  } else if (!goog.isDefAndNotNull(b.layerDate)) {
                    return dsc;
                  }
                  return (a.layerDate < b.layerDate) ? asc : dsc;
                };
              }

              return results.sort(sort_fn);
            };

            /** Change the sort settings.
             *
             *  @param {String}  field the field on which to sort.
             *  @param {Boolean} asc   True for ascending, False for descending
             */
            scope.changeSort = function(field, asc) {
              scope.sortBy = [field, asc];

              scope.sortField = $translate.instant(field);
              scope.sortAscending = $translate.instant(asc ? 'ascending' : 'descending');
            };

            /** Aggregate the reuslts from the GeoServer and Registry searches
             *  and return the list of matching layers appropriately sorted.
             */
            scope.getResults = function() {
              var all_results = [];
              for (var server_name in servers) {
                var server = servers[server_name];
                if (server && server.layersConfig) {
                  var layers = [];
                  for (var i = 0, ii = server.layersConfig.length; i < ii; i++) {
                    var layer = server.layersConfig[i];
                    if (scope.filterAddedLayers(layer, server.serverId)) {
                      layer._server = server_name;
                      layers.push(layer);
                    }
                  }

                  all_results = all_results.concat(layers);
                }
              }

              // update the current count of results.
              scope.resultsCount = all_results.length;

              // and the maximum number of pages.
              scope.maxPages = Math.ceil(scope.resultsCount / scope.pageSize);

              // setup the pages array.
              scope.pages = [];
              for (var page = 0; page < scope.maxPages; page++) {
                scope.pages.push(page);
              }

              // sort and paginate the results
              var start_record = scope.currentPage * scope.pageSize;
              var end_record = (scope.currentPage + 1) * scope.pageSize;

              // whenever the results change, update the paging information.
              scope.updatePagingTitle();

              return scope.applySort(all_results).slice(start_record, end_record);
            };

            scope.updateAddLayersText = function() {
              scope.addLayersText = $translate.instant('layers_to_be_added', {value: scope.getSelectedLayerCount()});
            };

            /** Update a translated version of the 'paging' subtitle
             */
            scope.updatePagingTitle = function() {
              scope.pagingTitle = $translate.instant('paging_subtitle', {
                firstRecord: (scope.currentPage * scope.pageSize) + 1,
                lastRecord: (scope.currentPage + 1) * scope.pageSize,
                totalRecords: scope.resultsCount
              });
            };

            /** Remove a layer from the selected list.
             */
            scope.removeLayer = function(layer) {
              delete scope.selectedLayers[layer.uuid];
              scope.updateAddLayersText();
            };

            /** Select a layer from the list */
            scope.toggleLayer = function(layer) {
              if (scope.isLayerSelected(layer)) {
                scope.removeLayer(layer);
              } else {
                // copy the definition
                var lyr = Object.assign({}, layer);
                // add to selected layer.
                scope.selectedLayers[layer.uuid] = lyr;
                scope.updateAddLayersText();
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
              for (var uuid in scope.selectedLayers) {
                var layer = scope.selectedLayers[uuid];
                var server = servers[layer._server];
                if (layer._server == 'registry') {
                  layer.registry = true;
                }
                LayersService.addLayer(layer, server.id, server);
              }

              // XXX: This is a dirty ugly hack.
              $('#unified-layer-dialog').modal('hide');
            };

            /** Clear all selected layers from the selected
             *  layers list.
             */
            scope.clearSelectedLayers = function() {
              scope.selectedLayers = {};
              scope.updateAddLayersText();
            };

            /** Load the filter lists on startup */
            function populateSearchFilters() {
              fetchCategories();
              fetchOwners();
            }

            // TODO: Find a way to make this happen only on open.
            populateSearchFilters();
            scope.updateAddLayersText();

            /* Resize the dialog on startup */
            onResize();

            $(window).resize(onResize);

            /** This bit bootstraps the slider.
             *  XXX: This is another ugly jquery/angular hack.
             */
            $('#unified-layer-dialog').on('shown.bs.modal', function() {
              $timeout(function() {
                scope.$broadcast('rzSliderForceRender');
              });

              // layers are set here because the map directive
              //  does not initialize the map or listen properly
              //  for changes to layers until it has been created,
              //  which happens after the dialog is shown the first time.
              scope.previewLayers = [
                new ol.layer.Vector({
                  layerId: 'bboxes',
                  source: scope.bboxes,
                  style: bboxStyle
                })
              ];

              // reset the selected layers list when the dialog is open.
              scope.clearSelectedLayers();
            });

          }
        };
      }
  );
})();
