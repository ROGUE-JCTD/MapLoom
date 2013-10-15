(function() {

  var module = angular.module('loom_addlayers_directive', []);

  module.directive('loomAddlayers',
      function($location) {
        return {
          scope: {

          },
          templateUrl: 'addlayers/partials/addlayers.tpl.html',
          link: function(scope) {
            var parser = new ol.parser.ogc.WMSCapabilities();
            // TODO: Add variable for ip to append onto url.
            var url = '/geoserver/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0';
            scope.addLayers = function() {
              var length = scope.layers.length;
              for (var index = 0; index < length; index += 1) {
                var layer = scope.layers[index];
                if (layer.add) {
                  var newLayer = new ol.layer.Tile({
                    source: new ol.source.TileWMS({
                      url: 'http://' + $location.host() + '/geoserver/wms',
                      params: {'LAYERS': layer.name}
                    })
                  });
                  map.addLayer(newLayer);
                  layer.add = false;
                  layer.added = true;
                }
              }
            };

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);

            /**
             * onload handler for the XHR request.
             */
            xhr.onload = function() {
              if (xhr.status == 200) {
                scope.$apply(function() {
                  scope.layers = parser.read(xhr.responseXML).capability.layers;
                  for (var index = 0; index < scope.layers.length; index += 1) {
                    scope.layers[index].added = false;
                  }
                });

                console.log('scope.layers', scope.layers);
              }
            };
            xhr.send();
          }
        };
      }
  );
})();
