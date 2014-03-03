(function() {
  var module = angular.module('loom_layerinfo_popover_directive', []);

  module.directive('loomLayerinfoPopover',
      function($translate) {
        return {
          restrict: 'C',
          replace: false,
          link: function(scope, element) {

            var content = '<div class="layer-popover-content">' +
                '<div class="layer-popover-label">' + 'Name' + ':</div>' +
                '<div class="layer-popover-value">' + scope.layer.name + '</div>' +
                '<div class="layer-popover-label">' + 'Title' + ':</div>' +
                '<div class="layer-popover-value">' + scope.layer.title + '</div>' +
                '<div class="layer-popover-label">' + 'FeatureType Name' + ':</div>' +
                '<div class="layer-popover-value">' + scope.layer.nativeName + '</div>' +
                '<div class="layer-popover-label">' + 'Abstract' + ':</div>' +
                '<div class="layer-popover-value">' + scope.layer.abstract + '</div>' +
                '<div class="layer-popover-label">' + 'Keywords' + ':</div>' +
                '<div class="layer-popover-value">' + scope.layer.keywords.toString() + '</div>';

            element.popover({
              trigger: 'manual',
              animation: false,
              html: true,
              content: content,
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
