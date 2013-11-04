(function() {
  var module = angular.module('loom_diff_list_directive', []);

  module.directive('loomDiffList', function($parse) {
    return {
      restrict: 'C',
      replace: true,
      templateUrl: 'diff/partial/difflist.tpl.html',
      scope: {
        addList: '=',
        modifyList: '=',
        deleteList: '=',
        conflictList: '=',
        mergeList: '=',
        clickCallback: '='
      }
    };
  });
}());
