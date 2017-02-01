(function() {
  var module = angular.module('loom_map_service', ['ngCookies']);

  var service_ = null;
  var serverService_ = null;
  var geogigService_ = null;
  var httpService_ = null;
  var configService_ = null;
  var dialogService_ = null;
  var pulldownService_ = null;
  var tableViewService_ = null;
  var translate_ = null;
  var dragZoomActive = false;
  var rootScope_ = null;
  var q_ = null;
  var mousePositionControl_ = null;
  var showTimeline_ = false;

  var select = null;
  var draw = null;
  var modify = null;

  var editableLayers_ = null;

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

  var createSpatialFilterLayer = function() {
    return new ol.layer.Vector({
      metadata: {
        spatialFilterLayer: true,
        editable: true,
        title: 'Spatial Filters'
      },
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 160, 0, 0.5)'
        }),
        stroke: new ol.style.Stroke({
          color: 'rgba(255, 160, 0, 1.0)',
          width: 2
        })
      })
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

  function createBBoxFromCoordinatesFromProjectionIntoProjection(coordinates, fromProjection, toProjection) {
    if (!coordinates) {
      return [[]];
    }
    return [[
      ol.proj.transform([coordinates[0], coordinates[1]], fromProjection, toProjection),
      ol.proj.transform([coordinates[0], coordinates[3]], fromProjection, toProjection),
      ol.proj.transform([coordinates[2], coordinates[3]], fromProjection, toProjection),
      ol.proj.transform([coordinates[2], coordinates[1]], fromProjection, toProjection)
    ]];
  }

  function angleNormalize(angle) {
    if (angle < -180) {
      return 360 + angle;
    }else if (angle > 180) {
      return -360 + angle;
    }
    return angle;
  }

  function createGeoJSONLayerFromCoordinatesWithProjection(coordinates, projection) {
    var geojsonObject = {
      'type': 'Feature',
      'crs': {
        'type': 'name',
        'properties': {
          'name': projection
        }
      },
      'geometry': {
        'type': 'Polygon',
        'coordinates': createBBoxFromCoordinatesFromProjectionIntoProjection(coordinates, projection, 'EPSG:900913')
      }
    };
    return new ol.layer.Vector({
      source: new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(geojsonObject)
      })
    });
  }

  module.provider('mapService', function() {
    this.$get = function($translate, serverService, geogigService, $http, pulldownService,
                         $cookieStore, $cookies, $location, $browser, configService, dialogService, tableViewService, $rootScope, $q) {
      service_ = this;
      httpService_ = $http;
      configService_ = configService;
      serverService_ = serverService;
      geogigService_ = geogigService;
      dialogService_ = dialogService;
      translate_ = $translate;
      locationService_ = $location;
      rootScope_ = $rootScope;
      pulldownService_ = pulldownService;
      tableViewService_ = tableViewService;
      browserService_ = $browser;
      q_ = $q;

      // create map on init so that other components can use map on their init
      //this.configuration = configService_.configuration;
      this.title = configService_.configuration.about.title;
      this.abstract = configService_.configuration.about.abstract;
      this.id = configService_.configuration.id;
      this.save_method = 'POST';

      if (goog.isDefAndNotNull(this.id) && this.id) {
        this.save_url = '/maps/' + this.id + '/data';
        this.save_method = 'PUT';
      } else {
        this.save_url = '/maps/new/data';
      }

      this.map = this.createMap();

      this.map.on('moveend', this.trackInHash.bind(this));

      // This needed to go old school because the Angular and jQuery
      //  mechanisms for reading a parent window's hash do not exist,
      //  at the time of writing (or at least not in the versions
      //  used in the application at the time of writing)
      //
      var win = getRealWindow();
      var hash_listener = this.trackWindowHash.bind(this);
      if (win.addEventListener) {
        win.addEventListener('hashchange', hash_listener);
      } else if (win.attachEvent) {
        win.attachEvent('onhashchange', hash_listener);
      }

      // now that we have a map, lets try to add layers and servers
      service_.loadLayers();

      this.editLayer = createVectorEditLayer();
      this.spatialFilterLayer = createSpatialFilterLayer();

      this.spatialFilterLayer.getSource().on(['addfeature', 'changefeature', 'clear', 'removefeature'], function(event) {
        var spatialFilterGML = [];
        service_.getSpatialFilterLayer().getSource().getFeatures().forEach(function(feature) {
          spatialFilterGML.push(service_.getGeometryGML3FromFeature(feature));
        });
        tableViewService_.setSpatialFilter(spatialFilterGML);
      });

      this.createGeoJSONLayerFromCoordinatesWithProjection = createGeoJSONLayerFromCoordinatesWithProjection;
      this.createBBoxFromCoordinatesFromProjectionIntoProjection = createBBoxFromCoordinatesFromProjectionIntoProjection;
      this.angleNormalize = angleNormalize;

      $rootScope.$on('conflict_mode', function() {
        editableLayers_ = service_.getLayers(true);
        for (var index = 0; index < editableLayers_.length; index++) {
          editableLayers_[index].get('metadata').editable = false;
        }
      });

      $rootScope.$on('default_mode', function() {
        if (goog.isDefAndNotNull(editableLayers_)) {
          for (var index = 0; index < editableLayers_.length; index++) {
            editableLayers_[index].get('metadata').editable = true;
          }
        }
      });
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
        dialogService_.open(translate_.instant('error'), translate_.instant('drag_zoom_not_supported'));
        return;
      }

      //set the condition to always so that drag zoom will activate anytime the map is dragged
      this.map.getInteractions().getArray()[index].condition_ = ol.events.condition.always;
      dragZoomActive = true;
    };

    this.dumpTileCache = function(layerToDump) {
      var layers = this.getLayers(true, true);
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

    this.zoomToExtentForProjection = function(extent, projection) {
      var transform = ol.proj.getTransformFromProjections(projection,
          this.map.getView().getProjection());
      service_.zoomToExtent(ol.extent.applyTransform(extent, transform));
    };

    this.zoomToExtent = function(extent, animate, map, scale) {
      if (!goog.isDefAndNotNull(animate)) {
        animate = true;
      }
      if (!goog.isDefAndNotNull(map)) {
        map = this.map;
      }
      if (!goog.isDefAndNotNull(scale) || scale < 0) {
        scale = 0;
      }

      var view = map.getView();

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
        }
        for (var index = 0; index < extent.length; index++) {
          if (isNaN(parseFloat(extent[index])) || !isFinite(extent[index])) {
            extent = view.getProjection().getExtent();
            break;
          }
        }
      }

      if (animate) {
        var zoom = ol.animation.zoom({resolution: map.getView().getResolution()});
        var pan = ol.animation.pan({source: map.getView().getCenter()});
        map.beforeRender(pan, zoom);
      }

      view.fit(extent, map.getSize());
    };

    this.zoomToLayerFeatures = function(layer) {
      var deferredResponse = q_.defer();

      if (!goog.isDefAndNotNull(layer)) {
        deferredResponse.resolve();
        return deferredResponse.promise;
      }

      if (service_.layerIsEditable(layer)) {
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
                'xmlns:' + layer.get('metadata').workspace + '="' + layer.get('metadata').workspaceURL + '">' +
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
          var x2js = new X2JS();
          var json = x2js.xml_str2json(data);
          if (goog.isDefAndNotNull(json.ExecuteResponse) && goog.isDefAndNotNull(json.ExecuteResponse.Status) &&
              goog.isDefAndNotNull(json.ExecuteResponse.Status.ProcessFailed)) {
            service_.zoomToLayerExtent(layer);
            deferredResponse.resolve();
            return;
          }
          var lower = json.BoundingBox.LowerCorner.toString().split(' ');
          var upper = json.BoundingBox.UpperCorner.toString().split(' ');
          var bounds = [JSON.parse(lower[0], 10),
                        JSON.parse(lower[1], 10),
                        JSON.parse(upper[0], 10),
                        JSON.parse(upper[1], 10)];
          var transform = ol.proj.getTransformFromProjections(ol.proj.get(layer.get('metadata').projection),
              ol.proj.get(service_.map.getView().getProjection()));
          var extent900913 = ol.extent.applyTransform(bounds, transform);
          service_.zoomToExtent(extent900913, null, null, 0.1);
          deferredResponse.resolve();
        }).error(function(data, status, headers, config) {
          service_.zoomToLayerExtent(layer);
          deferredResponse.resolve();
        });

      } else {
        // dealing with an non vector layer
        service_.zoomToLayerExtent(layer);
        deferredResponse.resolve();
      }
      return deferredResponse.promise;
    };

    this.zoomToLayerExtent = function(layer) {
      var metadata = layer.get('metadata');
      var shrinkExtent = function(extent, shrink) {
        var newExtent = extent;

        // If the extent is null, make a new one while shrinking based on factor
        if (!goog.isDefAndNotNull(extent) && goog.isDefAndNotNull(metadata) &&
            goog.isDefAndNotNull(metadata.bbox.crs)) {
          newExtent = goog.array.clone(metadata.bbox.extent);
          var yDelta = (newExtent[3] - newExtent[1]) * shrink;
          var xDelta = (newExtent[2] - newExtent[0]) * shrink;
          newExtent[0] += xDelta;
          newExtent[1] += yDelta;
          newExtent[2] -= xDelta;
          newExtent[3] -= yDelta;
        }

        // Create transform and project to current map
        var transform = ol.proj.getTransformFromProjections(ol.proj.get(metadata.bbox.crs),
            service_.map.getView().getProjection());
        newExtent = ol.extent.applyTransform(newExtent, transform);

        return newExtent;
      };

      var extent900913;
      if (goog.isDefAndNotNull(layer.getSource().getExtent)) {
        extent900913 = shrinkExtent(layer.getSource().getExtent(), 0);
      } else {
        extent900913 = shrinkExtent(metadata.bbox.extent, 0);
      }

      if (goog.isDefAndNotNull(extent900913)) {
        for (var index = 0; index < extent900913.length; index++) {
          if (isNaN(parseFloat(extent900913[index])) || !isFinite(extent900913[index])) {
            if (goog.isDefAndNotNull(layer.getSource().getExtent)) {
              extent900913 = shrinkExtent(layer.getSource().getExtent(), 0.001);
            } else {
              extent900913 = shrinkExtent(metadata.bbox.extent, 0.001);
            }
            break;
          }
        }
      }

      service_.zoomToExtent(extent900913);
    };

    this.getLayers = function(includeHidden, includeEditable) {
      var layers = [];

      this.map.getLayers().forEach(function(layer) {

        // if not an internal layer and not difference layer
        if (goog.isDefAndNotNull(layer.get('metadata')) && // skip the internal layer that ol3 adds for vector editing
            !(layer.get('metadata').vectorEditLayer) &&
            !(layer.get('metadata').internalLayer) &&
            !(layer.get('metadata').spatialFilterLayer)) {

          // if it is imagery
          if (!service_.layerIsEditable(layer)) {
            // if we want imagery
            if (goog.isDefAndNotNull(includeEditable) && includeEditable) {
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

    this.layerIsEditable = function(layer) {
      return goog.isDefAndNotNull(layer.get('metadata').editable) && layer.get('metadata').editable;
    };

    this.downloadProjection = function(epsgCode) {
      var deferredResponse = q_.defer();
      if (goog.isDefAndNotNull(epsgCode)) {
        // if code is string instead of number and starts with epsg: remove it
        if (epsgCode.toLowerCase().indexOf('epsg:') === 0) {
          epsgCode = epsgCode.substring('epsg:'.length);
        }

        var epsgCodeAsNumber = parseInt(epsgCode, 10);
        if (isNaN(epsgCodeAsNumber)) {
          //TODO: translate
          deferredResponse.reject('epsgCode could not be converted to valid number');
        } else {
          var url = '//epsg.io/' + epsgCodeAsNumber + '.js';
          httpService_.get(url).then(function(response) {
            if (goog.isDefAndNotNull(response) && goog.isDefAndNotNull(response.data) && response.data.indexOf('proj4.defs(') === 0) {
              try {
                // strip the proj4.defs( and then ');' from the tail
                var data = response.data.substring('proj4.defs('.length, response.data.length - ');'.length);
                var params = data.split('"');
                // add the projction
                proj4.defs(params[1], params[3]);
                deferredResponse.resolve();
              } catch (e) {
                deferredResponse.reject('Error adding layer projection code: ' + epsgCode + ' from: ' + url);
              }
            } else {
              deferredResponse.reject('Error downloading layer projection code: ' + epsgCode + ' from: ' + url);
            }
          }, function(reject) {
            deferredResponse.reject(reject);
          }, function(update) {
            deferredResponse.update(update);
          });
        }
      }

      return deferredResponse.promise;
    };

    this.createLayerWithFullConfig = function(fullConfig, serverId) {
      var server = serverService_.getServerById(serverId);
      var minimalConfig = {
        name: fullConfig.name,
        source: serverId
      };
      return service_.createLayerFull(minimalConfig, fullConfig, server);
    };

    /**
     *  {Object} minimalConfig
     *  {Number} opt_layerOrder is optional and indicates the spot in the layers array it should try to go to.
     *        when not specified, the layer will be the top most layer. On a an empty map, if a layer with layerOrder 5
     *        is added when later another layer with layerOrder 3 is added, it will be inserted below the previous one.
     *        Similarly a 3rd layer with order 4 will be inserted between 3 and 5.
     */
    this.createLayer = function(minimalConfig, opt_layerOrder) {
      var server = serverService_.getServerById(minimalConfig.source);
      if (goog.isDefAndNotNull(server) && server.ptype === 'gxp_mapquestsource' && minimalConfig.name === 'naip') {
        minimalConfig.name = 'sat';
      }

      var fullConfig = null;
      if (goog.isDefAndNotNull(server)) {
        fullConfig = serverService_.getLayerConfig(server.id, minimalConfig);
      }

      if (goog.isDefAndNotNull(minimalConfig.registryConfig)) {
        fullConfig = minimalConfig.registryConfig;
      }

      return service_.createLayerFull(minimalConfig, fullConfig, server, opt_layerOrder);
    };

    this.createLayerFull = function(minimalConfig, fullConfig, server, opt_layerOrder) {

      // download missing projection projection if we don't have it
      if (goog.isDefAndNotNull(fullConfig)) {
        var projcode = service_.getCRSCode(fullConfig.CRS);
        if (goog.isDefAndNotNull(projcode)) {
          // do we have the projection from definition in src/app/Proj4jDefs.js,  if not, try to download
          // it if we have internet connectivity. When working in disconnected mode, you can only use projections
          // that have been defined by maploom in Proj4jDefs
          var prj = null;
          try {
            prj = ol.proj.get(projcode);
          } catch (e) {
            console.log('----[ projection not found: ', projcode);
          }

          if (!goog.isDefAndNotNull(prj)) {
            service_.downloadProjection(projcode).then(function() {
              // this should work if we get the projection
              ol.proj.getTransform(projcode, 'EPSG:4326');
            }, function(reject) {
              console.log('----[ Error downloading projection: ', reject);
            });

            // TODO: proj file is downloaded and added to proj4 but we need to either do syncronous call or make sure
            // it is resolved before we continue on or return a promis and make sure all invokaction of addLayer user
            // the promise properly
            try {
              prj = ol.proj.get(projcode);
            } catch (e) {
              dialogService_.error(translate_.instant('add_layers'), translate_.instant('projection_not_supported', projcode));
              console.log('====[ NOTE: proj file is downloaded and added to proj4 but we need to either do syncronous call or make sure ' +
                  'it is resolved before we continue on or return a promis and make sure all invokaction of addLayer user ' +
                  'the promise properly ', projcode);
            }
          }
        }
      }

      var layer = null;
      var nameSplit = null;
      var url = null;
      if (!goog.isDefAndNotNull(fullConfig)) {
        //dialogService_.error(translate_.instant('map_layers'), translate_.instant('load_layer_failed',
        //    {'layer': minimalConfig.name}), [translate_.instant('btn_ok')], false);
        layer = new ol.layer.Vector({
          metadata: {
            name: minimalConfig.name,
            title: minimalConfig.name,
            savedSchema: minimalConfig.schema,
            editable: false,
            placeholder: true
          },
          visible: minimalConfig.visibility,
          source: new ol.source.Vector({
            parser: null
          })
        });
      } else {
        if (fullConfig.type && fullConfig.type == 'mapproxy_tms') {
          layer = new ol.layer.Tile({
            metadata: {
              name: minimalConfig.name,
              url: goog.isDefAndNotNull(mostSpecificUrl) ? mostSpecificUrl : undefined,
              title: fullConfig.title,
              extent: fullConfig['extent'],
              abstract: fullConfig.abstract,
              readOnly: false,
              editable: false,
              projection: service_.getCRSCode(fullConfig.CRS),
              bbox: {
                extent: fullConfig['extent'],
                crs: service_.getCRSCode(fullConfig.CRS)
              }
            },
            visible: true,
            source: new ol.source.XYZ({
              url: fullConfig.detail_url
            })
          });
        } else if (server.ptype === 'gxp_osmsource') {
          var osmLocal = {
            attributions: [
              new ol.Attribution({
                html: settings.OsmLocalAttribution
              }),
              ol.source.OSM.ATTRIBUTION
            ],
            crossOrigin: null,
            url: settings.OsmLocalUrl
          };
          var osmSource = (settings.OsmLocalUrl !== 'default') ? osmLocal : '';
          layer = new ol.layer.Tile({
            metadata: {
              serverId: server.id,
              name: minimalConfig.name,
              title: fullConfig.Title
            },
            visible: minimalConfig.visibility,
            source: new ol.source.OSM(osmSource)
          });
        } else if (server.ptype === 'gxp_bingsource') {

          var sourceParams = {
            key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
            imagerySet: 'Aerial'
          };

          if (goog.isDefAndNotNull(fullConfig.sourceParams)) {
            goog.object.extend(sourceParams, fullConfig.sourceParams);
          }

          layer = new ol.layer.Tile({
            metadata: {
              serverId: server.id,
              name: minimalConfig.name,
              title: fullConfig.Title
            },
            visible: minimalConfig.visibility,
            source: new ol.source.BingMaps(sourceParams)
          });
        } else if (server.ptype === 'gxp_googlesource') {
          dialogService_.error(translate_.instant('add_layers'), translate_.instant('layer_type_not_supported',
              {type: 'gxp_googlesource'}));
        } else if (server.ptype === 'gxp_mapboxsource') {

          var parms = {
            //url: 'http://api.tiles.mapbox.com/v3/mapbox.' + fullConfig.sourceParams.layer + '.json?access_token=pk.eyJ1IjoiYmVja2VyciIsImEiOiJjaWtzcHVyeTYwMDA3dWdsenB5aHUxMzl1In0.1FVjOTdhoXGXtnfApX8wVQ',
            url: '//api.tiles.mapbox.com/v4/mapbox.' + fullConfig.sourceParams.layer + '.json?access_token=pk.eyJ1IjoiYmVja2VyciIsImEiOiJjaWtzcHVyeTYwMDA3dWdsenB5aHUxMzl1In0.1FVjOTdhoXGXtnfApX8wVQ',
            crossOrigin: true
          };
          var mbsource = new ol.source.TileJSON(parms);

          if (goog.isDefAndNotNull(mbsource)) {
            layer = new ol.layer.Tile({
              metadata: {
                serverId: server.id,
                name: minimalConfig.name,
                title: fullConfig.Title
              },
              visible: minimalConfig.visibility,
              source: mbsource
            });
          } else {
            console.log('====[ Error: could not create base layer.');
          }
        } else if (server.ptype === 'gxp_arcrestsource') {
          var metadata = {
            serverId: server.id,
            name: minimalConfig.name,
            title: fullConfig.Title
          };
          var attribution = new ol.Attribution({
            html: 'Tiles &copy; <a href="' + server.url + '">ArcGIS</a>'
          });
          var serviceUrl = server.url + 'tile/{z}/{y}/{x}';
          var serviceSource = null;
          if (server.proj === 'EPSG:4326') {
            var projection = ol.proj.get('EPSG:4326');
            var tileSize = 512;
            serviceSource = new ol.source.XYZ({
              attributions: [attribution],
              maxZoom: 16,
              projection: projection,
              tileSize: tileSize,
              metadata: metadata,
              tileUrlFunction: function(tileCoord) {
                return serviceUrl.replace('{z}', (tileCoord[0] - 1).toString())
                                  .replace('{x}', tileCoord[1].toString())
                                  .replace('{y}', (-tileCoord[2] - 1).toString());
              },
              wrapX: true
            });
          } else {
            serviceSource = new ol.source.XYZ({
              attributions: [attribution],
              maxZoom: 16,
              metadata: metadata,
              url: serviceUrl
            });
          }

          layer = new ol.layer.Tile({
            metadata: metadata,
            visible: minimalConfig.visibility,
            source: serviceSource
          });

        } else if (server.ptype === 'gxp_tilejsonsource') {
          //currently we assume only one layer per 'server'
          var jsontile_source = server.layersConfig[0].TileJSONSource;

          if (goog.isDefAndNotNull(jsontile_source)) {
            layer = new ol.layer.Tile({
              metadata: {
                serverId: server.id,
                name: minimalConfig.name,
                title: fullConfig.Title,
                bbox: { extent: fullConfig.bounds, crs: 'CRS:84' },
                sourceParms: fullConfig.sourceParams
              },
              visible: minimalConfig.visibility,
              source: jsontile_source
            });
          } else {
            console.log('====[ Error: could not create base layer.');
          }
        } else if (server.ptype === 'gxp_mapquestsource') {
          var source = new ol.source.MapQuest(fullConfig.sourceParams);

          if (goog.isDefAndNotNull(source)) {
            layer = new ol.layer.Tile({
              metadata: {
                serverId: server.id,
                name: minimalConfig.name,
                title: fullConfig.Title
              },
              visible: minimalConfig.visibility,
              source: source
            });
          } else {
            console.log('====[ Error: could not create base layer.');
          }

        } else if (server.ptype === 'gxp_wmscsource') {
          nameSplit = fullConfig.Name.split(':');

          // favor virtual service url when available
          var mostSpecificUrl = server.url;
          var mostSpecificUrlWms = server.url;
          if (goog.isDefAndNotNull(server.isVirtualService) && server.isVirtualService === true) {
            mostSpecificUrlWms = server.virtualServiceUrl;
          }

          // favor virtual service url when available
          if (goog.isDefAndNotNull(mostSpecificUrlWms)) {
            var urlIndex = mostSpecificUrlWms.lastIndexOf('/');
            if (urlIndex !== -1) {
              mostSpecificUrl = mostSpecificUrlWms.slice(0, urlIndex);
            }
          }

          layer = new ol.layer.Tile({
            metadata: {
              serverId: server.id,
              name: minimalConfig.name,
              url: goog.isDefAndNotNull(mostSpecificUrl) ? mostSpecificUrl : undefined,
              title: fullConfig.Title,
              abstract: fullConfig.Abstract,
              keywords: fullConfig.KeywordList,
              workspace: nameSplit.length > 1 ? nameSplit[0] : '',
              readOnly: false,
              editable: false,
              bbox: (goog.isArray(fullConfig.BoundingBox) ? fullConfig.BoundingBox[0] : fullConfig.BoundingBox),
              projection: service_.getCRSCode(fullConfig.CRS),
              savedSchema: minimalConfig.schema,
              dimensions: fullConfig.Dimension
            },
            visible: minimalConfig.visibility,
            source: new ol.source.TileWMS({
              url: mostSpecificUrlWms,
              params: {
                'LAYERS': minimalConfig.name,
                'tiled': 'true'
              }
            })
          });

          // Test if layer is read-only
          if (goog.isDefAndNotNull(mostSpecificUrl)) {
            layer.get('metadata').readOnly = true;
            var testReadOnly = function() {
              var wfsRequestData = '<?xml version="1.0" encoding="UTF-8"?> ' +
                  '<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" ' +
                  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                  'service="WFS" version="1.0.0" ' +
                  'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/wfs.xsd"> ' +
                  '<wfs:Update xmlns:feature="' + layer.get('metadata').workspaceURL + '" typeName="' +
                  minimalConfig.name + '">' +
                  '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
                  '<ogc:FeatureId fid="garbage_id" />' +
                  '</ogc:Filter></wfs:Update>' +
                  '</wfs:Transaction>';

              var serverUrl = serverService_.getMostSpecificUrl(server);
              var wfsurl = serverService_.getWfsRequestUrl(serverUrl);

              function _handlePostResponse(data, status, headers, config) {
                var x2js = new X2JS();
                var json = x2js.xml_str2json(data);
                if (goog.isDefAndNotNull(json.ServiceExceptionReport) &&
                    goog.isDefAndNotNull(json.ServiceExceptionReport.ServiceException) &&
                    json.ServiceExceptionReport.ServiceException.indexOf('read-only') >= 0) {
                } else {
                  layer.get('metadata').readOnly = false;
                }
              }

              var wfsReqConfig = {
                withCredentials: true
              };
              wfsReqConfig.headers = serverService_.getWfsRequestHeaders(server);

              httpService_.post(wfsurl, wfsRequestData, wfsReqConfig)
              .success(_handlePostResponse);

            };
            geogigService_.isGeoGig(layer, server, fullConfig).then(function() {
              testReadOnly();
            }, function() {
              testReadOnly();
            });
          }
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
            visible: minimalConfig.visibility,
            source: new ol.source.XYZ({
              tileUrlFunction: function(coordinate) {
                if (coordinate == null) {
                  return '';
                }
                var z = coordinate[0];
                var x = coordinate[1];
                var y = (1 << z) - coordinate[2] - 1;
                return '/proxy/?url=' + url + minimalConfig.name + '/' + z + '/' + x + '/' + y + '.png';
              }
            })
          });

        } else if (server.ptype === 'gxp_olsource') {
          dialogService_.error(translate_.instant('add_layers'), translate_.instant('layer_type_not_supported',
              {type: 'gxp_olsource'}));
        }
      }
      return layer;
    };

    this.addVirtualLayer = function(minimalConfig, layerConfig, server) {
      var layer = service_.createLayerFull(minimalConfig, layerConfig, server);
      service_.addLayerCore(minimalConfig, layer);
    };

    this.addLayer = function(minimalConfig, opt_layerOrder) {
      var layer = service_.createLayer(minimalConfig, opt_layerOrder);
      return service_.addLayerCore(minimalConfig, layer, opt_layerOrder);
    };

    this.addLayerCore = function(minimalConfig, layer, opt_layerOrder) {
      if (goog.isDefAndNotNull(layer)) {
        // convert source id to a number. even though geonode gives it as a string, it wants it back as number
        minimalConfig.source = parseInt(minimalConfig.source, 10);

        //TODO: assume all layers have a meta object. we can go through rest of the code and remove any checks for meta
        //      being defined. If it is not defined, we should add an empty one here.
        var meta = layer.get('metadata');

        if (minimalConfig['registry']) {
          meta['registry'] = minimalConfig['registry'];
          meta['registryConfig'] = minimalConfig['registryConfig'];
        }

        meta.config = minimalConfig;
        // hash the server id + the layer name and hash it to create a unqiue, html-safe id.
        meta.uniqueID = sha1('server' + meta.serverId + '_' + meta.name);

        var mapLayers = this.map.getLayerGroup().getLayers().getArray();
        meta.layerOrder = goog.isDefAndNotNull(opt_layerOrder) ? opt_layerOrder : mapLayers.length;

        // the first registry layer gets added beneath the base map.
        // this prevents that.
        if (meta.registry && meta.layerOrder === 1) {
          meta.layerOrder++;
        }

        var insertIndex = -1;

        for (var index = 0; index < mapLayers.length; index++) {
          var lyr = mapLayers[index];
          var lyrLayerOrder = lyr.get('metadata').layerOrder;
          if (meta.layerOrder < lyrLayerOrder) {
            insertIndex = index;
            break;
          }
        }

        if (insertIndex === -1) {
          this.map.addLayer(layer);
        } else {
          this.map.getLayerGroup().getLayers().insertAt(insertIndex, layer);
        }
        if (goog.isDefAndNotNull(meta.projection)) {
          // ping proj4js to pre-download projection if we don't have it
          ol.proj.getTransform(meta.projection, 'EPSG:4326');
        }
        rootScope_.$broadcast('layer-added');
      } else {
        console.log('====[Error: could not load layer: ', minimalConfig);
      }

      pulldownService_.showLayerPanel();
      return layer;
    };

    this.getTitle = function() {
      if (goog.isDefAndNotNull(this.title) && this.title !== '') {
        return this.title;
      }
      return translate_.instant('new_map');
    };

    this.getCenter = function() {
      return this.map.getView().getCenter();
    };

    this.getMapViewParams = function() {
      var params = {
        projection: configService_.configuration.map.projection,
        maxZoom: 17
      };

      var default_view = {
        center: configService_.configuration.map.center,
        zoom: configService_.configuration.map.zoom
      };

      // check the window's hash for a default view and use tha
      //  unless the map already has one defined.
      var hash_view = getHashView(getRealWindow().location.hash, default_view);
      goog.object.extend(params, hash_view);

      if (configService_.configuration.map.projection === 'EPSG:4326') {
        params['minZoom'] = 3;
      } else {
        params['maxResolution'] = 40075016.68557849 / 2048;
      }
      return params;
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
        // Remove the MapLoom-specific virtual service flag and attribute.  These are re-created when the
        // layer is added.
        if (server.config.isVirtualService === true && goog.isDefAndNotNull(server.config.virtualServiceUrl)) {
          var config = angular.copy(server.config, {});
          config.url = config.virtualServiceUrl;

          delete config.isVirtualService;
          delete config.virtualServiceUrl;

          cfg.sources.push(config);
          return;
        }
        cfg.sources.push(server.config);
      });

      // -- save layers
      goog.array.forEach(service_.getLayers(true, true), function(layer, key, obj) {
        var config = layer.get('metadata').config;

        if (!goog.isDefAndNotNull(config)) {
          console.log('Not saving layer: ', layer.get('metadata').name,
              'because the layer does not have a configuration object.');
          return false;
        }
        // Note: when a server is removed, its id diverges from the index. since in geonode's config object it is all
        // index based, updating it to be the index in case the id is no longer the index
        var serverIndex = serverService_.getServerIndex(config.source);
        if (serverIndex > -1) {
          config.source = serverIndex;
        }
        config.visibility = layer.get('visible');
        if (goog.isDefAndNotNull(layer.get('metadata').schema)) {
          config.schema = [];
          for (var i in layer.get('metadata').schema) {
            config.schema.push({name: i, visible: layer.get('metadata').schema[i].visible});
          }
        } else if (goog.isDefAndNotNull(layer.get('metadata').savedSchema)) {
          config.schema = layer.get('metadata').savedSchema;
        }

        cfg.map.layers.push(config);
      });

      httpService_({
        url: service_.getSaveURL(),
        method: service_.getSaveHTTPMethod(),
        data: JSON.stringify(cfg),
        headers: {
          'X-CSRFToken': configService_.csrfToken
        }
      }).success(function(data, status, headers, config) {
        service_.updateMap(data);
      }).error(function(data, status, headers, config) {
        if (status == 403 || status == 401) {
          dialogService_.error(translate_.instant('save_failed'), translate_.instant('map_save_permission'));
        } else {
          dialogService_.error(translate_.instant('save_failed'), translate_.instant('map_save_failed',
              {value: status}));
        }
      });
    };

    this.loadLayers = function() {
      console.log('=======[[ using configService_.configuration: ', configService_.configuration);
      if (goog.isDefAndNotNull(configService_.configuration) &&
          goog.isDefAndNotNull(configService_.configuration.sources) &&
          goog.isDefAndNotNull(configService_.configuration.map) &&
          goog.isDefAndNotNull(configService_.configuration.map.layers)) {

        // go through each server and if any of them are pointing to a specific layer's wms change it to point to
        // the server. http://ip/geoserver/workspace/name/wms will become http://ip/geoserver/wms
        goog.object.forEach(configService_.configuration.sources, function(serverInfo, key, obj) {
          if (goog.isDefAndNotNull(serverInfo.url)) {
            configService_.configuration.sources[key] = serverService_.replaceVirtualServiceUrl(serverInfo);
          }
        });

        var ordered = new Array(configService_.configuration.sources.length);
        goog.object.forEach(configService_.configuration.sources, function(serverInfo, key, obj) {
          ordered[key] = serverInfo;
        });

        // if a server has the same url as another server, do not add the server and update layers pointing to the
        // duplicate server to point to the existing server. geonode passes in duplicate servers when creating
        // a map from a layer. Note that this array can end up with holes.
        var orderedUnique = new Array(ordered.length);
        var orderedUniqueLength = 0;
        goog.array.forEach(ordered, function(serverInfo, key, obj) {

          if (goog.isDefAndNotNull(serverInfo.url)) {
            var foundServerIndex = null;

            for (var index = 0; index < orderedUnique.length; index++) {
              var server = orderedUnique[index];
              if (goog.isDefAndNotNull(server)) {
                if (goog.isDefAndNotNull(server.url)) {


                  // When virtual services are on the same server as a non-virtual service
                  // they should be treated as separate servers and not trigger the duplicate server
                  // logic.  This means that getCapabilties requests will go out for each of the servers
                  // and different responses need to come back.
                  if (server.isVirtualService === serverInfo.isVirtualService) {
                    if (server.isVirtualService === true) {
                      if (server.virtualServiceUrl === serverInfo.virtualServiceUrl) {
                        foundServerIndex = index;
                        break;
                      }
                    } else {
                      if (server.url === serverInfo.url) {
                        foundServerIndex = index;
                        break;
                      }
                    }
                  }
                }
              }
            }

            if (goog.isDefAndNotNull(foundServerIndex)) {
              var foundServer = orderedUnique[foundServerIndex];
              console.log('====[ Warning: skipping source/server as it has the same URL as existingServer.' +
                  ' serverInfo: ', serverInfo, ', foundServer: ', foundServer);

              // update any layer's source that is using this duplicate server to the existing server
              for (var index2 = 0; index2 < configService_.configuration.map.layers.length; index2++) {
                var layer = configService_.configuration.map.layers[index2];
                if (layer.source === key.toString()) {
                  console.log('====[ Note: updating layer source from old:', layer.source,
                      ', to new: ', foundServerIndex, ', layer: ', layer);
                  layer.source = foundServerIndex.toString();
                }
              }
            } else {
              orderedUnique[key] = serverInfo;
              orderedUniqueLength++;
            }

            // Ignore lazy loading if a map layer depends on the server.
            if (serverInfo.lazy === true) {
              for (var layerIndex = 0; layerIndex < configService_.configuration.map.layers.length; layerIndex++) {
                var mapLayer = configService_.configuration.map.layers[layerIndex];
                if (mapLayer.source === key.toString() && goog.isDefAndNotNull(mapLayer.name)) {
                  console.log('====[ Note: Server is marked as lazy, but a map layer depends on the server.  ' +
                      'Will ignore lazy flag.', serverInfo, mapLayer);
                  serverInfo.mapLayerRequiresServer = true;
                  break;
                }
              }
            }
          } else {
            // basemaps will have servers without a url
            orderedUnique[key] = serverInfo;
            orderedUniqueLength++;
          }
        });

        //Note serverIndex refers to the index in the config object not the index in serverService
        var addLayersForServer = function(configServerIndex, server) {

          // get all layers that refer to this serverIndex
          var configs = [];
          goog.array.forEach(configService_.configuration.map.layers, function(layerInfo, index, obj) {
            // Note: config.source will be string while serverIndex might be number
            if (layerInfo.source == configServerIndex) {
              layerInfo.temp_layerOrder = index;
              configs.push(layerInfo);
            }
          });

          goog.array.forEach(configs, function(layerInfo) {
            if (goog.isDefAndNotNull(layerInfo.name)) {
              // save the layerOrder which was based on the index the layer config is in the initial config object
              // remove it from layer info since it shouldn't stay there.
              var layerOrder = layerInfo.temp_layerOrder;
              layerInfo.temp_layerOrder = undefined;

              // when the server is added to maploom, it will have an entirely different index/id so once it is
              // resolved, we will update the layer info to reflect it. Do this on a clone since other functions
              // are still using the config object
              var layerInfoClone = goog.object.clone(layerInfo);
              if (goog.isDefAndNotNull(server)) {
                layerInfoClone.source = server.id;
              }
              service_.addLayer(layerInfoClone, layerOrder);
            } else {
              console.log('====[ Warning: could not add layer because it does not have a name: ', layerInfo);
            }
          });
        };
        pulldownService_.serversLoading = true;
        pulldownService_.addLayers = false;
        goog.array.forEach(orderedUnique, function(serverInfo, serverIndex, obj) {
          // if there was a duplicate server, an index in the ordered array will be undefined
          if (goog.isDefAndNotNull(serverInfo)) {
            serverService_.addServer(serverInfo, true)
                .then(function(serverNew) {
                  orderedUniqueLength--;
                  addLayersForServer(serverIndex, serverNew);
                  if (orderedUniqueLength === 0) {
                    pulldownService_.serversLoading = false;
                    pulldownService_.addLayers = true;
                    service_.map.updateSize();
                    // add servers corresponding to basemaps
                    serverService_.configDefaultServers();
                  }
                }, function(reject) {
                  orderedUniqueLength--;
                  addLayersForServer(serverIndex, null);
                  if (orderedUniqueLength === 0) {
                    pulldownService_.serversLoading = false;
                    pulldownService_.addLayers = true;
                    service_.map.updateSize();
                    // add servers corresponding to basemaps
                    serverService_.configDefaultServers();
                  }
                  dialogService_.error(translate_.instant('server'), translate_.instant('load_server_failed',
                      {'server': serverInfo.name, 'value': reject}), [translate_.instant('btn_ok')], false);
                });
          } else {
            orderedUniqueLength--;
            if (orderedUniqueLength === 0) {
              pulldownService_.serversLoading = false;
              pulldownService_.addLayers = true;
              service_.map.updateSize();
              // add servers corresponding to basemaps
              serverService_.configDefaultServers();
            }
          }
        });

        //TODO: once all servers were added, async, then add any missing ones.
      } else {
        console.log('invalid config object, cannot load map: ', configService_.configuration);
        alert('invalid config object, cannot load map');
      }
    };

    this.showMousePositionControl = function(state) {
      if (state) {
        this.map.removeControl(mousePositionControl_);
        this.map.addControl(mousePositionControl_);
      } else {
        this.map.removeControl(mousePositionControl_);
      }
    };

    this.showTimeline = function(state) {
      if (state !== showTimeline_) {
        showTimeline_ = state;
        if (state) {
          $('#map .metric-scale-line').css('bottom', '+=40px');
          $('#map .imperial-scale-line').css('bottom', '+=40px');
          $('#map .ol-mouse-position').css('bottom', '+=40px');
          $('#switch-coords-border').css('bottom', '+=40px');
        } else {
          $('#map .metric-scale-line').css('bottom', '-=40px');
          $('#map .imperial-scale-line').css('bottom', '-=40px');
          $('#map .ol-mouse-position').css('bottom', '-=40px');
          $('#switch-coords-border').css('bottom', '-=40px');
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
        settings.coordinateDisplay = coordinateDisplays.DD;
        var precision = settings.DDPrecision;
        this.map.getControls().getArray()[index].setCoordinateFormat(ol.coordinate.createStringXY(precision));
      } else if (settings.coordinateDisplay === coordinateDisplays.DD) {
        settings.coordinateDisplay = coordinateDisplays.MGRS;
        this.map.getControls().getArray()[index].setCoordinateFormat(xyToMGRSFormat);
      } else if (settings.coordinateDisplay === coordinateDisplays.MGRS) {
        settings.coordinateDisplay = coordinateDisplays.DMS;
        this.map.getControls().getArray()[index].setCoordinateFormat(ol.coordinate.toStringHDMS);
      }
    };

    this.toggleFullscreen = function() {
      if (goog.dom.fullscreen.isFullScreen()) {
        goog.dom.fullscreen.exitFullScreen();
      } else {
        goog.dom.fullscreen.requestFullScreenWithKeys(goog.dom.getElementByClass('maploom-body'));
      }
    };

    /** As maploom is commonly embedded in an iframe,
     *  this normalizes access to the actual window.
     *
     * Inspired by:
     *  http://stackoverflow.com/questions/935127/how-to-access-parent-iframe-from-javascript
     *
     * @return {window} The real container window.
     */
    var getRealWindow = function() {
      if (window.frameElement) {
        return window.parent;
      }
      return window;
    };

    /** Return a hash string for storing map information.
     *
     * @param {ol.Map} The map.
     *
     * @return {String} String to set as the hash, cookie, etc.
     */
    var getHashString = function(map) {
      var map_view = map.getView();

      // format map_view into a string
      var center = map_view.getCenter();
      // assemble a useful string
      return 'l=' + center[0] + ',' + center[1] + ',' + map_view.getResolution();
    };

    /** Update the window's hash with current information about
     *  the map.
     *
     *  Currently, only the map's location (as cx,cy,scale) is tracked.
     *
     */
    this.trackInHash = function() {
      // get the real parent window
      var real_window = getRealWindow();
      // get the new hash setting.
      var hash_string = getHashString(this.map);

      // the key to this working is to use the 'real window',
      //  it avoids issues with both angular and WebKit quirks.
      real_window.location.hash = hash_string;
    };

    /** Normalize clean up of the hash string.
     *  there can be odd leading characters from how Angular
     *  operates.
     *
     *  @param {String} hash The hash string to be parsed.
     *
     * @return {String} a cleaned version.
     */
    var cleanHashString = function(hash) {
      var new_hash = '' + hash;
      var first = new_hash.substring(0, 1);
      if (new_hash.substring(0, 2) == '#/') {
        new_hash = new_hash.substring(2);
      } else if (first == '/' || first == '#') {
        new_hash = new_hash.substring(1);
      }
      return new_hash;
    };

    /** Converts the current #hash string to a ol.View
     *
     *  @param {String} hashString   "#" string from a window.
     *  @param {ol.View} defaultView View that will be used when no hash
     *                               location can be found.
     *
     * @return {Object} With new Center and Resolution elements.
     */
    var getHashView = function(hashString, defaultView) {
      // split the hash into individual components
      var components = cleanHashString(hashString).split(';');

      for (var i = 0, ii = components.length; i < ii; i++) {
        // location starts with 'l='
        if (components[i].substring(0, 2) == 'l=') {
          var loc = components[i].substring(2).split(',');
          return {
            center: [parseFloat(loc[0]), parseFloat(loc[1])],
            resolution: parseFloat(loc[2])
          };
        }
      }

      return defaultView;
    };

    /** Check the hash for a change in map state.
     *
     */
    this.trackWindowHash = function(defaultView) {
      // get the new hash
      var window_hash = cleanHashString(getRealWindow().location.hash);

      // compare to the new hash.
      var current_hash = getHashString(this.map);

      // if the hash are different, then do something...
      if (window_hash != current_hash) {
        // update the view
        var view = getHashView(window_hash, this.map.getView());
        var map_view = this.map.getView();
        map_view.setCenter(view.center);
        map_view.setResolution(view.resolution);
      }
    };

    this.createMap = function() {
      var coordDisplay;
      if (settings.coordinateDisplay === coordinateDisplays.DMS) {
        coordDisplay = ol.coordinate.toStringHDMS;
      } else if (settings.coordinateDisplay === coordinateDisplays.DD) {
        coordDisplay = ol.coordinate.createStringXY(settings.DDPrecision);
      } else if (settings.coordinateDisplay === coordinateDisplays.MGRS) {
        coordDisplay = xyToMGRSFormat;
      }
      mousePositionControl_ = new ol.control.MousePosition({
        projection: 'EPSG:4326',
        coordinateFormat: coordDisplay
      });
      var map = new ol.Map({
        //layers: do not add any layers to the map as they will be added once server is created and getcapabilities
        //        equivalent functions respond if relevant.
        controls: ol.control.defaults().extend([
          //new ol.control.FullScreen(),
          new ol.control.ZoomSlider(),
          mousePositionControl_,
          new ol.control.ScaleLine({className: 'metric-scale-line ol-scale-line',
            units: ol.control.ScaleLineUnits.METRIC}),
          new ol.control.ScaleLine({className: 'imperial-scale-line ol-scale-line',
            units: ol.control.ScaleLineUnits.IMPERIAL})
        ]),
        interactions: ol.interaction.defaults().extend([
          new ol.interaction.DragRotate()
        ]),
        //renderer: ol.RendererHint.CANVAS,
        ol3Logo: false,
        target: 'map',
        view: new ol.View(service_.getMapViewParams())
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
          dialogService_.open(translate_.instant('error'), translate_.instant('drag_zoom_not_supported'));
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
      var newGeom = transformGeometry(geom, crs, this.map.getView().getProjection());
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
      if (!goog.isDefAndNotNull(select)) {
        select = new ol.interaction.Select({style: styleFunc, layer: this.editLayer});
        this.map.addInteraction(select);
      }
    };

    this.addDraw = function(geometryType) {
      if (!goog.isDefAndNotNull(draw)) {
        draw = new ol.interaction.Draw({source: this.editLayer.getSource(), type: geometryType});
        this.map.addInteraction(draw);
      }
    };

    this.showHeatmap = function(layer, filters) {

      if (goog.isDefAndNotNull(filters)) {
        // clone the filter object so that when user changes teh layer filter, it doesn't affect this heatmap that has
        // already been created
        filters = goog.object.clone(filters);
        console.log('----[ mapService.showHeatmap from tableview for layer: ', layer, ', filters: ', filters);
      } else {
        console.log('----[ mapService.showHeatmap for layer, no filter ', layer);
      }

      var heatmapLayerName = '';
      var heatmapLayerTitle = '';

      if (goog.isDefAndNotNull(filters)) {
        heatmapLayerName = 'TableView';
        heatmapLayerTitle = heatmapLayerName;
      } else {
        var meta = layer.get('metadata');
        meta.heatmapVisible = true;
        heatmapLayerName = meta.name;
        heatmapLayerTitle = meta.title;
      }

      var source = new ol.source.Vector({
        loader: function(extent, resolution, projection) {
          tableViewService_.getFeaturesWfs(layer, filters, extent).then(function(response) {
            try {
              var features = new ol.format.GeoJSON().readFeatures(response);
              source.addFeatures(features);
            } catch (err) {
              console.log('Error parsing heat map features', err);
            }
          }, function(reject) {
            console.error('Error loading heat map tile');
            //dialogService_.open(translate_.instant('error'), translate_.instant('error'));
          });
        },
        strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({ maxZoom: 19 })) //,
      });

      source.on('addfeature', function(event) {
        event.feature.set('weight', 5);
      });

      var vector = new ol.layer.Heatmap({
        metadata: {
          name: 'heatmap:' + heatmapLayerName,
          title: 'heatmap:' + heatmapLayerTitle,
          heatmapLayer: true,
          uniqueID: sha1(heatmapLayerName),
          bbox: {crs: 'EPSG:3857'},
          editable: false
        },
        projection: 'EPSG:3857',
        source: source
      });

      this.map.addLayer(vector);
      rootScope_.$broadcast('layer-added');

      // TODO: somewhere better?
      if (goog.isDefAndNotNull(layer)) {
        layer.get('metadata').loadingHeatmap = false;
      }

      return layer;
    };


    this.addModify = function() {
      if (!goog.isDefAndNotNull(modify)) {
        modify = new ol.interaction.Modify({features: select.getFeatures(), style: styleFunc});
        this.map.addInteraction(modify);
      }
    };

    this.removeSelect = function() {
      this.map.removeInteraction(select);
      select = null;
    };

    this.removeDraw = function() {
      this.map.removeInteraction(draw);
      draw = null;
    };

    this.removeModify = function() {
      this.map.removeInteraction(modify);
      modify = null;
    };

    this.hasSelectedFeature = function() {
      if (goog.isDefAndNotNull(select)) {
        return select.getFeatures().getLength() > 0;
      }
      return false;
    };

    this.getSelectedFeatures = function() {
      if (goog.isDefAndNotNull(select)) {
        return select.getFeatures();
      }
      return [];
    };

    this.getCRSCode = function(CRS) {
      var code = 'EPSG:4326';
      forEachArrayish(CRS, function(_code) {
        if (_code !== 'CRS:84') {
          code = _code;
        }
      });
      return code;
    };

    this.addToSpatialFilterLayer = function(feature) {
      this.map.removeLayer(this.spatialFilterLayer);

      // Handle using the same feature multiple times
      if (this.spatialFilterLayer.getSource().getFeatureById(feature.getId()) !== null) {
        var num = 1;
        while (this.spatialFilterLayer.getSource().getFeatureById(feature.getId() + '-' + num) !== null) {
          num++;
        }
        feature.setId(feature.getId() + '-' + num);
      }

      this.spatialFilterLayer.getSource().addFeature(feature);
      this.map.addLayer(this.spatialFilterLayer);
    };

    this.getSpatialFilterLayer = function() {
      return this.spatialFilterLayer;
    };

    this.getGeometryGML3FromFeature = function(feature) {
      // TODO: Copied from FeatureManagerService#getGeometryGMLFromFeature changing Polygon to Surface.
      // Only used by the spatial filter. Didn't know what else is using the above method.
      // At some point in the future should figure out what needs Surface and what needs Polygon.
      var featureGML = '';
      var index = 0;
      var length = 1;
      var geometries = [feature.getGeometry()];
      var buildCoordString = function(coords) {
        var counter = 0;
        return String(coords).replace(/,/g, function(all, match) {
          if (counter === 1) {
            counter = 0;
            return ' ';
          }
          counter++;
          return ',';
        });
      };
      var isGeometryCollection = false;
      if (feature.getGeometry().getType().toLowerCase() == 'geometrycollection') {
        geometries = feature.getGeometry().getGeometries();
        length = geometries.length;
        featureGML += '<gml:MultiGeometry xmlns:gml="http://www.opengis.net/gml" srsName="' +
            service_.map.getView().getProjection().getCode() + '">';
        isGeometryCollection = true;
      }
      for (var geometryIndex = 0; geometryIndex < length; geometryIndex++) {
        var geometry = geometries[geometryIndex];
        var geometryType = geometry.getType().toLowerCase();
        if (isGeometryCollection) {
          featureGML += '<gml:geometryMember>';
        }
        if (geometryType == 'point') {
          featureGML += '<gml:Point xmlns:gml="http://www.opengis.net/gml" srsName="' +
              service_.map.getView().getProjection().getCode() + '">' +
              '<gml:coordinates decimal="." cs="," ts=" ">' +
              geometry.getCoordinates().toString() +
              '</gml:coordinates></gml:Point>';
        } else if (geometryType == 'linestring') {
          featureGML += '<gml:LineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
              service_.map.getView().getProjection().getCode() + '">' +
              '<gml:coordinates decimal="." cs="," ts=" ">' + buildCoordString(geometry.getCoordinates().toString()) +
              '</gml:coordinates></gml:LineString>';
        } else if (geometryType == 'polygon') {
          featureGML += '<gml:Polygon xmlns:gml="http://www.opengis.net/gml" srsName="' +
              service_.map.getView().getProjection().getCode() + '">' +
              '<gml:exterior><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[0].toString()) + '</gml:coordinates>' +
              '</gml:LinearRing></gml:exterior>';
          for (index = 1; index < geometry.getCoordinates().length; index++) {
            featureGML += '<gml:exterior><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
                buildCoordString(geometry.getCoordinates()[index].toString()) + '</gml:coordinates>' +
                '</gml:LinearRing></gml:exterior>';
          }
          featureGML += '</gml:Polygon>';
        } else if (geometryType == 'multipoint') {
          featureGML += '<gml:MultiPoint xmlns:gml="http://www.opengis.net/gml" srsName="' +
              service_.map.getView().getProjection().getCode() + '">';
          for (index = 0; index < geometry.getCoordinates().length; index++) {
            featureGML += '<gml:pointMember><gml:Point><gml:coordinates decimal="." cs="," ts=" ">' +
                geometry.getCoordinates()[index].toString() +
                '</gml:coordinates></gml:Point></gml:pointMember>';
          }
          featureGML += '</gml:MultiPoint>';
        } else if (geometryType == 'multilinestring') {
          featureGML += '<gml:MultiLineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
              service_.map.getView().getProjection().getCode() + '">';
          for (index = 0; index < geometry.getCoordinates().length; index++) {
            featureGML += '<gml:lineMember><gml:LineString><gml:coordinates decimal="." cs="," ts=" ">' +
                buildCoordString(geometry.getCoordinates()[index].toString()) +
                '</gml:coordinates></gml:LineString></gml:lineMember>';
          }
          featureGML += '</gml:MultiLineString>';
        } else if (geometryType == 'multipolygon') {
          featureGML += '<gml:MultiSurface xmlns:gml="http://www.opengis.net/gml" srsName="' +
              service_.map.getView().getProjection().getCode() + '">';
          for (index = 0; index < geometry.getCoordinates().length; index++) {
            featureGML += '<gml:surfaceMember><gml:Polygon>' +
                '<gml:exterior><gml:LinearRing><gml:posList>' +
                geometry.getCoordinates()[index][0].toString().replace(/,/g, ' ') + '</gml:posList>' +
                '</gml:LinearRing></gml:exterior>';
            for (var innerIndex = 1; innerIndex < geometry.getCoordinates()[index].length; innerIndex++) {
              featureGML += '<gml:interior><gml:LinearRing><gml:posList>' +
                  geometry.getCoordinates()[index][innerIndex].toString().replace(/,/g, ' ') + '</gml:posList>' +
                  '</gml:LinearRing></gml:interior>';
            }
            featureGML += '</gml:Polygon></gml:surfaceMember>';
          }
          featureGML += '</gml:MultiSurface>';
        }
        if (isGeometryCollection) {
          featureGML += '</gml:geometryMember>';
        }
      }
      if (isGeometryCollection) {
        featureGML += '</gml:MultiGeometry>';
      }
      return featureGML;
    };
  });

}());
