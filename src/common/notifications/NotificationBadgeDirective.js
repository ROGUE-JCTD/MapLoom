(function() {
  var module = angular.module('loom_notification_badge_directive', []);

  module.directive('loomNotificationBadge',
      function($rootScope, notificationService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'notifications/partial/notificationbadge.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope) { // Unused: element, attrs
            function updateScopeVariables() {
              if (!scope.$$phase && !$rootScope.$$phase) {
                scope.$apply(function() {
                  scope.notificationService = notificationService;
                });
              }
            }

            scope.notificationService = notificationService;
            scope.$on('notification_added', updateScopeVariables);
            scope.$on('notification_updated', updateScopeVariables);
            scope.$on('notification_removed', updateScopeVariables);
          }
        };
      });
}());
