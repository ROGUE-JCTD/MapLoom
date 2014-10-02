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
            console.log('attrType', scope.typeRestriction);
            scope.exactMatch = function() {
              scope.attribute.filter.searchType = 'exactMatch';
            };
            scope.strContains = function() {
              scope.attribute.filter.searchType = 'strContains';
            };
            scope.numRange = function() {
              scope.attribute.filter.searchType = 'numRange';
            };
          }
        };
      }
  );
}());
