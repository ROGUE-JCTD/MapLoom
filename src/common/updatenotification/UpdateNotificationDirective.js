(function() {
  var module = angular.module('loom_update_notification_directive', []);

  module.directive('loomUpdateNotification',
      function(mapService) {
        return {
          restrict: 'C',
          replace: true,
          scope: { notification: '=' },
          templateUrl: 'updatenotification/partial/updatenotification.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope) { // Unused: element, attrs

            var headerElement = angular.element('#update-notification-header-' + scope.notification.id);
            headerElement.attr('data-toggle', 'collapse');
            headerElement.attr('data-target', '#notification-description-' + scope.notification.id);
            headerElement.attr('data-parent', '#notification-collapse-group');
            headerElement.addClass('toggle');
            headerElement.addClass('collapsed');

            var repos = scope.notification.repos;
            var adds = [];
            var modifies = [];
            var deletes = [];
            var merges = [];
            var conflicts = [];

            var i = 0;
            //this function has to be defined outside of the loop, otherwise the linter gets angry
            var featureHandler = function(repoFeature) {
              var splitFeature = repoFeature.id.split('/');
              var crs = goog.isDefAndNotNull(repoFeature.crs) ? repoFeature.crs : null;
              mapService.map.getLayers().forEach(function(layer) {
                var metadata = layer.get('metadata');
                if (goog.isDefAndNotNull(metadata)) {
                  if (goog.isDefAndNotNull(metadata.geogigStore) && metadata.geogigStore === repos[i].name) {
                    if (goog.isDefAndNotNull(metadata.nativeName) && metadata.nativeName === splitFeature[0]) {
                      if (goog.isDefAndNotNull(metadata.projection)) {
                        crs = metadata.projection;
                      }
                    }
                  }
                }
              });

              var geom = WKT.read(repoFeature.geometry);
              if (goog.isDefAndNotNull(crs)) {
                geom.transform(crs, mapService.map.getView().getProjection());
              }
              var feature = {
                repo: repos[i].name,
                layer: splitFeature[0],
                feature: splitFeature[1],
                original: repoFeature,
                extent: geom.getExtent()
              };
              switch (repoFeature.change) {
                case 'ADDED':
                  adds.push(feature);
                  break;
                case 'MODIFIED':
                  modifies.push(feature);
                  break;
                case 'REMOVED':
                  deletes.push(feature);
                  break;
                case 'MERGED':
                  merges.push(feature);
                  break;
                case 'CONFLICT':
                  conflicts.push(feature);
                  break;
              }
            };
            for (i = 0; i < repos.length; i += 1) {
              var features = repos[i].features;
              if (goog.isDefAndNotNull(features)) {
                scope.noFeatures = false;
                forEachArrayish(features, featureHandler);
              } else {
                scope.noFeatures = true;
                scope.message = scope.notification.emptyMessage;
              }
            }
            scope.adds = adds;
            scope.modifies = modifies;
            scope.deletes = deletes;
            scope.merges = merges;
            scope.conflicts = conflicts;
          }
        };
      });
}());
