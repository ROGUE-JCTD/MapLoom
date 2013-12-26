(function() {
  var module = angular.module('loom_map_service', ['ngCookies']);

  var service_ = null;
  var serverService_ = null;
  var geogitService_ = null;
  var httpService_ = null;
  //var httpProviderService_ = null;
  var cookieStoreService_ = null;
  var cookiesService_ = null;
  var configService_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var dragZoomActive = false;

  var select = null;

  var createVectorEditLayer = function() {
    return new ol.layer.Vector({
      metadata: {
        hidden: true
      },
      source: new ol.source.Vector({
        parser: null
      }),
      style: new ol.style.Style({
        rules: [
          new ol.style.Rule({
            filter: 'renderIntent("selected")',
            symbolizers: [
              new ol.style.Shape({
                fill: new ol.style.Fill({
                  color: '#0099ff',
                  opacity: 1
                }),
                stroke: new ol.style.Stroke({
                  color: 'white',
                  opacity: 0.75
                }),
                size: 14,
                zIndex: 1
              }),
              new ol.style.Fill({
                color: '#0099ff',
                opacity: 0.5
              }),
              new ol.style.Stroke({
                color: '#0099ff',
                width: 3
              })
            ]
          }),
          new ol.style.Rule({
            filter: 'renderIntent("temporary")',
            symbolizers: [
              new ol.style.Shape({
                fill: new ol.style.Fill({
                  color: '#0099ff',
                  opacity: 1
                }),
                stroke: new ol.style.Stroke({
                  color: 'white',
                  opacity: 0.75
                }),
                size: 14,
                zIndex: 1
              })
            ]
          }),
          new ol.style.Rule({
            filter: 'renderIntent("future")',
            symbolizers: [
              new ol.style.Shape({
                fill: new ol.style.Fill({
                  color: '#00ff33',
                  opacity: 1
                }),
                stroke: new ol.style.Stroke({
                  color: 'white',
                  opacity: 0.75
                }),
                size: 14,
                zIndex: 1
              })
            ]
          })
        ],
        symbolizers: [
          new ol.style.Shape({
            fill: new ol.style.Fill({
              color: 'blue',
              opacity: 0.4
            }),
            stroke: new ol.style.Stroke({
              color: 'blue',
              width: 4
            }),
            size: 20
          }),
          new ol.style.Fill({
            color: 'blue',
            opacity: 0.4
          }),
          new ol.style.Stroke({
            color: 'blue',
            width: 4
          })
        ]
      })
    });
  };

  module.provider('mapService', function() {
    //$httpProvider, $interpolateProvider
    this.$get = function($translate, serverService, geogitService, $http,
                         $cookieStore, $cookies, configService, dialogService) {
      service_ = this;
      httpService_ = $http;
      //httpProviderService_ = $httpProvider;
      cookieStoreService_ = $cookieStore;
      cookiesService_ = $cookies;
      configService_ = configService;
      console.log(cookiesService_, cookieStoreService_);
      serverService_ = serverService;
      geogitService_ = geogitService;
      dialogService_ = dialogService;
      translate_ = $translate;

      // create map on init so that other components can use map on their init
      this.configuration = configService_.configuration;
      this.title = this.configuration.about.title;
      this.abstract = this.configuration.about.abstract;
      this.id = this.configuration.id;
      this.save_method = 'POST';

      if (goog.isDefAndNotNull(this.id) && this.id) {
        this.save_url = '/maps/' + this.id + '/data';
        this.save_method = 'PUT';
      } else {
        this.save_url = '/maps/new/data';
      }

      this.map = this.createMap();
      this.editLayer = createVectorEditLayer();
      return this;
    };



    this.activateDragZoom = function() {
      //first we need to get access to the map's drag zoom interaction, if there is one
      var index;
      for (index = 0; index < this.map.getInteractions().getLength(); ++index) {
        if (this.map.getInteractions().getArray()[index] instanceof ol.interaction.DragZoom) {
          break;
        }
      }
      if (index == this.map.getInteractions().getLength()) {
        dialogService_.open(translate_('error'), translate_('drag_zoom_not_supported'));
        return;
      }

      //set the condition to always so that drag zoom will activate anytime the map is dragged
      this.map.getInteractions().getArray()[index].condition_ = ol.events.condition.always;
      dragZoomActive = true;
    };

    this.dumpTileCache = function() {
      var layers = this.getFeatureLayers();
      forEachArrayish(layers, function(layer) {
        if (goog.isDefAndNotNull(layer.getTileSource)) {
          var tileSource = layer.getTileSource();
          if (goog.isDefAndNotNull(tileSource)) {
            if (goog.isDefAndNotNull(tileSource.updateParams)) {
              tileSource.updateParams({_dc: new Date().getTime()});
            }
          }
        }
      });
      this.map.render();
    };

    this.zoomToExtent = function(extent, animate, map) {
      if (!goog.isDefAndNotNull(animate)) {
        animate = true;
      }
      if (!goog.isDefAndNotNull(map)) {
        map = this.map;
      }
      var view = map.getView().getView2D();

      if (extent === undefined) {
        extent = view.getProjection().getExtent();
      }

      if (animate) {
        var zoom = ol.animation.zoom({resolution: map.getView().getResolution()});
        var pan = ol.animation.pan({source: map.getView().getCenter()});
        map.beforeRender(pan, zoom);
      }

      view.fitExtent(extent, map.getSize());
    };

    this.getFeatureLayers = function() {
      var layers = [];

      //TODO: do a better job at removing all layers except those that have a feature type.
      this.map.getLayers().forEach(function(layer) {
        if (!(layer.source_ instanceof ol.source.OSM) && goog.isDefAndNotNull(layer.get('metadata')) &&
            !(layer.get('metadata').hidden) && !(layer.get('metadata').differences_layer)) {
          layers.push(layer);
        }
      });

      return layers;
    };

    this.addLayer = function(config, doNotAddToMap) {
      var server = serverService_.getServerByIndex(config.source);
      console.log('server for layer: ', server);
      var layer = null;

      if (server.ptype === 'gxp_osmsource') {
        layer = new ol.layer.Tile({
          metadata: {
            serverId: server.id,
            label: config.title
          },
          source: new ol.source.OSM()
        });
      } else if (server.ptype === 'gxp_omapquestsource') {

        var source = null;

        if (config.name === 'osm') {
          source = new ol.source.MapQuestOSM();
        } else if (config.name === 'naip') {
          source = new ol.source.MapQuestOpenAerial();
        }

        if (goog.isDefAndNotNull(source)) {
          layer = new ol.layer.Tile({
            metadata: {
              serverId: server.id,
              label: config.title
            },
            source: source
          });
        } else {
          console.log('====[ Error: could not create base layer.');
        }

      } else if (server.ptype === 'gxp_olsource' || server.ptype === 'gxp_wmscsource') {
        var url = null;

        if (goog.isDefAndNotNull(server.url)) {
          var urlIndex = server.url.lastIndexOf('/');
          if (urlIndex !== -1) {
            url = server.url.slice(0, urlIndex);
          }
        }

        layer = new ol.layer.Tile({
          metadata: {
            serverId: server.id,
            url: goog.isDefAndNotNull(url) ? url : undefined,
            label: config.title,
            name: config.name,
            editable: true
          },
          source: new ol.source.TileWMS({
            url: server.url,
            params: {'LAYERS': config.name},
            getFeatureInfoOptions: {
              'method': ol.source.WMSGetFeatureInfoMethod.XHR_GET,
              'params': {
                'INFO_FORMAT': 'application/json',
                'FEATURE_COUNT': 50
              }
            }
          })
        });
        console.log('new layer: ', layer);
        geogitService_.isGeoGit(layer);
        //console.log(geogitService_);
      }

      // convert source id to a number. even though geonode gives it as a string, it wants it back as number
      config.source = parseInt(config.source, 10);

      // store the config objected used to create this layer so that when we sa
      layer.get('metadata').config = config;


      if (!goog.isDefAndNotNull(doNotAddToMap) && goog.isDefAndNotNull(layer)) {
        this.map.addLayer(layer);
      }

      return layer;
    };

    this.addBaseLayer = function(title, doNotAddToMap) {
      var layer = null;

      var serverId = serverService_.getServerByName('OpenStreetMap').id;
      console.log('____ serverId for baselayer: ', serverId);

      if (title === 'OpenStreetMap') {
        layer = new ol.layer.Tile({
          metadata: {
            serverId: serverId,
            label: title
          },
          source: new ol.source.OSM()
        });
      } else if (title === 'MapQuestImagery') {
        layer = new ol.layer.Tile({
          metadata: {
            serverId: serverId,
            label: title
          },
          source: new ol.source.MapQuestOpenAerial()
        });
      } else if (title === 'MapQuestOSM') {
        layer = new ol.layer.Tile({
          metadata: {
            serverId: serverId,
            label: title
          },
          source: new ol.source.MapQuestOSM()
        });
      }

      if (!goog.isDefAndNotNull(doNotAddToMap) && goog.isDefAndNotNull(layer)) {
        this.map.addLayer(layer);
      }

      return layer;
    };

    this.getCenter = function() {
      return this.map.getView().getCenter();
    };

    this.getProjection = function() {
      return this.map.getView().getProjection().getCode();
    };

    this.getZoom = function() {
      return this.map.getView().getZoom();
    };

    this.getSaveURL = function() {
      if (goog.isDefAndNotNull(service_.id) && service_.id) {
        return '/maps/' + service_.id + '/data';
      } else {
        return '/maps/new/data';
      }
    };

    this.getSaveHTTPMethod = function() {
      if (goog.isDefAndNotNull(service_.id) && service_.id) {
        return 'PUT';
      } else {
        return 'POST';
      }
    };

    // Update the map after save.
    this.updateMap = function(data) {
      service_.id = data.id;
    };

    this.save = function() {
      var cfg = {
        about: {
          abstract: service_.abstract,
          title: service_.title
        },
        map: {
          id: service_.id || 0,
          center: service_.getCenter(),
          zoom: service_.getZoom(),
          projection: service_.getProjection(),
          layers: []
        },
        sources: serverService_.getServers()
      };

      /*
      // -- save base layer
      //TODO: hardcoded base layer
      cfg.map.layers.push({
        name: 'OpenStreetMap',
        source: serverService_.getServerByName('OpenStreetMap').id.toString(),
        title: 'OpenStreetMap'
      });
      */

      // -- save layers
      goog.array.forEach(service_.map.getLayers().getArray(), function(layer, key, obj) {
        console.log('saving layer: ', layer);
        console.log('metadata: ', layer.get('metadata'));
        console.log('config: ', layer.get('metadata').config);
        cfg.map.layers.push(layer.get('metadata').config);
        /*{
          name: layer.getSource().getParams().LAYERS,
          source: layer.get('metadata').serverId.toString(),
          title: layer.get('label')
        }*/
      });

      console.log('--- save.cfg: ', cfg);
      console.log('--- save.cfg string: ', JSON.stringify(cfg));

      console.log('+++++++[ token: ', cookiesService_.csrftoken);
      httpService_({
        url: service_.getSaveURL(),
        method: service_.getSaveHTTPMethod(),
        data: JSON.stringify(cfg),
        headers: {
          'X-CSRFToken': configService_.csrfToken
        }
      }).success(function(data, status, headers, config) {
        service_.updateMap(data);
        console.log('====[ map.save great success. ', data, status, headers, config);
      }).error(function(data, status, headers, config) {
        console.log('----[ ERROR: map.save failed! ', data, status, headers, config);
        dialogService_.error('Save failed.', 'Map save failed with status: ' + status + '.');
      });
    };

    this.loadLayers = function() {
      console.log('=======[[ using this.configuration: ', this.configuration);

      var layers = [];

      if (goog.isDefAndNotNull(this.configuration) &&
          goog.isDefAndNotNull(this.configuration.sources) &&
          goog.isDefAndNotNull(this.configuration.map) &&
          goog.isDefAndNotNull(this.configuration.map.layers)) {

        //TODO: would it always be ordered already?
        var ordered = new Array(this.configuration.sources.length);
        goog.object.forEach(this.configuration.sources, function(serverInfo, key, obj) {
          ordered[key] = serverInfo;
        });

        goog.array.forEach(ordered, function(serverInfo, index, obj) {
          var server = serverService_.addServer(serverInfo);

          //TODO: test
          if (server.name === 'OpenStreetMap') {
            server.layers = [
              {
                title: 'OpenStreetMap',
                added: true
              },
              {
                title: 'MapQuestImagery',
                added: false
              },
              {
                title: 'MapQuestOSM',
                added: false
              }
            ];
          }
        });

        goog.array.forEach(this.configuration.map.layers, function(layerInfo, index, obj) {
          if (goog.isDefAndNotNull(layerInfo.name)) {
            layers.push(service_.addLayer(layerInfo, true));
          } else {
            console.log('====[ Error: cannot add a layer without a name: ', layerInfo);
          }
        });
      } else {
        console.log('invalid config object, cannot load map: ', this.configuration);
        alert('invalid config object, cannot load map');
      }

      return layers;
    };

    this.switchMousePosCoordFormat = function() {
      var index;
      for (index = 0; index < this.map.getControls().getLength(); ++index) {
        if (this.map.getControls().getArray()[index] instanceof ol.control.MousePosition) {
          break;
        }
      }

      if (settings.coordinateDisplay === coordinateDisplays.DMS) {
        this.map.getControls().getArray()[index].setCoordinateFormat(ol.coordinate.toStringHDMS);
      } else if (settings.coordinateDisplay === coordinateDisplays.DD) {
        var precision = settings.DDPrecision;
        this.map.getControls().getArray()[index].setCoordinateFormat(ol.coordinate.createStringXY(precision));
      }
    };

    this.createMap = function() {
      var coordDisplay;

      if (settings.coordinateDisplay === coordinateDisplays.DMS) {
        coordDisplay = ol.coordinate.toStringHDMS;
      } else if (settings.coordinateDisplay === coordinateDisplays.DD) {
        coordDisplay = ol.coordinate.createStringXY(settings.DDPrecision);
      }

      console.log('====[[ loading config: ', this.configuration);

      var map = new ol.Map({
        layers: this.loadLayers(),
        controls: ol.control.defaults().extend([
          new ol.control.FullScreen(),
          new ol.control.ZoomSlider(),
          new ol.control.MousePosition({
            projection: 'EPSG:4326',
            coordinateFormat: coordDisplay
          }),
          new ol.control.ScaleLine({className: 'metric-scale-line ol-scale-line',
            units: ol.control.ScaleLineUnits.METRIC}),
          new ol.control.ScaleLine({className: 'imperial-scale-line ol-scale-line',
            units: ol.control.ScaleLineUnits.IMPERIAL})
        ]),
        interactions: ol.interaction.defaults().extend([
          new ol.interaction.DragRotate()
        ]),
        renderer: ol.RendererHint.CANVAS,
        target: 'map',
        view: new ol.View2D({
          center: this.configuration.map.center,
          zoom: this.configuration.map.zoom,
          maxZoom: 20
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

      map.on('dragend', function() {
        if (dragZoomActive === false) {
          return;
        }
        var index;
        for (index = 0; index < this.getInteractions().getLength(); ++index) {
          if (this.getInteractions().getArray()[index] instanceof ol.interaction.DragZoom) {
            break;
          }
        }
        if (index == this.getInteractions().getLength()) {
          dialogService_.open(translate_('error'), translate_('drag_zoom_not_supported'));
          return;
        }

        //Reset the condition to its default behavior after each use
        this.getInteractions().getArray()[index].condition_ = ol.events.condition.shiftKeyOnly;
        dragZoomActive = false;
      });

      return map;
    };

    this.selectFeature = function(geom, crs) {
      this.editLayer.clear();
      var newFeature = new ol.Feature();
      var newGeom = transformGeometry(geom, crs, this.map.getView().getView2D().getProjection());
      newFeature.setGeometry(newGeom);
      this.editLayer.addFeatures([newFeature]);
      select = new ol.interaction.Select();
      select.select(this.map, [[newFeature]], [this.editLayer], false);
      this.map.addInteraction(select);
      this.map.addLayer(this.editLayer);
    };

    this.clearSelectedFeature = function() {
      this.editLayer.clear();
      this.map.removeLayer(this.editLayer);
      this.map.removeInteraction(select);
    };
  });

}());
