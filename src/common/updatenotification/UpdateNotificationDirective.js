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

            var i, j, k;
            for (i = 0; i < repos.length; i += 1) {
              var layers = repos[i].layers;
              for (j = 0; j < layers.length; j += 1) {
                var layer = layers[j];
                if (layer.adds) {
                  for (k = 0; k < layer.adds.length; k += 1) {
                    adds.push({
                      repo: repos[i].name,
                      layer: layer.name,
                      feature: layer.adds[k]
                    });
                  }
                }
                if (layer.modifies) {
                  for (k = 0; k < layer.modifies.length; k += 1) {
                    modifies.push({
                      repo: repos[i].name,
                      layer: layer.name,
                      feature: layer.modifies[k]
                    });
                  }
                }
                if (layer.deletes) {
                  for (k = 0; k < layer.deletes.length; k += 1) {
                    deletes.push({
                      repo: repos[i].name,
                      layer: layer.name,
                      feature: layer.deletes[k]
                    });
                  }
                }
              }
            }
            scope.adds = adds;
            scope.modifies = modifies;
            scope.deletes = deletes;
          }
        };
      });
}());
