(function() {
  var module = angular.module('loom_history_popover_directive', []);

  module.directive('loomHistoryPopover',
      function($translate) {
        return {
          restrict: 'C',
          replace: false,
          link: function(scope, element) {
            var safeName = function(name) {
              if (goog.isDefAndNotNull(name) && name.length > 0) {
                return name;
              }
              return $translate('anonymous');
            };
            var safeEmail = function(email) {
              if (goog.isDefAndNotNull(email) && email.length > 0) {
                return email;
              }
              return $translate('no_email');
            };
            var prettyTime = function(time) {
              var date = new Date(time);
              return date.toLocaleDateString() + ' @ ' + date.toLocaleTimeString();
            };
            var prettyMessage = function() {
              return scope.commit.message;
            };

            var content = '<div class="history-popover-content">' +
                '<div class="history-popover-label">' + $translate('author_name') + ':</div>' +
                '<div class="history-popover-value">' + safeName(scope.commit.author.name) + '</div>' +
                '<div class="history-popover-label">' + $translate('author_email') + ':</div>' +
                '<div class="history-popover-value">' + safeEmail(scope.commit.author.email) + '</div>' +
                '<div class="history-popover-label">' + $translate('committer_name') + ':</div>' +
                '<div class="history-popover-value">' + safeName(scope.commit.committer.name) + '</div>' +
                '<div class="history-popover-label">' + $translate('committer_email') + ':</div>' +
                '<div class="history-popover-value">' + safeEmail(scope.commit.committer.email) + '</div>' +
                '<div class="history-popover-label">' + $translate('commit_time') + ':</div>' +
                '<div class="history-popover-value">' + prettyTime(scope.commit.committer.timestamp) + '</div>' +
                '<div class="history-popover-label">' + $translate('message') + ':</div>' +
                '<div class="history-popover-value">' + prettyMessage() + '</div>';

            element.popover({
              trigger: 'manual',
              animation: false,
              html: true,
              content: content,
              title: $translate('id') + ': ' + scope.commit.id
            });

            scope.showPopover = function() {
              if (element.closest('.collapsing').length === 0) {
                element.popover('show');
              }
            };
            scope.hidePopover = function() {
              element.popover('hide');
            };
          }
        };
      });
}());
