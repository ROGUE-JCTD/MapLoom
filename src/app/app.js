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

  module.controller('AppCtrl', function AppCtrl($scope, $location, $translate) {
    console.log('---- ngBoilerplate.controller.');

    $scope.$on('$stateChangeSuccess', function(event, toState) { // Unused params: toParams, fromState, fromParams
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | ngBoilerplate';
      }
    });

    $translate.uses('en');

    var map = createMap();


    // The main controller creates the OpenLayers map object. The map object
    // is central, as most directives/components need a reference to it.
    $scope.map = map;


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
          document.getElementById('info').innerHTML = featureInfoByLayer.join('');

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


  function createMap() {
    console.log('---- app.js createMap');

    var map = new ol.Map({
      layers: [

        new ol.layer.Tile({
          source: new ol.source.OSM()
        }),

        new ol.layer.Tile({
          source: new ol.source.TileWMS({
            url: 'http://geoserver.rogue.lmnsolutions.com/geoserver/wms',
            params: {'LAYERS': 'geonode:canchas_de_futbol'}
          })
        }),

        new ol.layer.Tile({
          source: new ol.source.TileWMS({
            url: 'http://geoserver.rogue.lmnsolutions.com/geoserver/wms',
            params: {'LAYERS': 'geonode:centros_medicos'}
          })
        })
      ],
      controls: ol.control.defaults().extend([
        new ol.control.FullScreen(),
        new ol.control.ZoomSlider(),
        new ol.control.MousePosition({
          projection: 'EPSG:4326',
          target: map,
          coordinateFormat: ol.coordinate.createStringXY(4)
        })
      ]),
      interactions: ol.interaction.defaults().extend([
        new ol.interaction.DragRotate()
      ]),
      renderer: ol.RendererHint.CANVAS,
      target: 'map',
      view: new ol.View2D({
        center: ol.proj.transform([-87.2011, 14.1], 'EPSG:4326', 'EPSG:3857'),
        zoom: 14
      })
    });


    // Defines default vector style
    ol.style.setDefault(new ol.style.Style({
      rules: [
        new ol.style.Rule({
          filter: 'renderintent("selected")',
          symbolizers: [
            new ol.style.Fill({
              color: '#ff0000',
              opacity: 1
            }),
            new ol.style.Stroke({
              color: '#000000',
              opacity: 1,
              width: 2
            }),
            new ol.style.Shape({
              size: 10,
              fill: new ol.style.Fill({
                color: '#ff0000',
                opacity: 1
              }),
              stroke: new ol.style.Stroke({
                color: '#000000',
                opacity: 1,
                width: 2
              })
            })
          ]
        })
      ],
      symbolizers: [
        new ol.style.Fill({
          color: '#ffff00',
          opacity: 0.8
        }),
        new ol.style.Stroke({
          color: '#ff8000',
          opacity: 0.8,
          width: 3
        }),
        new ol.style.Shape({
          size: 10,
          fill: new ol.style.Fill({
            color: '#ffff00',
            opacity: 0.8
          }),
          stroke: new ol.style.Stroke({
            color: '#ff8000',
            opacity: 0.8,
            width: 3
          })
        })
      ]
    }));

    return map;
  }
}());

