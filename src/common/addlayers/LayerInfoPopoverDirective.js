(function() {
  var module = angular.module('loom_layerinfo_popover_directive', []);

  module.directive('loomLayerinfoPopover',
      function($translate) {
        return {
          restrict: 'C',
          replace: false,
          link: function(scope, element) {

            var safeName = function() {
              if (goog.isDefAndNotNull(scope.layer.name)) {
                var split = scope.layer.name.split(':');
                return split[split.length - 1];
              }
              return '';
            };

            var safeTitle = function() {
              if (goog.isDefAndNotNull(scope.layer.title)) {
                return scope.layer.title;
              }
              return '';
            };

            var safeWorkspace = function() {
              if (goog.isDefAndNotNull(scope.layer.prefix)) {
                return scope.layer.prefix;
              }
              return '';
            };

            var safeAbstract = function() {
              if (goog.isDefAndNotNull(scope.layer.abstract)) {
                return scope.layer.abstract;
              }
              return '';
            };

            var buildKeywords = function() {
              var keywords = '';
              if (goog.isDefAndNotNull(scope.layer.keywords) && scope.layer.keywords.length > 0) {
                keywords += scope.layer.keywords[0].value;
                if (goog.isDefAndNotNull(scope.layer.keywords[0].vocabulary)) {
                  keywords += ' (' + scope.layer.keywords[0].vocabulary + ')';
                }
                for (var index = 0; index < scope.layer.keywords.length; index++) {
                  keywords += ', ' + scope.layer.keywords[index].value;
                  if (goog.isDefAndNotNull(scope.layer.keywords[index].vocabulary)) {
                    keywords += ' (' + scope.layer.keywords[index].vocabulary + ')';
                  }
                }
              }
              return keywords;
            };

            var content = '<div class="popover-label">' + $translate('server_name') + ':</div>' +
                '<div class="popover-value">' + safeName() + '</div>' +
                '<div class="popover-label">' + $translate('title') + ':</div>' +
                '<div class="popover-value">' + safeTitle() + '</div>' +
                '<div class="popover-label">' + $translate('workspace') + ':</div>' +
                '<div class="popover-value">' + safeWorkspace() + '</div>' +
                '<div class="popover-label">' + $translate('abstract') + ':</div>' +
                '<div class="popover-value">' + safeAbstract() + '</div>' +
                '<div class="popover-label">' + $translate('keywords') + ':</div>' +
                '<div class="popover-value">' + buildKeywords() + '</div>';

            element.popover({
              trigger: 'manual',
              animation: false,
              html: true,
              content: content,
              container: 'body',
              title: scope.layer.title
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
