(function() {
  var module = angular.module('loom_notifications_service', []);

  // Private Variables
  var notifications = [];
  var nextNotificationId = 0;
  var rootScope = null;

  module.provider('notificationService', function() {
    this.$get = function($rootScope) {
      rootScope = $rootScope;
      return this;
    };

    this.getNotifications = function() {
      return notifications;
    };

    this.addNotification = function(notification) {
      notification.id = nextNotificationId;
      nextNotificationId = nextNotificationId + 1;
      notifications.push(notification);
      rootScope.$broadcast('notification_added', notification);
    };

    this.unreadCount = function() {
      var unread = 0, i;

      for (i = 0; i < notifications.length; i = i + 1) {
        if (notifications[i].read === false) {
          unread = unread + 1;
        }
      }
      return unread;
    };

    this.markAsRead = function(notification) {
      var i;
      for (i = 0; i < notifications.length; i = i + 1) {
        if (notifications[i].id === notification.id) {
          notifications[i].read = true;
        }
      }
      rootScope.$broadcast('notification_updated', notification);
    };

    this.getNotification = function(id) {
      var i;
      for (i = 0; i < notifications.length; i = i + 1) {
        if (notifications[i].id === id) {
          return notifications[i];
        }
      }
      return null;
    };

    this.removeNotification = function(id) {
      var index = -1, i;
      for (i = 0; i < notifications.length; i = i + 1) {
        if (notifications[i].id === id) {
          index = i;
        }
      }
      if (index > -1) {
        notifications.splice(index, 1);
      }
      rootScope.$broadcast('notification_removed', id);
    };
  });

}());
