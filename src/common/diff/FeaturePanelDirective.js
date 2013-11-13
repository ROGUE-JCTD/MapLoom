(function() {

  var module = angular.module('loom_feature_panel_directive', []);

  module.directive('loomFeaturePanel',
      function(mapService, $timeout, geogitService) {
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

            scope.$on('feature-diff-performed', updateVariables);
          }
        };
      }
  );
})();
