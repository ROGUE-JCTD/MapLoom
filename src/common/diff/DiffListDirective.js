(function() {
  var module = angular.module('loom_diff_list_directive', []);

  module.directive('loomDiffList', function($parse) {
    return {
      restrict: 'C',
      replace: true,
      templateUrl: 'diff/partial/difflist.tpl.html',
      link: function(scope, element, attrs) {
        attrs.$observe('addList', function(val) {
          scope.addList = scope.$eval(val);
        });
        attrs.$observe('modifyList', function(val) {
          scope.modifyList = scope.$eval(val);
        });
        attrs.$observe('deleteList', function(val) {
          scope.deleteList = scope.$eval(val);
        });
        attrs.$observe('clickCallback', function(val) {
          scope.clickCallback = scope.$eval(val);
        });
      }
    };
  });
}());
