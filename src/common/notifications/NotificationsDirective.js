(function() {
  var module = angular.module('loom_notifications_directive', []);

  module.directive('loomNotifications',
      function($rootScope, notificationService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'notifications/partial/notifications.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope, element, attrs) {
            scope.emptyText = attrs.notificationEmptyText;
            scope.notificationService = notificationService;

            scope.removeNotification = function(id) {
              notificationService.removeNotification(id);
            };

            scope.markAsRead = function(id) {
              notificationService.markAsRead(notificationService.getNotification(id));
            };
          }
        };
      });
}());
