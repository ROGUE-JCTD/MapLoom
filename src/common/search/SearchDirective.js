(function() {
  var module = angular.module('loom_search_directive', []);

  module.directive('loomSearch',
      function($timeout, $translate, searchService, dialogService, mapService, configService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'search/partial/search.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope) {
            scope.searchQuery = '';
            scope.searchInProgress = false;
            scope.searchResults = [];
            scope.searchExpanded = false;

            function zoomToResult(result) {
              var boxMin = ol.proj.transform([result.boundingbox[2], result.boundingbox[0]], 'EPSG:4326',
                  mapService.map.getView().getProjection());
              var boxMax = ol.proj.transform([result.boundingbox[3], result.boundingbox[1]], 'EPSG:4326',
                  mapService.map.getView().getProjection());
              var newBounds = [boxMin[0], boxMin[1], boxMax[0], boxMax[1]];
              var x = newBounds[3] - newBounds[1];
              var y = newBounds[2] - newBounds[0];
              x *= 0.5;
              y *= 0.5;
              newBounds[1] -= x;
              newBounds[3] += x;
              newBounds[0] -= y;
              newBounds[2] += y;

              mapService.zoomToExtent(newBounds);
            }

            scope.clearResults = function() {
              scope.searchResults = [];
              scope.searchExpanded = false;
              searchService.clearSearchLayer();
            };

            scope.displayingResults = function() {
              return scope.searchResults.length > 0;
            };

            scope.performSearch = function() {
              scope.config = configService.configuration;
              if (scope.displayingResults()) {
                scope.searchQuery = '';
                scope.clearResults();
                return;
              }
              if (scope.searchInProgress === true) {
                return;
              }
              scope.searchExpanded = false;
              if (goog.string.removeAll(goog.string.collapseWhitespace(scope.searchQuery), ' ') !== '') {
                scope.searchInProgress = true;
                searchService.performSearch(scope.searchQuery).then(function(results) {
                  scope.searchResults = results;
                  if (results.length === 0) {
                    dialogService.open($translate.instant('search'), $translate.instant('search_no_results'));
                  } else if (results.length === 1) {
                    zoomToResult(results[0]);
                    searchService.populateSearchLayer(results);
                    scope.searchExpanded = true;
                  } else {
                    $timeout(function() {
                      scope.searchExpanded = true;
                    }, 10);
                    searchService.populateSearchLayer(results);
                    scope.searchExpanded = true;
                  }
                  scope.searchInProgress = false;
                }, function(_status) {
                  scope.searchInProgress = false;
                  scope.searchResults = [];
                  if (goog.isDefAndNotNull(_status)) {
                    dialogService.error($translate.instant('search'), $translate.instant('search_error_status',
                        {status: _status}));
                  } else {
                    dialogService.error($translate.instant('search'), $translate.instant('search_error'));
                  }
                });
              } else {
                scope.searchResults = [];
              }
            };

            scope.resultClicked = function(result) {
              zoomToResult(result);
            };

            scope.isExpanded = function(result) {
              return (result._open === true);
            };

            scope.toggleOpen = function(result) {
              result._open = (result._open === false);
            };

            scope.getClassSearchExpanded = function() {
              if (scope.searchExpanded === true) {
                return 'in';
              } else {
                return 'collapse';
              }
            };
          }
        };
      });
}());
