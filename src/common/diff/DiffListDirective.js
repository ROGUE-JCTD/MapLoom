(function() {
  var module = angular.module('loom_diff_list_directive', []);

  module.directive('loomDiffList', function() {
    return {
      restrict: 'C',
      replace: true,
      scope: {
        addList: '=',
        modifyList: '=',
        deleteList: '=',
        clickCallback: '='
      },
      templateUrl: 'diff/partial/difflist.tpl.html'
    };
  });
}());
