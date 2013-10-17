(function() {
  var module = angular.module('loom_arrangeable_directive', []);

  module.directive('loomArrangeable', function() {
    return {
      restrict: 'C',
      link: function(scope, element, attrs) { // Unused: attrs
        $(function() {
          var config = {
            // set item relative to cursor position
            onDragStart: function($item, container, _super) {
              var height = $item.outerHeight();
              var width = $item.outerWidth();
              var offset = $item.offset(),
                  pointer = container.rootGroup.pointer;

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
            }
          };

          if (attrs.arrangeablehandle) {
            config.handle = attrs.arrangeablehandle;
          }
          if (attrs.arrangeableitemselector) {
            config.itemSelector = attrs.arrangeableitemselector;
          }
          if (attrs.arrangeableplaceholder) {
            config.placeholder = attrs.arrangeableplaceholder;
          }

          element.sortable(config);
        });
      }
    };
  });
}());
