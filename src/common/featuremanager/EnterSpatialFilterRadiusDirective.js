(function() {

  var module = angular.module('loom_enter_spatial_filter_radius_directive', []);

  module.directive('loomEnterSpatialFilterRadius',
      function(featureManagerService, mapService) {
        return {
          restrict: 'C',
          templateUrl: 'featuremanager/partial/enterspatialfilterradius.tpl.html',
          link: function(scope, element) {
            scope.featureManagerService = featureManagerService;
            scope.mapService = mapService;

            scope.$on('enterSpatialFilterRadius', function(evt, feature) {
              scope.feature = feature;
              $('#enter-spatial-filter-radius-dialog').modal('show');
            });

            scope.reset = function() {
              scope.radius = null;
            };

            scope.reset();

            scope.addFilter = function() {
              // Convert the radius and add the feature to the spatial filter layer
              var convertedRadius = scope.radius * ol.proj.METERS_PER_UNIT[ol.proj.get(scope.mapService.getProjection()).getUnits()];
              scope.feature.setGeometry(ol.geom.Polygon.fromCircle(
                  new ol.geom.Circle(scope.feature.getGeometry().getCoordinates(), convertedRadius),
                  128
                  ));
              scope.mapService.addToSpatialFilterLayer(scope.feature);

              // Reset and close the modal and close the "feature info" dialog
              scope.reset();
              element.closest('.modal').modal('hide');
              scope.featureManagerService.hide();
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                scope.reset();
              }
            };
            scope.$on('modal-closed', closeModal);
          }
        };
      }
  );
})();
