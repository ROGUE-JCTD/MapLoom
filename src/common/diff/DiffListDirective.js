(function() {
  var module = angular.module('loom_diff_list_directive', []);

  module.directive('loomDiffList', function(mapService) {
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
      },
      link: function(scope) {
        scope.conciseName = function(input) {
          if (input.length > 9) {
            return input.substr(input.length - 4);
          } else {
            return input;
          }
        };

        scope.zoomToFeature = function(feature) {
          mapService.zoomToExtent(feature.extent, null, null, 0.5);
        };
      }
    };
  });
}());
