(function() {
  var module = angular.module('loom_notifications_service', []);

  // Private Variables
  var notifications = [];
  var nextNotificationId = 0;
  var rootScope = null;
  var translate_ = null;

  module.provider('notificationService', function() {
    this.startTime = null;

    this.$get = function($rootScope, $timeout, $translate) {
      rootScope = $rootScope;
      translate_ = $translate;
      var momentDate = moment(new Date());
      momentDate.lang($translate.use());
      this.startTime = momentDate.format('LT');
      var updateTimestamps = function() {
        for (i = 0; i < notifications.length; i = i + 1) {
          momentDate = moment(notifications[i].time);
          momentDate.lang($translate.use());
          notifications[i].timestr = momentDate.fromNow();
        }
        $timeout(updateTimestamps, 10000, true);
      };
      updateTimestamps();
      return this;
    };

    this.getNotifications = function() {
      return notifications;
    };

    this.addNotification = function(notification) {
      notification.id = nextNotificationId;
      notification.time = new Date();
      var momentDate = moment(notification.time);
      momentDate.lang(translate_.use());
      notification.timestr = momentDate.fromNow();
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
