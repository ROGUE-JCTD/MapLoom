(function() {
  var module = angular.module('loom_update_notification_directive', []);

  module.directive('loomUpdateNotification',
      function() {
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

            var i, j, k;
            for (i = 0; i < repos.length; i += 1) {
              var features = repos[i].features;
              if (goog.isDefAndNotNull(features)) {
                scope.noFeatures = false;
                for (j = 0; j < features.length; j += 1) {
                  var splitFeature = features[j].id.split('/');
                  var feature = {
                    repo: repos[i].name,
                    layer: splitFeature[0],
                    feature: splitFeature[1]
                  };
                  switch (features[j].change) {
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
                }
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
