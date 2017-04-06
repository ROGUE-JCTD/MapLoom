(function() {
  var module = angular.module('loom_legend_directive', []);

  var legendOpen = false;

  module.directive('loomLegend',
      function($rootScope, mapService, serverService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'legend/partial/legend.tpl.html',
          // The linking function will add behavior to the template
          link: function(scope, element) {
            scope.mapService = mapService;
            scope.serverService = serverService;

            var openLegend = function() {
              angular.element('#legend-container')[0].style.visibility = 'visible';
              angular.element('#legend-panel').collapse('show');
              legendOpen = true;
            };
            var closeLegend = function() {
              angular.element('#legend-panel').collapse('hide');
              legendOpen = false;

              //the timeout is so the transition will finish before hiding the div
              setTimeout(function() {
                angular.element('#legend-container')[0].style.visibility = 'hidden';
              }, 350);
            };

            scope.toggleLegend = function() {
              if (legendOpen === false) {
                if (angular.element('.legend-item').length > 0) {
                  openLegend();
                }
              } else {
                closeLegend();
              }
            };

            /** Registry layers may or may not have a legend available
             *  when there is one, return the URL, otherwise return null.
             */
            var getRegistryLegend = function(layer) {
              var legend = null;
              if (layer.get('metadata').registry) {
                var conf = layer.get('metadata').registryConfig;
                if (goog.isDefAndNotNull(conf.legend_url)) {
                  return conf.legend_url;
                }
              }

              return legend;
            };

            /** Test whether the layer *should* have a legend available.
             *
             *  @param {Object} layer The configuration for the layer from
             *                        mapService.getLayers()
             */
            scope.hasLegend = function(layer) {
              // handle the special case of registry layers.
              if (layer.get('metadata').registry) {
                return goog.isDefAndNotNull(getRegistryLegend(layer));
              }

              // ignore background layers, such as OSM.
              var conf = layer.get('metadata').config;
              if (conf && conf.group == 'background') {
                return false;
              }

              try {
                serverService.getServerById(layer.get('metadata').serverId);
              } catch (err) {
                // if the server id throws an error, there's no legend to be had.
                return false;
              }

              return true;
            };

            /** Launder the available layers for legending.
             */
            scope.getLayers = function() {
              var map_layers = mapService.getLayers(true, true);
              var legend_layers = [];

              for (var i = 0, ii = map_layers.length; i < ii; i++) {
                if (scope.hasLegend(map_layers[i])) {
                  legend_layers.push(map_layers[i]);
                }
              }

              return legend_layers;
            };

            scope.getLegendUrl = function(layer) {
              // don't bother with the rest if the layer has no legend.
              if (!scope.hasLegend(layer)) {
                return '';
              } else if (layer.get('metadata').registry) {
                return getRegistryLegend(layer);
              }

              var server = serverService.getServerById(layer.get('metadata').serverId);
              var domain = '';
              if (goog.isDefAndNotNull(server.virtualServiceUrl)) {
                domain = server.virtualServiceUrl;
              } else {
                domain = server.url;
              }

              var params = {
                request: 'GetLegendGraphic',
                format: 'image/png',
                width: '20', height: '20',
                transparent: 'true',
                legend_options: 'fontColor:0xFFFFFF;fontAntiAliasing:true;fontSize:14;fontStyle:bold;',
                layer: layer.get('metadata').name
              };

              // parse the server url
              var uri = new goog.Uri(domain);
              // mix in the paramters
              for (var key in params) {
                uri.setParameterValue(key, params[key]);
              }
              // kick back the URL as a formatted string.
              return uri.toString();
            };

            scope.$on('layer-added', function() {
              if (legendOpen === false) {
                openLegend();
              }
            });

            scope.$on('layerRemoved', function() {
              //close the legend if the last layer is removed
              if (legendOpen === true && angular.element('.legend-item').length == 1) {
                closeLegend();
              }
            });
          }
        };
      });
}());
