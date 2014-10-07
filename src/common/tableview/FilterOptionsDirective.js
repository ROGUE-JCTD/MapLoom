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

            /*scope.$on(
                'click.bs.dropdown.data-api',
                function(e) { e.stopPropagation(); }
            );
            element.on('click', '.filter-option', function(e) {
              console.log('e', e.isPropagationStopped());
              //e.stopPropagation(); // This replace if conditional.
              //e.preventDefault();
              console.log('e', e.isPropagationStopped());
            });*/

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
