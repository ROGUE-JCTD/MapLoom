(function() {
  var module = angular.module('loom_drag_zoom_directive', []);

  module.directive('loomDragZoom',
      function() {
        return {
          restrict: 'C',
          templateUrl: 'map/partials/dragzoom.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope) {
            function activateDragZoom() {
              //first we need to get access to the map's drag zoom interaction, if there is one
              var index;
              for (index = 0; index < scope.map.getInteractions().getLength(); ++index) {
                if (scope.map.getInteractions().getArray()[index] instanceof ol.interaction.DragZoom) {
                  break;
                }
              }
              if (index == scope.map.getInteractions().getLength()) {
                console.log('Drag zoom interaction is not supported on this map');
                return;
              }

              //set the condition to always so that drag zoom will activate anytime the map is dragged
              scope.map.getInteractions().getArray()[index].condition_ = ol.interaction.condition.always;
            }

            scope.activateDragZoom = activateDragZoom;

            scope.map.on('dragend', function() {
              var index;
              for (index = 0; index < scope.map.getInteractions().getLength(); ++index) {
                if (scope.map.getInteractions().getArray()[index] instanceof ol.interaction.DragZoom) {
                  break;
                }
              }
              if (index == scope.map.getInteractions().getLength()) {
                console.log('Drag zoom interaction is not supported on this map');
                return;
              }

              //Reset the condition to its default behavior after each use
              scope.map.getInteractions().getArray()[index].condition_ = ol.interaction.condition.shiftKeyOnly;
            });
          }
        };
      });
}());
