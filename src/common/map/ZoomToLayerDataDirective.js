(function() {
  var module = angular.module('loom_zoom_to_layer_data_directive', []);

  module.directive('loomZoomToLayerData',
      function() {
        return {
          restrict: 'C',
          templateUrl: 'map/partials/zoomtolayerdata.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope) {
            function zoomToExtent() {
              var view = scope.map.getView().getView2D();
              //using the extent of the projection because
              //we don't have a good way of getting a layer's extent at the moment
              var extent = view.getProjection().getExtent();
              view.fitExtent(extent, scope.map.getSize());
            }

            scope.zoomToExtent = zoomToExtent;
          }
        };
      });
}());
