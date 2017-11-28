(function() {
  var module = angular.module('loom_diff_list_directive', []);

  module.directive('loomDiffList', function(mapService, serverService) {
    return {
      restrict: 'C',
      replace: true,
      templateUrl: 'diff/partial/difflist.tpl.html',
      scope: {
        addList: '=',
        modifyList: '=',
        deleteList: '=',
        conflictList: '=',
        mergeList: '=',
        clickCallback: '='
      },
      link: function(scope) {
        scope.conciseName = function(input) {
          if (input.length > 9) {
            return input.substr(input.length - 4);
          } else {
            return input;
          }
        };

        scope.zoomToFeature = function(feature) {
          var servers = serverService.getServers();
          var crs = null;

          for (var i = 0, ii = servers.length; i < ii && crs === null; i++) {
            var layer = serverService.getLayerConfig(servers[i].id, {Name: 'geonode:' + feature.layer});
            // see if we got a layer from this server.
            if (goog.isDefAndNotNull(layer)) {
              // ooooh, the layer is available.
              //  check for a CRS.
              if (layer.CRS && layer.CRS.length > 0) {
                crs = layer.CRS[0];
              }
            }
          }

          // if a CRS is not found, then default to WGS84.
          if (crs === null) {
            crs = 'EPSG:4326';
          }

          //mapService.zoomToExtent(feature.extent, null, null, 0.5);
          mapService.zoomToExtentForProjection(feature.extent, ol.proj.get(crs));
        };
      }
    };
  });
}());
