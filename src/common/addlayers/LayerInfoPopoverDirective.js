(function() {
  var module = angular.module('loom_layerinfo_popover_directive', []);

  module.directive('loomLayerinfoPopover',
      function($translate) {
        return {
          restrict: 'C',
          replace: false,
          link: function(scope, element) {

            var safeName = function() {
              if (goog.isDefAndNotNull(scope.layer.Name)) {
                var split = scope.layer.Name.split(':');
                return split[split.length - 1];
              }
              return '';
            };

            var safeTitle = function() {
              if (goog.isDefAndNotNull(scope.layer.Title)) {
                return scope.layer.Title;
              }
              return '';
            };

            var safeWorkspace = function() {
              if (goog.isDefAndNotNull(scope.layer.Name)) {
                var split = scope.layer.Name.split(':');
                return split[0];
              }
              return '';
            };

            var safeAbstract = function() {
              if (goog.isDefAndNotNull(scope.layer.Abstract)) {
                return scope.layer.Abstract;
              }
              return '';
            };

            var buildKeywords = function() {
              if (goog.isDefAndNotNull(scope.layer.KeywordList)) {
                return scope.layer.KeywordList.toString();
              }
              return '';
            };

            var content = '<div class="popover-label">' + $translate.instant('server_name') + ':</div>' +
                '<div class="popover-value">' + safeName() + '</div>' +
                '<div class="popover-label">' + $translate.instant('title') + ':</div>' +
                '<div class="popover-value">' + safeTitle() + '</div>' +
                '<div class="popover-label">' + $translate.instant('workspace') + ':</div>' +
                '<div class="popover-value">' + safeWorkspace() + '</div>' +
                '<div class="popover-label">' + $translate.instant('abstract') + ':</div>' +
                '<div class="popover-value">' + safeAbstract() + '</div>' +
                '<div class="popover-label">' + $translate.instant('keywords') + ':</div>' +
                '<div class="popover-value">' + buildKeywords() + '</div>';

            element.popover({
              trigger: 'manual',
              animation: false,
              html: true,
              content: content,
              container: 'body',
              title: scope.layer.title
            });
            element.mouseenter(function() {
              if (element.closest('.collapsing').length === 0) {
                element.popover('show');
              }
            });
            element.mouseleave(function() {
              element.popover('hide');
            });

            scope.$watch('layer', function() {
              element.popover('destroy');
              var content = '<div class="popover-label">' + $translate.instant('server_name') + ':</div>' +
                  '<div class="popover-value">' + safeName() + '</div>' +
                  '<div class="popover-label">' + $translate.instant('title') + ':</div>' +
                  '<div class="popover-value">' + safeTitle() + '</div>' +
                  '<div class="popover-label">' + $translate.instant('workspace') + ':</div>' +
                  '<div class="popover-value">' + safeWorkspace() + '</div>' +
                  '<div class="popover-label">' + $translate.instant('abstract') + ':</div>' +
                  '<div class="popover-value">' + safeAbstract() + '</div>' +
                  '<div class="popover-label">' + $translate.instant('keywords') + ':</div>' +
                  '<div class="popover-value">' + buildKeywords() + '</div>';

              element.popover({
                trigger: 'manual',
                animation: false,
                html: true,
                content: content,
                container: 'body',
                title: scope.layer.title
              });
            });
          }
        };
      });
}());
