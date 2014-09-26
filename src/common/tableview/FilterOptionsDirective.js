(function() {
  var module = angular.module('loom_filter_options_directive', []);
  module.directive('loomFilterOptions',
      function(/*tableViewService*/) {
        return {
          restrict: 'E',
          templateUrl: 'tableview/partial/filteroptions.tpl.html',
          scope: {
            attrName: '='
          },
          replace: true,
          link: function(scope, element) {
            console.log('filter options scope.attrName', scope.attrName);
          }
        };
      }
  );
}());
