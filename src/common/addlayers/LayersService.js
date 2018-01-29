(function() {
  var module = angular.module('loom_layers_service', []);

  module.provider('LayersService', function() {

    this.$get = function($rootScope, mapService) {
      service_ = this;
      rootScope_ = $rootScope;
      mapService_ = mapService;
      return this;
    };

    this.filterAddedLayers = function(layerConfig, currentServerId, layerName) {
      var show = true;
      var layers = mapService_.getLayers(true, true);
      for (var index = 0; index < layers.length; index++) {
        var layer = layers[index];
        if (goog.isDefAndNotNull(layer.get('metadata')) &&
            goog.isDefAndNotNull(layer.get('metadata').config)) {
          var conf = layer.get('metadata').config;
          if (conf.serverId === currentServerId) {
            if (conf.registry === true) {
              if (conf.registryConfig.uuid === layerConfig.uuid) {
                show = false;
                break;
              }
            } else {
              if (conf.name === layerName) {
                show = false;
                break;
              }
            }
          }
        }
      }
      return show;
    };

    this.addLayer = function(layerConfig, currentServerId, virtualServer) {
      if (layerConfig.add) {
        // NOTE: minimal config is the absolute bare minimum info that will be send to webapp containing
        //       maploom such as geonode. At this point, only source (server id), and name are used. If you
        //       find the need to add more parameters here, you need to put them in MapService.addLayer
        //       instead. that's because MapService.addLayer may be invoked from here, when a saved
        //       map is opened, or when a map is created from a layer in which case the logic here will be
        //       skipped! note, when MapService.addLayer is called, server's getcapabilities (if applicable)
        //       has already been resolved so you can used that info to append values to the layer.
        var minimalConfig = {
          name: layerConfig.name || layerConfig.Name || layerConfig.title,
          source: currentServerId,
          remote: layerConfig.remote === true
        };

        if (virtualServer) {
          mapService_.addVirtualLayer(minimalConfig, layerConfig, virtualServer);
        }else {
          mapService_.addLayer(minimalConfig, layerConfig);
        }

        layerConfig.add = false;

        if (layerConfig.CRS && layerConfig.extent) {
          mapService_.zoomToExtentForProjection(layerConfig.extent, ol.proj.get(layerConfig.CRS[0]));
        }
      }
    };
  });
}());
