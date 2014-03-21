(function() {
  var module = angular.module('loom_map_service', ['ngCookies']);

  var service_ = null;
  var serverService_ = null;
  var geogitService_ = null;
  var httpService_ = null;
  var cookieStoreService_ = null;
  var cookiesService_ = null;
  var configService_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var dragZoomActive = false;
  var rootScope_ = null;

  var select = null;
  var draw = null;
  var modify = null;

  var createVectorEditLayer = function() {
    return new ol.layer.Vector({
      metadata: {
        vectorEditLayer: true
      },
      source: new ol.source.Vector({
        parser: null
      }),
      style: function(feature, resolution) {
        return [new ol.style.Style({
          fill: new ol.style.Fill({
            color: [0, 0, 255, 0.25]
          }),
          stroke: new ol.style.Stroke({
            color: [0, 0, 255, 1],
            width: 4
          }),
          image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
              color: [0, 0, 255, 0.25]
            }),
            stroke: new ol.style.Stroke({
              color: [0, 0, 255, 1],
              width: 1.5
            })
          }),
          zIndex: 1
        })];
      }
    });
  };

  var styleFunc = (function() {
    var styles = {};
    styles['Polygon'] = [
      new ol.style.Style({
        fill: new ol.style.Fill({
          color: [255, 255, 255, 0.5]
        })
      }),
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: [255, 255, 255, 1],
          width: 6
        })
      }),
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: [0, 153, 255, 1],
          width: 4
        })
      })
    ];
    styles['MultiPolygon'] = styles['Polygon'];

    styles['LineString'] = [
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: [255, 255, 255, 1],
          width: 6
        })
      }),
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: [0, 153, 255, 1],
          width: 4
        })
      })
    ];
    styles['MultiLineString'] = styles['LineString'];

    styles['Point'] = [
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 12,
          fill: new ol.style.Fill({
            color: [0, 153, 255, 0.75]
          }),
          stroke: new ol.style.Stroke({
            color: [255, 255, 255, 1],
            width: 1.5
          })
        }),
        zIndex: 100000
      })
    ];
    styles['MultiPoint'] = styles['Point'];

    styles['GeometryCollection'] = styles['Polygon'].concat(styles['Point']);

    return function(feature, resolution) {
      return styles[feature.getGeometry().getType()];
    };
  })();


  module.provider('mapService', function() {
    //$httpProvider, $interpolateProvider
    this.$get = function($translate, serverService, geogitService, $http,
                         $cookieStore, $cookies, configService, dialogService, $rootScope) {
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
      rootScope_ = $rootScope;

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

      // now taht we have a map, lets try to add layers and servers
      service_.loadLayers();

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

    this.dumpTileCache = function(layerToDump) {
      var layers = this.getLayers(); //Note: does not get hidden or imagery layers
      forEachArrayish(layers, function(layer) {
        if (goog.isDefAndNotNull(layer.getSource)) {
          var metadata = layer.get('metadata');
          if (goog.isDefAndNotNull(metadata)) {
            if (goog.isDefAndNotNull(layerToDump) && layerToDump !== metadata.uniqueID) {
              return;
            }
            var tileSource = layer.getSource();
            if (goog.isDefAndNotNull(tileSource)) {
              if (goog.isDefAndNotNull(tileSource.updateParams)) {
                tileSource.updateParams({_dc: new Date().getTime()});
              }
            }
          }
        }
      });
    };

    this.zoomToExtent = function(extent, animate, map, scale) {
      console.log('---- MapService.zoomToExtent. extent: ', extent);

      if (!goog.isDefAndNotNull(animate)) {
        animate = true;
      }
      if (!goog.isDefAndNotNull(map)) {
        map = this.map;
      }
      if (!goog.isDefAndNotNull(scale) || scale < 0) {
        scale = 0;
      }

      var view = map.getView().getView2D();

      if (!goog.isDefAndNotNull(extent)) {
        extent = view.getProjection().getExtent();
      } else {
        if (scale > 0) {
          var width = extent[2] - extent[0];
          var height = extent[3] - extent[1];
          extent[0] -= width * scale;
          extent[1] -= height * scale;
          extent[2] += width * scale;
          extent[3] += height * scale;
          for (var index = 0; index < extent.length; index++) {
            if (isNaN(parseFloat(extent[index])) || !isFinite(extent[index])) {
              extent = view.getProjection().getExtent();
              break;
            }
          }
        }
      }

      if (animate) {
        var zoom = ol.animation.zoom({resolution: map.getView().getResolution()});
        var pan = ol.animation.pan({source: map.getView().getCenter()});
        map.beforeRender(pan, zoom);
      }

      view.fitExtent(extent, map.getSize());
    };

    this.zoomToLayerFeatures = function(layer) {
      if (!goog.isDefAndNotNull(layer)) {
        return;
      }

      if (!service_.layerIsImagery(layer)) {
        var layerTypeName = layer.get('metadata').name;
        var url = layer.get('metadata').url + '/wps?version=' + settings.WPSVersion;

        var wpsPostData = '' +
            '<?xml version="1.0" encoding="UTF-8"?><wps:Execute version="' + settings.WPSVersion + '" service="WPS" ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                'xmlns="http://www.opengis.net/wps/1.0.0" ' +
                'xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" ' +
                'xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" ' +
                'xmlns:ogc="http://www.opengis.net/ogc" ' +
                'xmlns:wcs="http://www.opengis.net/wcs/1.1.1" ' +
                'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                'xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ' +
                'http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">' +
            '<ows:Identifier>gs:Bounds</ows:Identifier>' +
            '<wps:DataInputs>' +
            '<wps:Input>' +
            '<ows:Identifier>features</ows:Identifier>' +
            '<wps:Reference mimeType="text/xml" xlink:href="http://geoserver/wfs" method="POST">' +
            '<wps:Body>' +
            '<wfs:GetFeature service="WFS" version="' + settings.WFSVersion + '" outputFormat="GML2" ' +
                'xmlns:geonode="http://www.geonode.org/">' +
            '<wfs:Query typeName="' + layerTypeName + '"/>' +
            '</wfs:GetFeature>' +
            '</wps:Body>' +
            '</wps:Reference>' +
            '</wps:Input>' +
            '</wps:DataInputs>' +
            '<wps:ResponseForm>' +
            '<wps:RawDataOutput>' +
            '<ows:Identifier>bounds</ows:Identifier>' +
            '</wps:RawDataOutput>' +
            '</wps:ResponseForm>' +
            '</wps:Execute>';

        httpService_.post(url, wpsPostData).success(function(data, status, headers, config) {
          //console.log('----[ mapService.zoomToLayerExtent.success', data, status, headers, config);
          var x2js = new X2JS();
          var json = x2js.xml_str2json(data);
          var lower = json.BoundingBox.LowerCorner.toString().split(' ');
          var upper = json.BoundingBox.UpperCorner.toString().split(' ');
          var bounds = [JSON.parse(lower[0], 10),
                        JSON.parse(lower[1], 10),
                        JSON.parse(upper[0], 10),
                        JSON.parse(upper[1], 10)];
          //console.log('------- [[ bounds: ', bounds);
          var transform = ol.proj.getTransformFromProjections(ol.proj.get(layer.get('metadata').projection),
              ol.proj.get('EPSG:900913'));
          var extent900913 = ol.extent.transform(bounds, transform);
          service_.zoomToExtent(extent900913, null, null, 0.1);
        }).error(function(data, status, headers, config) {
          console.log('----[ Warning: wps gs:bounds failed, zooming to layer bounds ', data, status, headers, config);
          service_.zoomToLayerExtent(layer);
        });

      } else {
        // dealing with an non vector layer
        service_.zoomToLayerExtent(layer);
      }
    };

    this.zoomToLayerExtent = function(layer) {
      var metadata = layer.get('metadata');

      var extent900913 = layer.getSource().getExtent();
      if (!goog.isDefAndNotNull(extent900913) && goog.isDefAndNotNull(metadata) &&
          goog.isDefAndNotNull(metadata.bbox.crs)) {
        extent900913 = metadata.bbox.extent;
        var transform = ol.proj.getTransformFromProjections(ol.proj.get(metadata.bbox.crs),
            service_.map.getView().getView2D().getProjection());
        extent900913 = ol.extent.transform(extent900913, transform);
      }
      if (goog.isDefAndNotNull(extent900913)) {
        for (var index = 0; index < extent900913.length; index++) {
          if (isNaN(parseFloat(extent900913[index])) || !isFinite(extent900913[index])) {
            extent900913 = null;
            break;
          }
        }
      }

      service_.zoomToExtent(extent900913);
    };

    this.getLayers = function(includeHidden, includeImagery) {
      var layers = [];

      this.map.getLayers().forEach(function(layer) {

        // if not an internal layer and not difference layer
        if (goog.isDefAndNotNull(layer.get('metadata')) && // skip the internal layer that ol3 adds for vector editing
            !(layer.get('metadata').vectorEditLayer) &&
            !(layer.get('metadata').internalLayer)) {

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
      return !goog.isDefAndNotNull(layer.get('metadata').editable) || !layer.get('metadata').editable;
    };

    this.addLayer = function(minimalConfig, doNotAddToMap) {
      var server = serverService_.getServerById(minimalConfig.source);
      var fullConfig = serverService_.getLayerConfig(server.id, minimalConfig.name);

      console.log('-- MapService.addLayer. minimalConfig: ', minimalConfig, ', fullConfig: ', fullConfig, ', server: ',
          server);

      var layer = null;
      var nameSplit = null;
      var url = null;

      if (server.ptype === 'gxp_osmsource') {
        layer = new ol.layer.Tile({
          metadata: {
            serverId: server.id,
            name: minimalConfig.name,
            title: fullConfig.Title
          },
          source: new ol.source.OSM()
        });
      } else if (server.ptype === 'gxp_bingsource') {

        var sourceParams = {
          key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
          imagerySet: 'Aerial'
        };

        if (goog.isDefAndNotNull(fullConfig.sourceParams)) {
          goog.object.extend(sourceParams, fullConfig.sourceParams);
        }

        // console.log(sourceParams, config.sourceParams, {});

        layer = new ol.layer.Tile({
          metadata: {
            serverId: server.id,
            name: minimalConfig.name,
            title: fullConfig.Title
          },
          source: new ol.source.BingMaps(sourceParams)
        });
      } else if (server.ptype === 'gxp_googlesource') {
        dialogService_.error(translate_('add_layers'), translate_('layer_type_not_supported',
            {type: 'gxp_googlesource'}));
      } else if (server.ptype === 'gxp_mapquestsource') {
        var source = new ol.source.MapQuest(minimalConfig.sourceParams);

        if (goog.isDefAndNotNull(source)) {
          layer = new ol.layer.Tile({
            metadata: {
              serverId: server.id,
              name: minimalConfig.name,
              title: fullConfig.Title
            },
            source: source
          });
        } else {
          console.log('====[ Error: could not create base layer.');
        }

      } else if (server.ptype === 'gxp_wmscsource') {
        nameSplit = fullConfig.Name.split(':');

        if (goog.isDefAndNotNull(server.url)) {
          var urlIndex = server.url.lastIndexOf('/');
          if (urlIndex !== -1) {
            url = server.url.slice(0, urlIndex);
          }
        }

        layer = new ol.layer.Tile({
          metadata: {
            serverId: server.id,
            name: minimalConfig.name,
            url: goog.isDefAndNotNull(url) ? url : undefined,
            title: fullConfig.Title,
            abstract: fullConfig.Abstract,
            keywords: fullConfig.KeywordList,
            workspace: nameSplit.length > 1 ? nameSplit[0] : '',
            editable: false,
            bbox: fullConfig.BoundingBox[0]
          },
          source: new ol.source.TileWMS({
            url: server.url,
            params: {
              'LAYERS': minimalConfig.name
            }
          })
        });

        geogitService_.isGeoGit(layer);

      } else if (server.ptype === 'gxp_tmssource') {
        nameSplit = fullConfig.Name.split(':');
        url = server.url;

        if (goog.isDefAndNotNull(server.url)) {
          if (server.url.lastIndexOf('/') !== server.url.length - 1) {
            url += '/';
          }
        }

        layer = new ol.layer.Tile({
          metadata: {
            serverId: server.id,
            name: minimalConfig.name,
            url: goog.isDefAndNotNull(url) ? url : undefined,
            title: fullConfig.Title,
            abstract: fullConfig.Abstract,
            keywords: fullConfig.KeywordList,
            workspace: nameSplit.length > 1 ? nameSplit[0] : '',
            editable: false,
            bbox: fullConfig.BoundingBox[0]
          },
          source: new ol.source.XYZ({
            tileUrlFunction: function(coordinate) {
              if (coordinate == null) {
                return '';
              }
              var z = coordinate.z;
              var x = coordinate.x;
              var y = (1 << z) - coordinate.y - 1;
              return '/proxy/?url=' + url + minimalConfig.name + '/' + z + '/' + x + '/' + y + '.png';
            }
          })
        });

      } else if (server.ptype === 'gxp_olsource') {
        dialogService_.error(translate_('add_layers'), translate_('layer_type_not_supported', {type: 'gxp_olsource'}));
      }


      if (goog.isDefAndNotNull(layer)) {
        // convert source id to a number. even though geonode gives it as a string, it wants it back as number
        minimalConfig.source = parseInt(minimalConfig.source, 10);

        var meta = layer.get('metadata');
        meta.config = minimalConfig;
        // hash the server id + the layer name and hash it to create a unqiue, html-safe id.
        meta.uniqueID = sha1('server' + meta.serverId + '_' + meta.name);

        if (!goog.isDefAndNotNull(doNotAddToMap)) {
          rootScope_.$broadcast('layer-added');
          this.map.addLayer(layer);
        }
      } else {
        console.log('====[Error: could not load layer: ', minimalConfig);
      }

      console.log('-- MapService.addLayer, added: ', layer);
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

    this.save = function(copy) {

      if (goog.isDefAndNotNull(copy) && copy) {
        // remove current map id so that it is saved as a new map.
        service_.id = null;
      }

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

      goog.array.forEach(serverService_.getServers(), function(server, key, obj) {
        console.log('saving server: ', server);
        cfg.sources.push(server.config);
      });

      // -- save layers
      goog.array.forEach(service_.getLayers(true, true), function(layer, key, obj) {
        console.log('saving layer: ', layer);
        console.log('metadata: ', layer.get('metadata'));
        console.log('config: ', layer.get('metadata').config);
        cfg.map.layers.push(layer.get('metadata').config);
      });

      console.log('--- save.cfg: ', cfg);

      httpService_({
        url: service_.getSaveURL(),
        method: service_.getSaveHTTPMethod(),
        data: JSON.stringify(cfg),
        headers: {
          'X-CSRFToken': configService_.csrfToken
        }
      }).success(function(data, status, headers, config) {
        service_.updateMap(data);
        console.log('----[ map.save success. ', data, status, headers, config);
      }).error(function(data, status, headers, config) {
        dialogService_.error(translate_('save_failed'), translate_('map_save_failed', {value: status}));
      });
    };

    this.loadLayers = function() {
      //TODO: use configService_.configuration instead of saving ref in this service
      console.log('=======[[ using service_.configuration: ', service_.configuration);

      if (goog.isDefAndNotNull(service_.configuration) &&
          goog.isDefAndNotNull(service_.configuration.sources) &&
          goog.isDefAndNotNull(service_.configuration.map) &&
          goog.isDefAndNotNull(service_.configuration.map.layers)) {

        var ordered = new Array(service_.configuration.sources.length);
        console.log('service_.configuration.sources: ', service_.configuration.sources);
        goog.object.forEach(service_.configuration.sources, function(serverInfo, key, obj) {
          ordered[key] = serverInfo;
        });

        // if a server has the same url as another server, do not add the server and update layers pointing to the
        // duplicate server to point to the existing server. geonode passes in duplicate servers when creating
        // a map from a layer. Note that this array can end up with holes.
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
            // basemaps will have servers without a url
            orderedUnique[key] = serverInfo;
          }
        });

        //Note serverIndex refers to the index in the config object not the index in serverService
        var addLayersForServer = function(configServerIndex, server) {

          // get all layers that refer to this serverIndex
          var configs = [];
          goog.array.forEach(service_.configuration.map.layers, function(layerInfo, index, obj) {
            // Note: config.source will be string while serverIndex might be number
            if (layerInfo.source == configServerIndex) {
              configs.push(layerInfo);
            }
          });

          goog.array.forEach(configs, function(layerInfo) {
            if (goog.isDefAndNotNull(layerInfo.name)) {
              // when the server is added to maploom, it will have an entirely different index/id so once it is
              // resolved, we will update the layer info to reflect it. Do this on a clone since other functions
              // are still using the config object
              var layerInfoClone = goog.object.clone(layerInfo);
              layerInfoClone.source = server.id;
              service_.addLayer(layerInfoClone);
            } else {
              console.log('====[ Warning: could not add layer because it does not have a name: ', layerInfo);
            }
          });
        };

        // TODO: set layers panel to loading until all layers pass or fail

        goog.array.forEach(orderedUnique, function(serverInfo, serverIndex, obj) {
          // if there was a duplicate server, an index in the ordered array will be undefined
          if (goog.isDefAndNotNull(serverInfo)) {
            serverService_.addServer(serverInfo)
                .then(function(serverNew) {
                  addLayersForServer(serverIndex, serverNew);
                }, function(reject) {
                  console.log('====[ Error: Add server failed. ', reject);
                });
          }
        });

        //TODO: once all servers were added, async, then add any missing ones.
        // add servers corresponding to basemaps
        serverService_.configDefaultServers();
      } else {
        console.log('invalid config object, cannot load map: ', service_.configuration);
        alert('invalid config object, cannot load map');
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
        settings.coordinateDisplay = coordinateDisplays.DD;
        var precision = settings.DDPrecision;
        this.map.getControls().getArray()[index].setCoordinateFormat(ol.coordinate.createStringXY(precision));
      } else if (settings.coordinateDisplay === coordinateDisplays.DD) {
        settings.coordinateDisplay = coordinateDisplays.DMS;
        this.map.getControls().getArray()[index].setCoordinateFormat(ol.coordinate.toStringHDMS);
      }
    };

    this.createMap = function() {
      var coordDisplay;

      if (settings.coordinateDisplay === coordinateDisplays.DMS) {
        coordDisplay = ol.coordinate.toStringHDMS;
      } else if (settings.coordinateDisplay === coordinateDisplays.DD) {
        coordDisplay = ol.coordinate.createStringXY(settings.DDPrecision);
      }

      console.log('====[[ loading config: ', service_.configuration);

      var map = new ol.Map({
        //layers: do not add any layers to the map as they will be added once server is created and getcapabilities
        //        equivalent functions respond if relevant.
        controls: ol.control.defaults().extend([
          //new ol.control.FullScreen(),
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
        ol3Logo: false,
        target: 'map',
        view: new ol.View2D({
          center: this.configuration.map.center,
          zoom: this.configuration.map.zoom,
          maxZoom: 20
        })
      });

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

    this.addToEditLayer = function(geom, crs) {
      this.clearEditLayer();
      var newFeature = new ol.Feature();
      var newGeom = transformGeometry(geom, crs, this.map.getView().getView2D().getProjection());
      newFeature.setGeometry(newGeom);
      this.editLayer.getSource().addFeature(newFeature);
      this.map.addLayer(this.editLayer);
    };

    this.clearEditLayer = function() {
      this.editLayer.getSource().clear();
      this.map.removeLayer(this.editLayer);
    };

    this.selectFeature = function(feature) {
      if (goog.isDefAndNotNull(feature)) {
        select.getFeatures().push(feature);
      } else if (this.editLayer.getSource().getFeatures().length > 0) {
        select.getFeatures().push(this.editLayer.getSource().getFeatures()[0]);
      }
    };

    this.addSelect = function() {
      select = new ol.interaction.Select({style: styleFunc});
      this.map.addInteraction(select);
    };

    this.addDraw = function(geometryType) {
      draw = new ol.interaction.Draw({source: this.editLayer.getSource(), type: geometryType});
      this.map.addInteraction(draw);
    };

    this.addModify = function() {
      modify = new ol.interaction.Modify({features: select.getFeatures(), style: styleFunc});
      this.map.addInteraction(modify);
    };

    this.removeSelect = function() {
      this.map.removeInteraction(select);
    };

    this.removeDraw = function() {
      this.map.removeInteraction(draw);
    };

    this.removeModify = function() {
      this.map.removeInteraction(modify);
    };

    this.hasSelectedFeature = function() {
      return select.getFeatures().getLength() > 0;
    };

    this.getSelectedFeatures = function() {
      return select.getFeatures();
    };
  });

}());
