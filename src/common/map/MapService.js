(function() {
  var module = angular.module('loom_map_service', ['ngCookies']);

  var service_ = null;
  var serverService_ = null;
  var geogigService_ = null;
  var httpService_ = null;
  var cookieStoreService_ = null;
  var cookiesService_ = null;
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
  var layerStyleTimeStamps = {};

  var select = null;
  var draw = null;
  var modify = null;

  var editableLayers_ = null;

  var createStoryPinLayer = function() {
    return new ol.layer.Vector({
      metadata: {
        StoryPinLayer: true,
        title: 'Story Pins',
        config: {}
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
          zIndex: 2
        })];
      }
    });
  };

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
    this.$get = function($translate, serverService, geogigService, $http, pulldownService,
                         $cookieStore, $cookies, configService, dialogService, tableViewService, $rootScope, $q) {
      service_ = this;
      httpService_ = $http;
      cookieStoreService_ = $cookieStore;
      cookiesService_ = $cookies;
      configService_ = configService;
      console.log(cookiesService_, cookieStoreService_);
      serverService_ = serverService;
      geogigService_ = geogigService;
      dialogService_ = dialogService;
      translate_ = $translate;
      rootScope_ = $rootScope;
      pulldownService_ = pulldownService;
      tableViewService_ = tableViewService;
      q_ = $q;

      // create map on init so that other components can use map on their init
      this.configuration = angular.copy(configService_.configuration);
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

      this.chapterLayers = [];
      this.styleStorageService = storytools.edit.styleStorageService.styleStorageService();

      //Set initial layer group from map.
      this.chapterLayers.push(this.map.getLayerGroup());

      if (goog.isDefAndNotNull(this.configuration.chapters)) {
        var num_chapters = this.configuration.chapters.length;
        for (var iConfig = 0; iConfig < num_chapters; iConfig += 1) {
          //This will create a layer group for each chapter config in configuration
          if (!goog.isDefAndNotNull(this.chapterLayers[iConfig])) {
            service_.create_chapter();
          }
          service_.updateActiveMap(iConfig);

          service_.loadLayers(this.configuration.chapters[iConfig], iConfig);

        }
        service_.updateActiveMap(0);
      } else {
        //If there is no chapter array then we are loading from new view of composer
        // now that we have a map, lets try to add layers and servers
        service_.loadLayers(this.configuration);
        //$rootScope.$broadcast('chapter-add-config', 0, this.configuration);
      }



      this.editLayer = createVectorEditLayer();
      this.pinLayer = createStoryPinLayer();

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

      $rootScope.$on('chapter-added', function(event) {
        service_.zoomToExtent();
      });


      return this;
    };

    this.getLegendUrl = function(layer) {
      var url = null;
      var _ts = new Date().getTime();
      if (!layerStyleTimeStamps[layer.get('metadata').name] ||
          _ts - layerStyleTimeStamps[layer.get('metadata').name] > 150) {
        layerStyleTimeStamps[layer.get('metadata').name] = _ts;
      }
      var server = serverService_.getServerById(layer.get('metadata').serverId);
      url = server.url + '?test=ab&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=' +
          layer.get('metadata').name + '&transparent=true&legend_options=fontColor:0xFFFFFF;' +
          'fontAntiAliasing:true;fontSize:14;fontStyle:bold;';
      if (goog.isDefAndNotNull(layer.get('metadata').config.styles)) {
        url += '&style=' + layer.get('metadata').config.styles;
        url += '&_ts=' + layerStyleTimeStamps[layer.get('metadata').name];
      }
      return url;
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
      console.log('---- MapService.zoomToExtent. extent: ', extent);

      if (animate) {
        var zoom = ol.animation.zoom({resolution: map.getView().getResolution()});
        var pan = ol.animation.pan({source: map.getView().getCenter()});
        map.beforeRender(pan, zoom);
      }

      view.fit(extent, map.getSize());
    };

    this.updateStyle = function(layer) {
      var style = layer.get('style') || layer.get('metadata').style;
      var isComplete = new storytools.edit.StyleComplete.StyleComplete().isComplete(style);
      if (isComplete && goog.isDefAndNotNull(layer.getSource)) {
        style.name = this.configuration.username + '-' + this.configuration.id + '-' + window.config.chapter_index + '-' + style.typeName + '-' + layer.get('metadata').title;
        var layerSource = layer.getSource();
        if (goog.isDefAndNotNull(layerSource) && goog.isDefAndNotNull(layerSource.getParams) && goog.isDefAndNotNull(layer.get('styleName'))) {
          var sld = new storytools.edit.SLDStyleConverter.SLDStyleConverter();
          service_.styleStorageService.saveStyle(layer);
          var xml = sld.generateStyle(style, layer.getSource().getParams().LAYERS, true);
          httpService_({
            url: '/gs/rest/styles?name=' + style.name,
            method: 'POST',
            data: xml,
            headers: { 'Content-Type': 'application/vnd.ogc.sld+xml; charset=UTF-8' }
          }).then(function(result) {
            console.log('Style Create Response ', result);
            layer.get('metadata').config.styles = style.name;
            if (goog.isDefAndNotNull(layerSource.updateParams)) {
              layerSource.updateParams({
                '_dc': new Date().getTime(),
                '_olSalt': Math.random(),
                'STYLES': style.name
              });
            }
          }, function errorCallback(response) {
            console.log('Style Create Error Response ', response);
            if (response.status === 403 || response.status === 500) {
              httpService_({
                url: '/gs/rest/styles/' + style.name + '.xml',
                method: 'PUT',
                data: xml,
                headers: { 'Content-Type': 'application/vnd.ogc.sld+xml; charset=UTF-8' }
              }).then(function(result) {
                console.log('Style Update Response ', result);
                layer.get('metadata').config.styles = style.name;
                if (goog.isDefAndNotNull(layerSource.updateParams)) {
                  layerSource.updateParams({
                    '_dc': new Date().getTime(),
                    '_olSalt': Math.random(),
                    'STYLES': style.name
                  });
                }
              });

            }
            // called asynchronously if an error occurs
            // or server returns response with an error status.
          });
        }
      }
    };

    this.zoomToLayerFeatures = function(layer) {
      var deferredResponse = q_.defer();

      if (!goog.isDefAndNotNull(layer)) {
        deferredResponse.resolve();
        return deferredResponse.promise;
      }

      if (!service_.layerIsEditable(layer)) {
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
          //console.log('----[ mapService.zoomToLayerExtent.success', data, status, headers, config);
          var x2js = new X2JS();
          var json = x2js.xml_str2json(data);
          if (goog.isDefAndNotNull(json.ExecuteResponse) && goog.isDefAndNotNull(json.ExecuteResponse.Status) &&
              goog.isDefAndNotNull(json.ExecuteResponse.Status.ProcessFailed)) {
            console.log('----[ Warning: wps gs:bounds failed, zooming to layer bounds ', data, status, headers, config);
            service_.zoomToLayerExtent(layer);
            deferredResponse.resolve();
            return;
          }
          if (goog.isDefAndNotNull(json.BoundingBox)) {
            var lower = json.BoundingBox.LowerCorner.toString().split(' ');
            var upper = json.BoundingBox.UpperCorner.toString().split(' ');
            var bounds = [JSON.parse(lower[0], 10), JSON.parse(lower[1], 10), JSON.parse(upper[0], 10), JSON.parse(upper[1], 10)];
            //console.log('------- [[ bounds: ', bounds);
            var finalExtent = ol.proj.transformExtent(bounds, ol.proj.get(layer.get('metadata').projection),
                service_.configuration.map.projection);
            service_.zoomToExtent(finalExtent, null, null, 0.1);
          }else {
            console.log('----[ Warning: wps gs:bounds failed, zooming to layer bounds ', data, status, headers, config);
            service_.zoomToLayerExtent(layer);
          }
          deferredResponse.resolve();
        }).error(function(data, status, headers, config) {
          console.log('----[ Warning: wps gs:bounds failed, zooming to layer bounds ', data, status, headers, config);
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
        if (!goog.isDefAndNotNull(extent) && goog.isDefAndNotNull(metadata) &&
            goog.isDefAndNotNull(metadata.bbox.crs)) {
          newExtent = goog.array.clone(metadata.bbox.extent);
          var yDelta = (newExtent[3] - newExtent[1]) * shrink;
          var xDelta = (newExtent[2] - newExtent[0]) * shrink;
          newExtent[0] += xDelta;
          newExtent[1] += yDelta;
          newExtent[2] -= xDelta;
          newExtent[3] -= yDelta;
          var transform = ol.proj.getTransformFromProjections(ol.proj.get(metadata.bbox.crs),
              service_.map.getView().getProjection());
          newExtent = ol.extent.applyTransform(newExtent, transform);
        }
        return newExtent;
      };

      var extent900913 = shrinkExtent(layer.getExtent(), 0);

      if (goog.isDefAndNotNull(extent900913)) {
        for (var index = 0; index < extent900913.length; index++) {
          if (isNaN(parseFloat(extent900913[index])) || !isFinite(extent900913[index])) {
            extent900913 = shrinkExtent(layer.getExtent(), 0.001);
            break;
          }
        }
      }

      service_.zoomToExtent(extent900913);
    };

    this.zoomToAreaOfIntrestExtent = function(extent) {
      var deferredResponse = q_.defer();

      if (!goog.isDefAndNotNull(extent)) {
        deferredResponse.resolve();
        return deferredResponse.promise;
      }

      service_.zoomToExtent(extent);
      deferredResponse.resolve();

      return deferredResponse.promise;
    };

    this.getLayers = function(includeHidden, includeEditable) {
      var layers = [];

      this.map.getLayers().forEach(function(layer) {

        // if not an internal layer and not difference layer
        if (goog.isDefAndNotNull(layer.get('metadata')) && // skip the internal layer that ol3 adds for vector editing
            !(layer.get('metadata').vectorEditLayer) &&
            !(layer.get('metadata').internalLayer) &&
            !(layer.get('metadata').StoryPinLayer)) {

          // if it is imagery
          if (service_.layerIsEditable(layer)) {
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

    this.getBaseMaps = function() {
      var baseMaps = this.getLayers(true, true);
      for (var iLayer = baseMaps.length - 1; iLayer >= 0; iLayer--) {
        var layer = baseMaps[iLayer];
        if (layer.get('metadata').hasOwnProperty('config') && !goog.isDef(layer.get('metadata').config.group)) {
          baseMaps.splice(iLayer, 1);
        }
      }
      return baseMaps;
    };

    this.selectedBaseMap = function(selectedBaseMap) {
      var layers = this.getBaseMaps();
      console.dir(layers);
      for (var iLayer = 0; iLayer < layers.length; iLayer += 1) {
        var layer = layers[iLayer];
        layer.set('visible', false);
      }
      if (selectedBaseMap) {
        selectedBaseMap.set('visible', true);
      }
    };

    this.getStoryLayers = function(hidden, editable) {
      var layers = this.getLayers(hidden, editable);
      for (var iLayer = layers.length - 1; iLayer >= 0; iLayer -= 1) {
        var layer = layers[iLayer];
        if (layer.get('metadata').hasOwnProperty('config') && goog.isDef(layer.get('metadata').config.group)) {
          layers.splice(iLayer, 1);
        }
      }
      return layers.reverse();
    };

    this.zoomToLargestStoryLayer = function() {
      var layers = service_.getStoryLayers(false, true);
      var largestExtentArea = 0;
      var largestLayerIndex = -1;
      for (var iLayer = 0; iLayer < layers.length; iLayer += 1) {
        var layer = layers[iLayer];
        if (!goog.isDefAndNotNull(layer.get('metadata').StoryPinLayer)) {
          var layerExtent = layer.get('metadata').bbox.extent;
          var area = ol.extent.getHeight(layerExtent) * ol.extent.getWidth(layerExtent);
          if (area > largestExtentArea) {
            largestExtentArea = area;
            largestLayerIndex = iLayer;
          }
        }
      }
      if (largestLayerIndex !== -1) {
        service_.zoomToLayerFeatures(layers[largestLayerIndex]);
      } else {
        service_.zoomToExtent();
      }
    };

    this.layerIsEditable = function(layer) {
      return !goog.isDefAndNotNull(layer.get('metadata').editable) || !layer.get('metadata').editable;
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
          var url = 'http://epsg.io/' + epsgCodeAsNumber + '.js';
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

    /**
     *  {Object} minimalConfig
     *  {Number} opt_layerOrder is optional and indicates the spot in the layers array it should try to go to.
     *        when not specified, the layer will be the top most layer. On a an empty map, if a layer with layerOrder 5
     *        is added when later another layer with layerOrder 3 is added, it will be inserted below the previous one.
     *        Similarly a 3rd layer with order 4 will be inserted between 3 and 5.
     */
    this.addLayer = function(minimalConfig, opt_layerOrder, chapter_index) {
      var server = serverService_.getServerById(minimalConfig.source);
      if (goog.isDefAndNotNull(server) && server.ptype === 'gxp_mapquestsource' && minimalConfig.name === 'naip') {
        minimalConfig.name = 'sat';
      }

      var fullConfig = null;
      if (goog.isDefAndNotNull(server)) {
        serverService_.getFullLayerConfig(server.id, minimalConfig.name).then(function(config) {
          fullConfig = config;


          console.log('-- MapService.addLayer. minimalConfig: ', minimalConfig, ', fullConfig: ', fullConfig, ', server: ',
              server, ', opt_layerOrder: ', opt_layerOrder);

          // download missing projection projection if we don't have it
          if (goog.isDefAndNotNull(fullConfig)) {
            var projcode = service_.getCRSCode(fullConfig.CRS);
            if (goog.isDefAndNotNull(projcode)) {
              console.log('----[ addLayer, looking up projection: ', projcode);
              // do we have the projection from definition in src/app/Proj4jDefs.js,  if not, try to download
              // it we we have internet connectivity. When working in disconnected mode, you can only use projections
              // that have been defined by maploom in Proj4jDefs
              var prj = null;
              try {
                prj = ol.proj.get(projcode);
              } catch (e) {
                console.log('----[ projection not found: ', projcode);
              }

              if (!goog.isDefAndNotNull(prj)) {
                prj = service_.downloadProjection(projcode).then(function() {
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
                parser: null,
                wrapX: false
              })
            });
          } else {
            if (server.ptype === 'gxp_osmsource') {
              layer = new ol.layer.Tile({
                metadata: {
                  serverId: server.id,
                  name: minimalConfig.name,
                  title: fullConfig.Title
                },
                visible: minimalConfig.visibility,
                source: new ol.source.OSM({
                  wrapX: false
                })
              });
            } else if (server.ptype === 'gxp_bingsource') {

              var sourceParams = {
                key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
                imagerySet: 'Aerial',
                wrapX: false
              };

              if (goog.isDefAndNotNull(fullConfig.sourceParams)) {
                goog.object.extend(sourceParams, fullConfig.sourceParams);
              }

              // console.log(sourceParams, config.sourceParams, {});

              layer = new ol.layer.Tile({
                metadata: {
                  serverId: server.id,
                  name: minimalConfig.name,
                  title: fullConfig.Layer[0].Title
                },
                visible: minimalConfig.visibility,
                source: new ol.source.BingMaps(sourceParams)
              });
            } else if (server.ptype === 'gxp_googlesource') {
              dialogService_.error(translate_.instant('add_layers'), translate_.instant('layer_type_not_supported',
                  {type: 'gxp_googlesource'}));
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
            } else if (server.ptype === 'gxp_mapboxsource') {
              var parms = {
                url: 'https://api.tiles.mapbox.com/v3/mapbox.' + fullConfig.sourceParams.layer + '.jsonp?secure=1',
                crossOrigin: true,
                jsonp: true,
                wrapX: false
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
            } else if (server.ptype === 'gxp_mapquestsource') {
              var source = new ol.source.MapQuest(fullConfig.sourceParams);

              if (goog.isDefAndNotNull(source)) {
                layer = new ol.layer.Tile({
                  metadata: {
                    serverId: server.id,
                    name: minimalConfig.name,
                    title: fullConfig.Layer[0].Title
                  },
                  visible: minimalConfig.visibility,
                  source: source
                });
              } else {
                console.log('====[ Error: could not create base layer.');
              }

            } else if (server.ptype === 'gxp_wmscsource' && goog.isDefAndNotNull(fullConfig.Layer)) {
              nameSplit = fullConfig.Layer[0].Name.split(':');

              // favor virtual service url when available
              var mostSpecificUrl = server.url;
              var mostSpecificUrlWms = server.url;
              if (goog.isDefAndNotNull(server.isVirtualService) && server.isVirtualService === true) {
                mostSpecificUrlWms = server.virtualServiceUrl;
              }

              var getChapterLayerConfig = function() {
                if (goog.isDefAndNotNull(service_.configuration.chapters) &&
                    goog.isDefAndNotNull(service_.configuration.chapters[chapter_index])) {
                  var chapterLayers = service_.configuration.chapters[chapter_index].map.layers;
                  for (var i = 0; i < chapterLayers.length; i++) {
                    if (chapterLayers[i].name === minimalConfig.name) {
                      return chapterLayers[i];
                    }
                  }
                }
              };

              // favor virtual service url when available
              if (goog.isDefAndNotNull(mostSpecificUrlWms)) {
                var urlIndex = mostSpecificUrlWms.lastIndexOf('/');
                if (urlIndex !== -1) {
                  mostSpecificUrl = mostSpecificUrlWms.slice(0, urlIndex);
                }
              }

              var styles = [];
              var paramStyles = null;

              var layerParams = {
                LAYERS: minimalConfig.name,
                tiled: 'true',
                wrapX: false
              };

              if (goog.isDefAndNotNull(fullConfig.Layer[0].Style)) {
                console.log('config style', fullConfig.Layer[0].Style);
                for (var index = 0; index < fullConfig.Layer[0].Style.length; index++) {
                  var style = fullConfig.Layer[0].Style[index];
                  styles.push({
                    name: style.Name,
                    title: style.Title,
                    abstract: style.Abstract,
                    legendUrl: style.LegendURL[0].OnlineResource
                  });
                  paramStyles = service_.configuration.username + '-' +
                                service_.configuration.id + '-' + chapter_index + '-simple-' + style.Name +
                                '-' + minimalConfig.name.split(':')[1];
                }
              }

              var chapterLayerConfig = getChapterLayerConfig();
              if (goog.isDefAndNotNull(chapterLayerConfig)) {
                if (goog.isDefAndNotNull(chapterLayerConfig.styles)) {
                  paramStyles = chapterLayerConfig.styles;
                }
                layerParams['STYLES'] = paramStyles;
              }

              console.log('config crs', fullConfig.Layer[0].CRS);
              console.log('getCode', service_.getCRSCode(fullConfig.Layer[0].CRS));

              layer = new ol.layer.Tile({
                metadata: {
                  chapter: window.config.chapter_index,
                  serverId: server.id,
                  name: minimalConfig.name,
                  jsonstyle: service_.styleStorageService.getSavedStyle(minimalConfig.name),
                  url: goog.isDefAndNotNull(mostSpecificUrl) ? mostSpecificUrl : undefined,
                  title: fullConfig.Layer[0].Title,
                  abstract: fullConfig.Layer[0].Abstract,
                  keywords: fullConfig.Layer[0].KeywordList,
                  workspace: nameSplit.length > 1 ? nameSplit[0] : '',
                  readOnly: false,
                  editable: false,
                  styles: styles,
                  bbox: (goog.isArray(fullConfig.Layer[0].BoundingBox) ? fullConfig.Layer[0].BoundingBox[0] : fullConfig.Layer[0].BoundingBox),
                  projection: service_.getCRSCode(fullConfig.Layer[0].CRS),
                  savedSchema: minimalConfig.schema,
                  dimensions: fullConfig.Layer[0].Dimension
                },
                visible: minimalConfig.visibility,
                source: new ol.source.TileWMS({
                  url: mostSpecificUrlWms,
                  params: layerParams
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

                  var wfsurl = mostSpecificUrl + '/wfs/WfsDispatcher';
                  httpService_.post(wfsurl, wfsRequestData).success(function(data, status, headers, config) {
                    var x2js = new X2JS();
                    var json = x2js.xml_str2json(data);
                    if (goog.isDefAndNotNull(json.ServiceExceptionReport) &&
                        goog.isDefAndNotNull(json.ServiceExceptionReport.ServiceException) &&
                        json.ServiceExceptionReport.ServiceException.indexOf('read-only') >= 0) {
                    } else {
                      layer.get('metadata').readOnly = false;
                    }
                  }).error(function(data, status, headers, config) {
                  });
                };
                geogigService_.isGeoGig(layer, server, fullConfig.Layer[0]).then(function() {
                  testReadOnly();
                }, function() {
                  testReadOnly();
                });
              }
            } else if (server.ptype === 'gxp_tmssource') {
              nameSplit = fullConfig.Layer[0].Name.split(':');
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
                  title: fullConfig.Layer[0].Title,
                  abstract: fullConfig.Layer[0].Abstract,
                  keywords: fullConfig.Layer[0].KeywordList,
                  workspace: nameSplit.length > 1 ? nameSplit[0] : '',
                  editable: false,
                  bbox: fullConfig.Layer[0].BoundingBox[0]
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
                  },
                  wrapX: false
                })
              });

            } else if (server.ptype === 'gxp_olsource') {
              dialogService_.error(translate_.instant('add_layers'), translate_.instant('layer_type_not_supported',
                  {type: 'gxp_olsource'}));
            }
          }

          if (goog.isDefAndNotNull(layer)) {
            // convert source id to a number. even though geonode gives it as a string, it wants it back as number
            minimalConfig.source = parseInt(minimalConfig.source, 10);

            //TODO: assume all layers have a meta object. we can go through rest of the code and remove any checks for meta
            //      being defined. If it is not defined, we should add an empty one here.
            var meta = layer.get('metadata');

            meta.config = minimalConfig;
            // hash the server id + the layer name and hash it to create a unqiue, html-safe id.
            meta.uniqueID = sha1('server' + meta.serverId + '_' + meta.name);

            var mapLayers = service_.map.getLayerGroup().getLayers().getArray();
            meta.layerOrder = goog.isDefAndNotNull(opt_layerOrder) ? opt_layerOrder : mapLayers.length;

            var insertIndex = -1;

            for (var idx = 0; idx < mapLayers.length; idx++) {
              var lyr = mapLayers[idx];
              var lyrLayerOrder = lyr.get('metadata').layerOrder;
              if (meta.layerOrder < lyrLayerOrder) {
                insertIndex = idx;
                break;
              }
            }

            var layerGroupToInsert = service_.map.getLayerGroup();
            if (goog.isDef(chapter_index)) {
              layerGroupToInsert = service_.chapterLayers[chapter_index];
            }
            if (insertIndex === -1) {
              layerGroupToInsert.getLayers().push(layer);
            } else {
              layerGroupToInsert.getLayers().insertAt(insertIndex, layer);
            }

            if (server.isLocal === true) {
              service_.zoomToLayerFeatures(layer);
            }


            if (goog.isDefAndNotNull(meta.projection)) {
              // ping proj4js to pre-download projection if we don't have it
              var layerPrjObject = ol.proj.get(meta.projection);
              console.log('==== layerPrjObject', layerPrjObject);
              ol.proj.getTransform(meta.projection, 'EPSG:4326');
            }

            rootScope_.$broadcast('layer-added');
            console.log('-- MapService.addLayer, added: ', layer);
            toastr.clear();
            toastr.success(layer.get('metadata').title + ' Layer has been successfully loaded', 'Layer Loaded');
          } else {
            console.log('====[Error: could not load layer: ', minimalConfig);
            toastr.clear();
            toastr.error('Layer could not be loaded.', 'Loading Failed');
          }

          pulldownService_.showLayerPanel();
          return layer;

        });
      }
    };

    this.getTitle = function() {
      if (goog.isDefAndNotNull(this.title) && this.title !== '') {
        return this.title;
      }
      return translate_.instant('new_map');
    };

    this.getMap = function(chapter_index) {
      return this.maps[chapter_index];
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

    this.getSaveURL = function(id) {
      if (goog.isDefAndNotNull(id) && id) {
        return '/maps/' + id + '/data';
      } else {
        return '/story/chapter/new';
      }
    };

    this.getSaveHTTPMethod = function(id) {
      if (goog.isDefAndNotNull(id) && id) {
        return 'PUT';
      } else {
        return 'POST';
      }
    };

    // Update the map after save.
    this.updateMap = function(data) {
      service_.configuration.map.id = data.id;
    };

    this.updateActiveMap = function(chapter_index, chapter_config) {
      var activeLayers = this.chapterLayers[chapter_index];
      this.map.setLayerGroup(activeLayers);

    };

    this.remove_chapter = function(removed_index) {
      this.chapterLayers.splice(removed_index, 1);
    };
    //Create the new layergroup for the  new chapter
    //Parameter currently unused
    this.create_chapter = function(new_config) {
      this.chapterLayers.push(new ol.layer.Group());

    };

    this.reorderLayerGroup = function(from_index, to_index) {
      this.chapterLayers.splice(to_index, 0, this.chapterLayers.splice(from_index, 1)[0]);
    };

    this.save = function(map_config) {

      console.log('------ map_config:', map_config);
      var cfg = {
        about: {
          abstract: map_config.about.abstract,
          title: map_config.about.title
        },
        map: {
          id: map_config.map.id || 0,
          center: map_config.center || service_.getCenter(),
          zoom: map_config.zoom || service_.getZoom(),
          projection: service_.getProjection(),
          layers: [],
          keywords: map_config.map.keywords
        },
        sources: [],
        category: map_config.category,
        is_published: map_config.is_published,
        chapter_index: map_config.chapter_index,
        story_id: map_config.id,
        viewer_playbackmode: map_config.viewer_playbackmode || null,
        stylestore: (window.config.stylestore || null)
      };

      goog.array.forEach(serverService_.getServers(), function(server, key, obj) {
        console.log('saving server: ', server);

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

        var jsonStyle = service_.styleStorageService.getSavedStyle(layer, map_config.chapter_index);

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
        if (goog.isDefAndNotNull(jsonStyle)) {
          config.jsonstyle = jsonStyle;
        }
        config.visibility = layer.get('visible');
        if (goog.isDefAndNotNull(layer.get('metadata').dimensions)) {
          var dimension = layer.get('metadata').dimensions[0];
          config.capability = {};
          config.capability.dimensions = {};
          config.capability.dimensions.time = dimension;
          if (dimension.values instanceof Array) {
            config.capability.dimensions.time.values = dimension.values;
          }else {
            config.capability.dimensions.time.values = dimension.values.split(',');
          }
        }
        if (goog.isDefAndNotNull(layer.get('metadata').schema)) {
          config.schema = [];
          for (var i in layer.get('metadata').schema) {
            config.schema.push({name: i, visible: layer.get('metadata').schema[i].visible});
          }
        } else if (goog.isDefAndNotNull(layer.get('metadata').savedSchema)) {
          config.schema = layer.get('metadata').savedSchema;
        }
        console.log('saving layer: ', layer);
        console.log('metadata: ', layer.get('metadata'));
        console.log('config: ', layer.get('metadata').config);
        cfg.map.layers.push(config);
      });

      console.log('--- save.cfg: ', cfg);

      httpService_({
        url: service_.getSaveURL(cfg.map.id),
        method: service_.getSaveHTTPMethod(cfg.map.id),
        data: JSON.stringify(cfg),
        headers: {
          'X-CSRFToken': configService_.csrfToken
        }
      }).success(function(data, status, headers, config) {
        console.log('----[ map.save success. ', data, status, headers, config);
        map_config.map.id = data.id;
        rootScope_.$broadcast('map-saved', map_config);

      }).error(function(data, status, headers, config) {
        if (status == 403 || status == 401) {
          dialogService_.error(translate_.instant('save_failed'), translate_.instant('map_save_permission'));
        } else {
          dialogService_.error(translate_.instant('save_failed'), translate_.instant('map_save_failed',
              {value: status}));
        }
        rootScope_.$broadcast('map-save-failed', map_config);
      });
    };

    this.loadMap = function(config) {
      //Update map view with new config view information
      this.map.getView().setCenter(config.map.center);
      this.map.getView().setZoom(config.map.zoom);

      service_.loadLayers(config);
    };

    this.loadLayers = function(config, chapter_index) {
      console.log('=======[[ using parameter config: ', config);

      if (goog.isDefAndNotNull(config) &&
          goog.isDefAndNotNull(config.sources) &&
          goog.isDefAndNotNull(config.map) &&
          goog.isDefAndNotNull(config.map.layers)) {

        // go through each server and if any of them are pointing to a specific layer's wms change it to point to
        // the server. http://ip/geoserver/workspace/name/wms will become http://ip/geoserver/wms
        goog.object.forEach(config.sources, function(serverInfo, key, obj) {
          if (goog.isDefAndNotNull(serverInfo.url)) {
            serverService_.replaceVirtualServiceUrl(serverInfo);
          }
        });

        var ordered = new Array(config.sources.length);
        console.log('config.sources: ', config.sources);
        goog.object.forEach(config.sources, function(serverInfo, key, obj) {
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
              for (var index2 = 0; index2 < config.map.layers.length; index2++) {
                var layer = config.map.layers[index2];
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
              for (var layerIndex = 0; layerIndex < config.map.layers.length; layerIndex++) {
                var mapLayer = config.map.layers[layerIndex];
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
          goog.array.forEach(config.map.layers, function(layerInfo, index, obj) {
            // Note: config.source will be string while serverIndex might be number
            if (layerInfo.source == configServerIndex) {
              layerInfo.temp_layerOrder = (index > configs.length) ? config.length : index;
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
              service_.addLayer(layerInfoClone, layerOrder, chapter_index);
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
                  if (goog.isDefAndNotNull(serverNew)) {
                    addLayersForServer(serverIndex, serverNew);
                  }
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
                  console.log('====[ Error: Add server failed. ', reject);
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
        console.log('invalid config object, cannot load map: ', config);
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

    this.updateMapSize = function() {
      this.map.updateSize();
    };

    this.createMap = function() {
      var coordDisplay;
      if (settings.coordinateDisplay === coordinateDisplays.DMS) {
        coordDisplay = ol.coordinate.toStringHDMS;
      } else if (settings.coordinateDisplay === coordinateDisplays.DD) {
        coordDisplay = ol.coordinate.createStringXY(settings.DDPrecision);
      }
      mousePositionControl_ = new ol.control.MousePosition({
        projection: 'EPSG:4326',
        coordinateFormat: coordDisplay
      });

      console.log('====[[ loading config: ', service_.configuration);
      var mapCenter = !window.config.map ? [0, 0] : service_.configuration.map.center;
      var mapZoom = !window.config.map ? 3 : service_.configuration.map.zoom;

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
        view: new ol.View({
          projection: service_.configuration.map.projection,
          center: mapCenter,
          zoom: mapZoom,
          minZoom: 3,
          maxZoom: 17,
          extent: [-26318797.579151887, -20057076.22203025, 30858545.563065078, 18491645.882749837]
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
          dialogService_.open(translate_.instant('error'), translate_.instant('drag_zoom_not_supported'));
          return;
        }

        //Reset the condition to its default behavior after each use
        this.getInteractions().getArray()[index].condition_ = ol.events.condition.shiftKeyOnly;
        dragZoomActive = false;
      });
      // Let everyone know the map has loaded.
      rootScope_.$broadcast('map-created', service_.configuration);
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

    this.clearAllInteractions = function() {
      this.removeDraw();
      this.removeModify();
      this.removeSelect();
      this.clearEditLayer();
    };

    this.clearEditLayer = function() {
      this.editLayer.getSource().clear(true);
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

      var source = new ol.source.ServerVector({
        format: new ol.format.GeoJSON(),
        loader: function(extent, resolution, projection) {
          tableViewService_.getFeaturesWfs(layer, filters, extent).then(function(response) {
            source.addFeatures(source.readFeatures(response));
          }, function(reject) {
            dialogService_.open(translate_.instant('error'), translate_.instant('error'));
          });
        },
        strategy: ol.loadingstrategy.createTile(new ol.tilegrid.XYZ({
          maxZoom: 19
        })),
        projection: service_.configuration.map.projection
      });

      var vector = new ol.layer.Heatmap({
        metadata: {
          name: 'heatmap:' + heatmapLayerName,
          title: 'heatmap:' + heatmapLayerTitle,
          heatmapLayer: true,
          uniqueID: sha1(heatmapLayerName),
          editable: false
        },
        source: source,
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 255, 1.0)',
            width: 2
          })
        })
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
      //forEachArrayish(CRS, function(_code) {
      //if (_code !== 'CRS:84') {
      //code = _code;
      //}
      //});
      return code;
    };
  });

}());
