(function() {
  var module = angular.module('loom_history_popover_directive', []);

  module.directive('loomHistoryPopover',
      function($translate) {
        return {
          restrict: 'C',
          replace: false,
          link: function(scope, element, attrs) {
            if (!goog.isDefAndNotNull(scope.commit)) {
              scope.commit = scope.$eval(attrs.commit);
            }
            if (!goog.isDefAndNotNull(scope.commit)) {
              element.popover('destroy');
              return;
            }
            var safeName = function(author) {
              if (goog.isDefAndNotNull(author)) {
                if (goog.isDefAndNotNull(author.name) && author.name.length > 0) {
                  return author.name;
                }
              }
              return $translate.instant('anonymous');
            };
            var safeEmail = function(author) {
              if (goog.isDefAndNotNull(author)) {
                if (goog.isDefAndNotNull(author.email) && author.email.length > 0) {
                  return author.email;
                }
              }
              return $translate.instant('no_email');
            };
            var prettyTime = function(meta) {
              if (goog.isDefAndNotNull(meta) && goog.isDefAndNotNull(meta.timestamp)) {
                var date = new Date(meta.timestamp);
                return date.toLocaleDateString() + ' @ ' + date.toLocaleTimeString();
              }
              return '';
            };
            var prettyMessage = function() {
              if (goog.isDefAndNotNull(scope.commit.message)) {
                return scope.commit.message;
              }
              return '';
            };

            var content = '<div class="popover-label">' + $translate.instant('author_name') + ':</div>' +
                '<div class="popover-value">' + safeName(scope.commit.author) + '</div>' +
                '<div class="popover-label">' + $translate.instant('author_email') + ':</div>' +
                '<div class="popover-value">' + safeEmail(scope.commit.author) + '</div>' +
                '<div class="popover-label">' + $translate.instant('committer_name') + ':</div>' +
                '<div class="popover-value">' + safeName(scope.commit.committer) + '</div>' +
                '<div class="popover-label">' + $translate.instant('committer_email') + ':</div>' +
                '<div class="popover-value">' + safeEmail(scope.commit.committer) + '</div>' +
                '<div class="popover-label">' + $translate.instant('commit_time') + ':</div>' +
                '<div class="popover-value">' + prettyTime(scope.commit.committer) + '</div>' +
                '<div class="popover-label">' + $translate.instant('message') + ':</div>' +
                '<div class="popover-value">' + prettyMessage() + '</div>';

            element.popover({
              trigger: 'manual',
              animation: false,
              html: true,
              content: content,
              container: 'body',
              title: $translate.instant('id') + ': ' + scope.commit.id
            });

            element.mouseenter(function() {
              if (element.closest('.collapsing').length === 0) {
                element.popover('show');
              }
            });
            element.mouseleave(function() {
              element.popover('hide');
            });
          }
        };
      });
}());
