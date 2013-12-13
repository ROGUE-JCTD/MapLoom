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
            var featureWord = function(count) {
              return count > 1 ? $translate('features') : $translate('feature');
            };
            var prettyMessage = function() {
              if (goog.isDefAndNotNull(scope.commit.summary)) {
                try {
                  var message = '';
                  json = JSON.parse(scope.commit.message);
                  if (goog.isDefAndNotNull(json.merge_branch) && goog.isString(json.merge_branch)) {
                    message += $translate('merge') + ' ' + json.merge_branch + ':<p>';
                  }
                  for (var layer in json) {
                    if (!goog.isObject(json[layer])) {
                      continue;
                    }
                    message += layer + ': ';
                    var added = json[layer]['added'];
                    var removed = json[layer]['removed'];
                    var modified = json[layer]['modified'];
                    var conflicted = json[layer]['conflicted'];
                    var comma = false;
                    if (goog.isDefAndNotNull(added) && added > 0) {
                      message += $translate('added') + ' ' + added + ' ' + featureWord(added);
                      comma = true;
                    }
                    if (goog.isDefAndNotNull(removed) && removed > 0) {
                      if (comma === true) {
                        message += ', ';
                      }
                      message += $translate('removed') + ' ' + removed + ' ' + featureWord(removed);
                      comma = true;
                    }
                    if (goog.isDefAndNotNull(modified) && modified > 0) {
                      if (comma === true) {
                        message += ', ';
                      }
                      message += $translate('modified') + ' ' + modified + ' ' + featureWord(modified);
                      comma = true;
                    }
                    if (goog.isDefAndNotNull(conflicted) && conflicted.length > 0) {
                      if (comma === true) {
                        message += ', ';
                      }
                      message += $translate('conflicted_features_resolved');
                      if (goog.isArray(conflicted)) {
                        var featureComma = false;
                        for (var i = 0; i < conflicted.length; i++) {
                          if (featureComma === true) {
                            message += ', ';
                          }
                          message += conflicted[i].split('/')[1];
                          featureComma = true;
                        }
                      } else {
                        message += conflicted;
                      }
                    }
                    message += '<p>';
                  }
                  return message;
                } catch (e) {}
              } else {
                return scope.commit.message;
              }
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
