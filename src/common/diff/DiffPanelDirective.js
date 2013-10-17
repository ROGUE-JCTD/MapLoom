(function() {
  var module = angular.module('loom_diff_panel_directive', []);

  module.directive('loomDiffPanel', function($rootScope, diffService) {
    return {
      restrict: 'C',
      replace: true,
      templateUrl: 'diff/partial/diffpanel.tpl.html',
      link: function(scope) { // Unused: element, attrs
        scope.adds = diffService.getAdds();
        scope.modifies = diffService.getModifies();
        scope.deletes = diffService.getDeletes();
      }
    };
  });
}());
