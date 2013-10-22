(function() {
  var module = angular.module('ngBoilerplate', [
    'templates-app',
    'templates-common',
    'loom',
    'ui.bootstrap',
    'ui.router',
    'pascalprecht.translate',
    'loom_translations_en',
    'loom_translations_es'
  ]);

  module.run(function run() {
    console.log('---- app.js.run');
  });

  module.controller('AppCtrl', function AppCtrl($scope, $location, $translate, mapService) {
    console.log('---- ngBoilerplate.controller.');

    $scope.$on('$stateChangeSuccess', function(event, toState) { // Unused params: toParams, fromState, fromParams
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | ngBoilerplate';
      }
    });

    $translate.uses('en');

    var map = mapService.createMap();

    //TODO: move this to featureInfo module
    map.on('click', function(evt) {
      console.log('map.onclick. event ', evt);
      //alert('before getFeatureInfo');

      var layers = [];

      map.getLayers().forEach(function(layer) {
        if (!(layer.source_ instanceof ol.source.OSM)) {
          layers.push(layer);
        }
      });

      map.getFeatureInfo({
        pixel: evt.getPixel(),
        layers: layers,
        success: function(featureInfoByLayer) {
          console.log('map.getFeatureInfo.success', featureInfoByLayer);
          // document.getElementById('info').innerHTML = featureInfoByLayer.join('');

          console.log('---- featureInfoByLayer: ', featureInfoByLayer);
        },
        error: function() {
          alert('map.getFeatureInfo.error');
          console.log('map.getFeatureInfo.error');
        }
      });
    });

  });

  module.config(function($translateProvider) {
    $translateProvider.uses('en');
  });
}());

