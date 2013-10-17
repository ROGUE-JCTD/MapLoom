(function() {
  var module = angular.module('loom_notification_badge_directive', []);

  module.directive('loomNotificationBadge',
      function(notificationService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'notifications/partial/notificationbadge.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope) {
            scope.notificationService = notificationService;
          }
        };
      });
}());
