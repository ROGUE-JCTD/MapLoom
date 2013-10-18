(function() {
  var module = angular.module('loom_arrangeable_directive', []);

  module.directive('loomArrangeable', function() {
    return {
      restrict: 'C',
      link: function(scope, element, attrs) { // Unused: attrs
        $(function() {
          var startIndex = -1;
          var config = {
            // set item relative to cursor position
            onDragStart: function($item, container, _super) {
              var height = $item.outerHeight();
              var width = $item.outerWidth();
              var offset = $item.offset(),
                  pointer = container.rootGroup.pointer;
              startIndex = $item.index();
              adjustment = {
                left: pointer.left - offset.left,
                top: pointer.top - offset.top
              };

              _super($item, container);

              $item.css({
                width: width,
                height: height
              });
            },
            onDrag: function($item, position) {
              $item.css({
                left: position.left - adjustment.left,
                top: position.top - adjustment.top
              });
            },
            onDrop: function($item, container, _super) {
              scope.$eval(attrs.arrangeableCallback)(startIndex, $item.index());
              _super($item);
            },
            distance: 5
          };

          if (attrs.arrangeableHandle) {
            config.handle = attrs.arrangeableHandle;
          }
          if (attrs.arrangeableItemSelector) {
            config.itemSelector = attrs.arrangeableItemSelector;
          }
          if (attrs.arrangeablePlaceholder) {
            config.placeholder = attrs.arrangeablePlaceholder;
          }
          if (attrs.arrangeableDragDistance) {
            config.distance = attrs.arrangeableDragDistance;
          }

          element.sortable(config);
        });
      }
    };
  });
}());
