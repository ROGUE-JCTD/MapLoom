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
        vectorEditLayer: true
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

      // must always have a local geoserver. if not, something has gone wrong
      var localServer = serverService_.getServerLocalGeoserver();
      serverService_.populateLayersConfig(serverService_.getServerIndex(localServer.id));
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

    this.dumpTileCache = function(layerToDump) {
      var layers = this.getLayers(); //Note: does not get hidden or imagery layers
      forEachArrayish(layers, function(layer) {
        if (goog.isDefAndNotNull(layer.getTileSource)) {
          var metadata = layer.get('metadata');
          if (goog.isDefAndNotNull(metadata)) {
            if (goog.isDefAndNotNull(layerToDump) && layerToDump !== metadata.name) {
              return;
            }
            var tileSource = layer.getTileSource();
            if (goog.isDefAndNotNull(tileSource)) {
              if (goog.isDefAndNotNull(tileSource.updateParams)) {
                tileSource.updateParams({_dc: new Date().getTime()});
              }
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

    this.getLayers = function(includeHidden, includeImagery) {
      var layers = [];

      this.map.getLayers().forEach(function(layer) {

        // if not an internal layer and not difference layer
        if (goog.isDefAndNotNull(layer.get('metadata')) && // skip the internal layer that ol3 adds for vector editing
            !(layer.get('metadata').vectorEditLayer) &&
            !(layer.get('metadata').differencesLayer)) {

          // if it is imagery
          if (service_.layerIsImagery(layer)) {
            // if we want imagery
            if (goog.isDefAndNotNull(includeImagery) && includeImagery) {
              if (layer.get('visible')) {
                layers.push(layer);
              } else {
                // if we want hidden
                if (goog.isDefAndNotNull(includeHidden) && includeHidden) {
                  layers.push(layer);
                }
              }
            }
          } else {
            if (layer.get('visible')) {
              layers.push(layer);
            } else {
              // if we want hidden
              if (goog.isDefAndNotNull(includeHidden) && includeHidden) {
                layers.push(layer);
              }
            }
          }
        }
      });

      return layers;
    };

    this.layerIsImagery = function(layer) {
      if ((layer.source_ instanceof ol.source.OSM) ||
          (layer.source_ instanceof ol.source.BingMaps) ||
          (layer.source_ instanceof ol.source.MapQuestOSM)) {
        return true;
      }
    };

    this.addLayer = function(config, doNotAddToMap) {
      //console.log('server for layer: ', server);
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
      } else if (server.ptype === 'gxp_bingsource') {

        var sourceParams = {
          key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
          imagerySet: 'Aerial'
        };

        if (goog.isDefAndNotNull(config.sourceParams)) {
          goog.object.extend(sourceParams, config.sourceParams);
        }

        console.log(sourceParams, config.sourceParams, {});

        layer = new ol.layer.Tile({
          metadata: {
            serverId: server.id,
            label: config.title
          },
          source: new ol.source.BingMaps(sourceParams)
        });
      } else if (server.ptype === 'gxp_googlesource') {
        console.log('====[ Error: google source not implemeted');
      } else if (server.ptype === 'gxp_mapquestsource') {

        //TODO: type changed to just mapquest
        var source = new ol.source.MapQuestOSM(config.sourceParams);

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
            params: {
              'LAYERS': config.name,
              'BUFFER': 15
            },
            getFeatureInfoOptions: {
              'method': ol.source.WMSGetFeatureInfoMethod.XHR_GET,
              'params': {
                'INFO_FORMAT': 'application/json',
                'FEATURE_COUNT': 50,
                'BUFFER': 15
              }
            }
          })
        });
        console.log('new layer: ', layer);
        geogitService_.isGeoGit(layer);
        //console.log(geogitService_);
      }


      if (goog.isDefAndNotNull(layer)) {
        // convert source id to a number. even though geonode gives it as a string, it wants it back as number
        config.source = parseInt(config.source, 10);

        var meta = layer.get('metadata');
        meta.config = config;
        //goog.object.extend(meta, config, {});
        //layer.set('metadata', meta);

        if (!goog.isDefAndNotNull(doNotAddToMap)) {
          this.map.addLayer(layer);
        }
      } else {
        console.log('====[Error: could not load layer: ', config);
      }
      console.log('---addLayer layer', layer);
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
        sources: []
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

      goog.array.forEach(serverService_.getServers(), function(server, key, obj) {
        console.log('saving server: ', server);
        cfg.sources.push(server.config);
      });

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
        dialogService_.error(translate_('save_failed'), translate_('map_save_failed', {value: status}));
      });
    };

    this.loadLayers = function() {
      console.log('=======[[ using this.configuration: ', service_.configuration);

      var layers = [];

      if (goog.isDefAndNotNull(service_.configuration) &&
          goog.isDefAndNotNull(service_.configuration.sources) &&
          goog.isDefAndNotNull(service_.configuration.map) &&
          goog.isDefAndNotNull(service_.configuration.map.layers)) {

        var ordered = new Array(service_.configuration.sources.length);
        console.log('this.configuration.sources: ', service_.configuration.sources);
        goog.object.forEach(service_.configuration.sources, function(serverInfo, key, obj) {
          ordered[key] = serverInfo;
        });

        // if a server has the same url as another server, do not add the server and update layers pointing to the
        // duplicate server to point to the existing server. geonode passes in duplicate servers when creating
        // a map from a layer
        var orderedUnique = new Array(ordered.length);
        goog.array.forEach(ordered, function(serverInfo, key, obj) {

          if (goog.isDefAndNotNull(serverInfo.url)) {
            var foundServerIndex = null;

            for (var index = 0; index < orderedUnique.length; index++) {
              var server = orderedUnique[index];
              if (goog.isDefAndNotNull(server)) {
                if (goog.isDefAndNotNull(server.url)) {
                  if (server.url === serverInfo.url) {
                    foundServerIndex = index;
                    break;
                  }
                }
              }
            }

            if (goog.isDefAndNotNull(foundServerIndex)) {
              var foundServer = orderedUnique[foundServerIndex];
              console.log('====[ Warning: skipping source/server as it has the same URL as existingServer.' +
                  ' serverInfo: ', serverInfo, ', foundServer: ', foundServer);

              // update any layer's source that is using this duplicate server to the existing server
              for (var index2 = 0; index2 < service_.configuration.map.layers.length; index2++) {
                var layer = service_.configuration.map.layers[index2];
                if (layer.source === key.toString()) {
                  console.log('====[ Note: updating layer source from old:', layer.source,
                      ', to new: ', foundServerIndex, ', layer: ', layer);
                  layer.source = foundServerIndex.toString();
                }
              }
            } else {
              orderedUnique[key] = serverInfo;
            }
          } else {
            orderedUnique[key] = serverInfo;
          }
        });

        goog.array.forEach(orderedUnique, function(serverInfo, index, obj) {
          // if there was a duplicate server, an index in the ordered array will be undefined
          if (goog.isDefAndNotNull(serverInfo)) {
            serverService_.addServer(serverInfo);
          }
        });

        serverService_.configDefaultServers();

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

    // Note: when a layer is added to a map through the add layers dialog, the title of the layer returned
    //       from getcapabilities is used. As a result, when a map is saved, it has a title and when it is
    //       opened again the title is passed in. This is not the case, however, when a map is created from
    //       a layer in geonode. The layer has a name but not a title. The following segment tries to update
    //       the title of the layer if a layer added to the ap doesn't have one.
    this.updateLayerTitles = function(serverIndex) {

      var server = serverService_.getServerByIndex(serverIndex);

      var layers = service_.getLayers(true, true); // get hidden and imagery layers as well

      console.log('server: ', server, ', layers: ', layers);

      for (var index = 0; index < server.layersConfig.length; index++) {
        var layerConfig = server.layersConfig[index];
        console.log('A1');
        for (var index2 = 0; index2 < layers.length; index2++) {
          console.log('A2');
          var layer = layers[index2];
          var layerMetadate = layer.get('metadata');
          if (goog.isDefAndNotNull(layerMetadate) &&
              goog.isDefAndNotNull(layerMetadate.config)) {
            console.log('A3');

            var conf = layerMetadate.config;
            if (conf.source === serverIndex) {
              console.log('A4');
              if (conf.name === layerConfig.name) {
                conf.title = layerConfig.title;
                layer.label = layerConfig.title;
                console.log('##### updated title: ', layerConfig.title, layer);
              }
            }
          }
        }
      }
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

    this.selectFromGeom = function(geom, crs) {
      this.clearSelectedFeature();
      var newFeature = new ol.Feature();
      var newGeom = transformGeometry(geom, crs, this.map.getView().getView2D().getProjection());
      newFeature.setGeometry(newGeom);
      this.editLayer.addFeatures([newFeature]);
      select = new ol.interaction.Select();
      select.select(this.map, [[newFeature]], [this.editLayer], false);
      this.map.addInteraction(select);
      this.map.addLayer(this.editLayer);
    };

    this.selectFeature = function(feature) {
      select = new ol.interaction.Select();
      select.select(this.map, [[feature]], [this.editLayer], false);
      this.map.addInteraction(select);
    };

    this.clearSelectedFeature = function() {
      this.editLayer.clear();
      this.map.removeLayer(this.editLayer);
      this.map.removeInteraction(select);
    };
  });

}());
