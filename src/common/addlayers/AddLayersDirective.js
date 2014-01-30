(function() {

  var module = angular.module('loom_addlayers_directive', []);

  module.directive('loomAddlayers',
      function($rootScope, serverService, mapService, geogitService, $translate) {
        return {
          templateUrl: 'addlayers/partials/addlayers.tpl.html',
          link: function(scope, element) {
            scope.serverService = serverService;

            angular.element('#layer-filter')[0].attributes.placeholder.value = $translate('filter_layers');
            scope.setCurrentServerIndex = function(serverIndex) {
              scope.currentServerIndex = serverIndex;
              serverService.populateLayersConfig(serverIndex);
            };

            // default to the Local Geoserver. Note that when a map is saved and loaded again,
            // the order of the servers might be different and MapLoom should be able to handle it accordingly
            scope.setCurrentServerIndex(serverService.getServerByName('Local Geoserver').id);

            scope.addLayers = function(layersConfig) {
              var currentServer = serverService.getServerByIndex(scope.currentServerIndex);
              //var layers = scope.serverService.populateLayersConfig(scope.currentServerIndex);

              // if the server is not a typical server and instead the hardcoded ones
              console.log('---- addLayers. currentServer: ', currentServer, ', layersConfig', layersConfig);
              var length = layersConfig.length;
              for (var index = 0; index < length; index += 1) {
                var config = layersConfig[index];
                console.log(config);
                if (config.add) {
                  var slimConfig = {
                    source: scope.currentServerIndex,
                    title: config.title,
                    name: config.name,
                    sourceParams: config.sourceParams
                  };
                  mapService.addLayer(slimConfig);

                  config.add = false;
                  config.added = true;
                }
              }
            };

            scope.selectServer = function(index) {
              scope.currentServerIndex = index;
            };

            scope.$on('layers-loaded', function() {
              if (!scope.$$phase && !$rootScope.$$phase) {
                scope.$apply();
              }
            });

            var layerRemoved = function(event, layer) {
              var layersConfig = scope.serverService.getLayersConfig(layer.get('metadata').serverId);
              for (var index = 0; index < layersConfig.length; index++) {
                var config = layersConfig[index];
                if (config.title === layersConfig.get('metadata').label) {
                  config.added = false;
                  return;
                }
              }
            };

            scope.$on('layerRemoved', layerRemoved);
          }
        };
      }
  );
})();
