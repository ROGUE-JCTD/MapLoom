(function() {
  var module = angular.module('loom_measurepanel_directive', []);

  module.directive('loomMeasurepanel',
      function($rootScope, mapService, serverService) {
        return {
          replace: true,
          templateUrl: 'measure/partials/measurePanel.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope, element) {
            scope.mapService = mapService;
            scope.serverService = serverService;

            /** Handy flag for when measuring is happening */
            scope.isMeasuring = false;

            /** measuring feature. */
            scope.feature = null;

            /** label for hte output */
            scope.measureType = '';

            /** measuring 'source' */
            scope.source = new ol.source.Vector();

            /** measuring layer */
            scope.layer = new ol.layer.Vector({
              source: scope.source
            });

            /** which units to use as output. */
            scope.units = 'm';

            /** array of units options */
            scope.unitTypes = [
              {type: 'm', label: 'M/KM'},
              {type: 'mi', label: 'Mi'},
              {type: 'ft', label: 'Ft'}
            ];

            /** Change the units */
            scope.changeUnits = function(newUnits) {
              scope.units = newUnits;
            };

            /** A formatted string describing the measure */
            scope.measureLabel = 0;

            /** Formatted units label. */
            scope.unitsLabel = '';

            /** The interaction for drawing on the map,
             *   defaults to null, set when measuring is started.
             */
            scope.interaction = null;

            /** Create the interaction.
             */
            var createInteraction = function(measureType) {
              return new ol.interaction.Draw({
                source: scope.source,
                type: (measureType == 'line' ? 'LineString' : 'Polygon')
              });
            };

            /** This comes striaght from the OL Measuring example.
             *
             *  http://openlayers.org/en/latest/examples/measure.html
             *
             */
            var wgs84Sphere = new ol.Sphere(6378137);

            /** The map's projection should not change. */
            var mapProjection = mapService.map.getView().getProjection();

            /** When the measure has changed, update the UI.
             *
             *  Calculations are always done geodesically.
             *
             */
            scope.updateMeasure = function() {
              var geo = scope.feature.getGeometry();
              // convert the geography to wgs84
              var wgs84_geo = geo.clone().transform(mapProjection, 'EPSG:4326');
              var coords = [];

              if (geo instanceof ol.geom.Polygon) {
                // get the polygon coordinates
                coords = wgs84_geo.getLinearRing(0).getCoordinates();
                // ensure polygon has at least 3 points.
                if (coords.length > 2) {
                  // and calculate the area
                  var area = Math.abs(wgs84Sphere.geodesicArea(coords));
                  // convert to km's.
                  if (area > 1000000 && scope.units == 'm') {
                    // m -> km
                    area = area / 1000000;
                    scope.unitsLabel = 'km^2';
                  } else if (scope.units == 'ft') {
                    area = area * 10.7639;
                    scope.unitsLabel = 'ft^2';
                  } else if (scope.units == 'mi') {
                    area = (area / 1000) * 0.000386102;
                    scope.unitsLabel = 'mi^2';
                  } else {
                    scope.unitsLabel = 'm^2';
                  }
                  scope.measureLabel = area;

                  // this updates outside of the standard angular event cycle,
                  //  so it is necessary to notify angular to update.
                  scope.$apply();
                }
              } else {
                var length = 0;
                coords = wgs84_geo.getCoordinates();
                if (coords.length > 1) {
                  for (var i = 1, ii = coords.length; i < ii; i++) {
                    length += wgs84Sphere.haversineDistance(coords[i - 1], coords[i]);
                  }

                  if (length > 1000 && scope.units == 'm') {
                    // m -> km
                    length = length / 1000;
                    scope.unitsLabel = 'km';
                  } else if (scope.units == 'ft') {
                    // m -> ft
                    length = length * 3.28084;
                    scope.unitsLabel = 'ft';
                  } else if (scope.units == 'mi') {
                    // m -> mi
                    length = length / 1609;
                    scope.unitsLabel = 'mi';
                  } else {
                    // assumes meters
                    scope.unitsLabel = 'm';
                  }

                  scope.measureLabel = length;
                  // see the note above re: forcing the update.
                  scope.$apply();
                }
              }
            };

            /** Initiate the measuring tool
             *
             *  @param {String} measureType 'line' or 'area' to determine what
             *                              type of measuring should be done.
             */
            scope.startMeasuring = function(measureType) {
              // cancel whatever current measuring is happening.
              if (scope.isMeasuring) {
                scope.stopMeasuring();
              }

              scope.measureType = measureType;

              // add the measuring layer to the map.
              mapService.map.addLayer(scope.layer);

              // configure and add the interaction
              scope.interaction = createInteraction(measureType);
              mapService.map.addInteraction(scope.interaction);

              scope.interaction.on('drawstart', function(event) {
                // clear out the drawing of a feature whenever
                //  a drawing starts.
                scope.source.clear();

                // reset the measure label.
                scope.measureLabel = 0;

                // configure the listener for the geometry changes.
                scope.feature = event.feature;
                scope.feature.getGeometry().on('change', scope.updateMeasure);
              });

              scope.isMeasuring = true;
            };

            /** Stop the measuring process.
             *
             *  Cleans up the artifacts
             *   of the measure tool from the map.
             */
            scope.stopMeasuring = function() {
              // remove the layer from the map
              mapService.map.removeLayer(scope.layer);

              // clear the measure.
              scope.measureLabel = 0;

              // remove the interaction.
              if (scope.interaction !== null) {
                mapService.map.removeInteraction(scope.interaction);
              }

              // reset the measure type
              scope.measureType = '';

              // flag measuring as 'stopped'
              scope.isMeasuring = false;
            };

          }
        };
      });
})();
