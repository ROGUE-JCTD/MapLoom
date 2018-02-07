(function() {
  var module = angular.module('loom_loading_directive', []);

  module.directive('loomLoading',
      function() {
        return {
          restrict: 'C',
          templateUrl: 'utils/partial/loading.tpl.html',
          scope: {
            spinnerText: '@text',
            spinnerHidden: '='
          },
          link: function(scope, element, attrs) {
            scope.spinnerWidth = 3;
            scope.spinnerRadius = 28;
            if (goog.isDefAndNotNull(attrs.spinnerWidth)) {
              scope.spinnerWidth = parseInt(attrs.spinnerWidth, 10);
            }
            if (goog.isDefAndNotNull(attrs.spinnerRadius)) {
              scope.spinnerRadius = parseInt(attrs.spinnerRadius, 10);
            }
            var loading = element.find('.loading');
            loading.css('width', scope.spinnerRadius + 'px');
            loading.css('height', scope.spinnerRadius + 'px');
            loading.css('margin', '-' + scope.spinnerRadius / 2 + 'px 0 0 -' + scope.spinnerRadius / 2 + 'px');

            var loadingSpinner = element.find('.loading-spinner');
            loadingSpinner.css('width', (scope.spinnerRadius - scope.spinnerWidth) + 'px');
            loadingSpinner.css('height', (scope.spinnerRadius - scope.spinnerWidth) + 'px');
            loadingSpinner.css('border', scope.spinnerWidth + 'px solid');
            loadingSpinner.css('border-radius', (scope.spinnerRadius / 2) + 'px');

            var mask = element.find('.mask');
            mask.css('width', (scope.spinnerRadius / 2) + 'px');
            mask.css('height', (scope.spinnerRadius / 2) + 'px');

            var spinner = element.find('.spinner');
            spinner.css('width', scope.spinnerRadius + 'px');
            spinner.css('height', scope.spinnerRadius + 'px');

            var text = element.find('.spinner-text');
            // when the text exists, push it to the left to make it legible.
            if (goog.isDefAndNotNull(scope.spinnerText) && scope.spinnerText.length > 0) {
              text.css('padding-left', (scope.spinnerRadius + 2) + 'px');
              text.css('padding-top', (scope.spinnerWidth) + 'px');
            // else, don't waste the browser's time with rendering it.
            } else {
              text.css('display', 'none');
            }
          }
        };
      });
}());
