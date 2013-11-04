(function() {

  var module = angular.module('loom_feature_panel_directive', []);

  module.directive('loomFeaturePanel',
      function(mapService, $timeout, geogitService) {
        return {
          restrict: 'C',
          scope: {
            feature: '=',
            oldcommit: '=',
            newcommit: '=',
            repoid: '=',
            map: '='
          },
          templateUrl: 'diff/partial/featurepanel.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapid = attrs.mapid;
            var target = 'preview-map-' + scope.mapid;

            function updateVariables() {
              if (goog.isDefAndNotNull(scope.feature)) {
                var oldCommit = scope.oldcommit;
                var newCommit = scope.newcommit;

                var diffOptions = new GeoGitFeatureDiffOptions();
                diffOptions.all = true;
                diffOptions.newCommitId = newCommit;
                diffOptions.oldCommitId = oldCommit;
                diffOptions.path = scope.feature.id;
                geogitService.command(scope.repoid, 'featurediff', diffOptions).then(function(response) {
                  console.log('feature diff: ', response);
                  $timeout(function() {
                    scope.map.setTarget(target);
                    var geom = ol.parser.WKT.read(scope.feature.geometry);
                    var transform = ol.proj.getTransform('EPSG:4326', scope.map.getView().getView2D().getProjection());
                    geom.transform(transform);
                    var newBounds = geom.getBounds();
                    var x = newBounds[2] - newBounds[0];
                    var y = newBounds[3] - newBounds[1];
                    x *= 0.1;
                    y *= 0.1;
                    newBounds[0] -= x;
                    newBounds[2] += x;
                    newBounds[1] -= y;
                    newBounds[3] += y;
                    mapService.zoomToExtent(newBounds, scope.map);
                  },500);

                }, function(reject) {
                  console.log(reject);
                });
              }

            }

            updateVariables();

            scope.$watch('feature', updateVariables);
          }
        };
      }
  );
})();
