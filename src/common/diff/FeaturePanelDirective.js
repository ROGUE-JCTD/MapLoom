(function() {

  var module = angular.module('loom_feature_panel_directive', []);

  module.directive('loomFeaturePanel',
      function($rootScope, mapService, $timeout, featureDiffService) {
        return {
          restrict: 'C',
          scope: {
            panel: '=',
            title: '=panelTitle'
          },
          templateUrl: 'diff/partial/featurepanel.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapid = attrs.mapid;

            var target = 'preview-map-' + scope.mapid;
            var loadingtarget = '#loading-' + scope.mapid;
            function updateVariables(event, panel) {
              $timeout(function() {
                scope.panel.map.setTarget(target);
                mapService.zoomToExtent(scope.panel.bounds, false, scope.panel.map);
                $timeout(function() {
                  $(loadingtarget).fadeOut();
                }, 500);
              }, 500);
            }

            scope.isMergePanel = scope.panel === featureDiffService.merged;

            if (scope.isMergePanel) {
              scope.$watch('panel.attributes', function() {
                for (var i = 0; i < scope.panel.attributes.length; i++) {
                  featureDiffService.updateChangeType(scope.panel.attributes[i]);
                }
                $rootScope.$broadcast('merge-feature-modified');
              }, true);
            }

            scope.$on('feature-diff-performed', updateVariables);
          }
        };
      }
  );
})();
