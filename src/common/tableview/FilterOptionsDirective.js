(function() {
  var module = angular.module('loom_filter_options_directive', []);
  module.directive('filteroptions',
      function(tableViewService) {
        return {
          restrict: 'E',
          templateUrl: 'tableview/partial/filteroptions.tpl.html',
          scope: {
            attribute: '=',
            typeRestriction: '=type'
          },
          replace: true,
          link: function(scope, element) {
            console.log('attribute', scope.attribute);

            if (scope.typeRestriction === 'int' || scope.typeRestriction === 'double') {
              scope.filterType = 'number';
            } else if (scope.typeRestriction === 'datetime' || scope.typeRestriction === 'date' ||
                scope.typeRestriction === 'time') {
              scope.filterType = 'date';
            } else {
              scope.filterType = 'text';
            }

            scope.exactMatch = function() {
              scope.attribute.filter.searchType = 'exactMatch';
            };
            scope.strContains = function() {
              scope.attribute.filter.searchType = 'strContains';
            };
            scope.numRange = function() {
              scope.attribute.filter.searchType = 'numRange';
            };

            scope.updateFilterText = function() {
              var filter = scope.attribute.filter;
              if (goog.isDefAndNotNull(filter.start) && filter.start !== '' &&
                  goog.isDefAndNotNull(filter.end) && filter.end !== '') {
                filter.filter = filter.start + ' to ' + filter.end;
              } else if (goog.isDefAndNotNull(filter.start) && filter.start !== '') {
                filter.filter = filter.start + ' to max';
              } else if (goog.isDefAndNotNull(filter.end) && filter.end !== '') {
                filter.filter = 'min to ' + filter.end;
              } else {
                filter.filter = '';
              }
            };
          }
        };
      }
  );
}());
