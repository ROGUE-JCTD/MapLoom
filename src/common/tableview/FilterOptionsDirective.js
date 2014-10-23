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
            scope.dirty = false;

            if (scope.typeRestriction === 'int' || scope.typeRestriction === 'double') {
              scope.filterType = 'number';
            } else if (scope.typeRestriction === 'datetime') {
              scope.filterType = 'datetime';
            } else if (scope.typeRestriction === 'date') {
              scope.filterType = 'date';
            } else if (scope.typeRestriction === 'time') {
              scope.filterType = 'time';
            } else {
              scope.filterType = 'text';
            }

            scope.exactMatch = function() {
              scope.attribute.filter.searchType = 'exactMatch';
              scope.checkFilterStatus();
            };
            scope.strContains = function() {
              scope.attribute.filter.searchType = 'strContains';
              scope.checkFilterStatus();
            };
            scope.numRange = function() {
              scope.attribute.filter.searchType = 'numRange';
              scope.checkFilterStatus();
              scope.updateFilterText();
            };

            scope.checkFilterStatus = function() {
              var filter = scope.attribute.filter;
              if (filter.text !== '' && filter.searchType === 'strContains' || (filter.searchType === 'numRange' &&
                  ((goog.isDef(filter.start) && filter.start !== '') ||
                      (goog.isDef(filter.end) && filter.end !== '')))) {
                scope.dirty = true;
              } else {
                scope.dirty = false;
              }
            };

            scope.updateFilterText = function() {
              var filter = scope.attribute.filter;
              if (goog.isDefAndNotNull(filter.start) && filter.start !== '' &&
                  goog.isDefAndNotNull(filter.end) && filter.end !== '') {
                filter.text = filter.start + ' to ' + filter.end;
              } else if (goog.isDefAndNotNull(filter.start) && filter.start !== '') {
                filter.text = filter.start + ' to max';
              } else if (goog.isDefAndNotNull(filter.end) && filter.end !== '') {
                filter.text = 'min to ' + filter.end;
              } else {
                filter.text = '';
              }
            };
          }
        };
      }
  );
}());
