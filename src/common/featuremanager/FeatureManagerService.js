(function() {
  var module = angular.module('loom_feature_manager_service', []);

  //-- Private Variables
  var service_ = null;
  var mapService_ = null;
  var rootScope_ = null;
  var translate_ = null;
  var historyService_ = null;
  var httpService_ = null;
  var exclusiveModeService_ = null;
  var dialogService_ = null;
  var configService_ = null;
  var q_ = null;

  // valid values: 'layers', 'layer', 'feature', or ''
  var state_ = '';
  var selectedItem_ = null;

  /*
    ["sintel-2048-surround_512kb.mp4", "https://pbs.twimg.com/media/CNRXT7XWsAAyxBp.jpg", "082d7eb2a553671d363143f0e140b392f44a6f70.jpg"]

    // example value of this array
    var selectedItemPics_ = [
        'mypic.jpg',
        // this pic is not resoved through the fileservice as it is already a to a pic on the web so map loom will leave it alone
        'https://pbs.twimg.com/media/CNRXT7XWsAAyxBp.jpg'
      ];
  */
  var selectedItemMedia_ = null;
  /*
    // sample structure for a layer that has 2 attributes. one called 'evento', one 'fotos'
    // value at first index of each is the attribute name, and the second is the attribute value
    var selectedItemProperties_ = [
      [
        "evento",
        "otro"
      ],
      [
        "fotos",
        [
          "7ff194b54ab57a829094dc0afc624c78815ec02c.jpg",
          "https://pbs.twimg.com/media/CNRXT7XWsAAyxBp.jpg"
        ]
      ]
    ];
  */
  var selectedItemProperties_ = null;

  var selectedLayer_ = null;
  var featureInfoPerLayer_ = [];
  var containerInstance_ = null;
  var overlay_ = null;
  var position_ = null;
  var clickPosition_ = null;
  var enabled_ = true;
  var wfsPostTypes_ = { UPDATE: 0, INSERT: 1, DELETE: 2 };
  var supportedVideoFormats_ = ['mp4', 'ogg', 'webm', 'ogg'];

  module.provider('featureManagerService', function() {

    this.$get = function($rootScope, $translate, $q, mapService, $compile, $http, exclusiveModeService, dialogService,
                         historyService, configService) {
      //console.log('---- featureInfoBoxService.get');
      rootScope_ = $rootScope;
      service_ = this;
      mapService_ = mapService;
      historyService_ = historyService;
      translate_ = $translate;
      httpService_ = $http;
      exclusiveModeService_ = exclusiveModeService;
      dialogService_ = dialogService;
      configService_ = configService;
      q_ = $q;
      registerOnMapClick($rootScope, $compile);

      mapService_.editLayer.getSource().on(ol.source.VectorEventType.ADDFEATURE, function(event) {
        if (exclusiveModeService_.isEnabled()) {
          exclusiveModeService_.addMode = false;
          mapService_.removeDraw();
          mapService_.addSelect();
          mapService_.addModify();
          mapService_.selectFeature(event.feature);
        }
      });

      rootScope_.$on('layerRemoved', function(evt, layer) {
        if (goog.isDefAndNotNull(service_.getSelectedLayer()) &&
            service_.getSelectedLayer().get('metadata').uniqueID === layer.get('metadata').uniqueID) {
          service_.hide();
        }
      });

      rootScope_.$on('conflict_mode', function() {
        service_.hide();
      });

      overlay_ = new ol.Overlay({
        insertFirst: false,
        element: document.getElementById('info-box')
      });

      mapService_.map.addOverlay(overlay_);

      return this;
    };

    this.getState = function() {
      return state_;
    };

    this.getSelectedItem = function() {
      return selectedItem_;
    };

    this.getMediaUrl = function(mediaItem) {
      var url = mediaItem;
      // if the item doesn't start with 'http' then assume the item can be found in the fileservice and so convert it to
      // a url. This means if the item is, say, at https://mysite.com/mypic.jpg, leave it as is
      if (goog.isString(mediaItem) && mediaItem.indexOf('http') === -1) {
        url = configService_.configuration.fileserviceUrlTemplate.replace('{}', mediaItem);
      }
      return url;
    };

    this.getSelectedItemMedia = function() {
      return selectedItemMedia_;
    };

    // Warning, returns new array objects, not to be 'watched' / bound. use getSelectedItemMedia instead.
    this.getSelectedItemMediaByProp = function(propName) {
      var media = null;

      if (getItemType(selectedItem_) === 'feature' && goog.isDefAndNotNull(selectedItem_) &&
          goog.isDefAndNotNull(selectedItemProperties_)) {

        goog.object.forEach(selectedItemProperties_, function(prop, index) {
          if (service_.isMediaPropertyName(prop[0])) {
            if (!goog.isDefAndNotNull(propName) || propName === prop[0]) {
              if (!goog.isDefAndNotNull(media)) {
                //TODO: media should no longer be objects
                media = [];
              }

              goog.object.forEach(prop[1], function(mediaItem) {
                media.push(mediaItem);
              });
            }
          }
        });
      }

      return media;
    };

    this.isMediaPropertyName = function(name) {
      var lower = name.toLowerCase();
      return lower.indexOf('fotos') === 0 || lower.indexOf('photos') === 0 ||
          lower.indexOf('audios') === 0 || lower.indexOf('videos') === 0;
    };

    this.getMediaTypeFromPropertyName = function(name) {
      var lower = name.toLowerCase();
      var type = null;
      if (lower.indexOf('fotos') === 0 || lower.indexOf('photos') === 0) {
        type = 'photos';
      } else if (lower.indexOf('audios') === 0) {
        type = 'audios';
      } else if (lower.indexOf('videos') === 0) {
        type = 'videos';
      }
      return type;
    };

    this.getMediaUrlThumbnail = function(mediaItem) {
      var url = mediaItem;
      if (goog.isDefAndNotNull(mediaItem) && (typeof mediaItem === 'string')) {
        var ext = mediaItem.split('.').pop().split('/')[0]; // handle cases; /file.ext or /file.ext/endpoint
        if (supportedVideoFormats_.indexOf(ext) >= 0) {
          url = service_.getMediaUrlDefault();
        } else {
          url = service_.getMediaUrl(mediaItem);
        }
      }
      //console.log('----[ getMediaUrlThumbnail: ', url);
      return url;
    };

    this.getMediaUrlDefault = function() {
      return '/static/maploom/assets/media-default.png';
    };

    this.getMediaUrlError = function() {
      return '/static/maploom/assets/media-error.png';
    };

    this.getSelectedItemProperties = function() {
      return selectedItemProperties_;
    };

    this.getSelectedLayer = function() {
      return selectedLayer_;
    };

    this.getPosition = function() {
      return position_;
    };

    this.getEnabled = function() {
      return enabled_;
    };

    this.hide = function() {
      selectedItem_ = null;
      selectedItemMedia_ = null;
      selectedItemProperties_ = null;
      state_ = null;
      featureInfoPerLayer_ = [];
      mapService_.clearEditLayer();
    };

    /**
     * item: can be a feature, a layer containing features, or a collection of layers
     */
    // layers, layer, feature
    this.show = function(item, position, forceUpdate) {
      //console.log('---- show: ', item);

      if (!goog.isDefAndNotNull(forceUpdate)) {
        forceUpdate = false;
      }

      // if item is not specified, return
      if (!goog.isDefAndNotNull(item)) {
        return false;
      }

      var selectedItemOld = selectedItem_;

      var type = getItemType(item);
      // when there is nothing in featureInfoPerLayer_, we need to used the passed in item to initialize it
      // this is used when code calls show without the user clicking on the map.
      if (featureInfoPerLayer_.length === 0) {

        if (type === 'feature') {
          featureInfoPerLayer_.push({features: [item], layer: selectedLayer_});
        } else if (type === 'layer') {
          featureInfoPerLayer_.push(item);
        } else if (type === 'layers') {
          featureInfoPerLayer_ = item;
        } else {
          console.log('====[ Error: expected layers, layer, or feature. got: ', item);
          throw ({
            name: 'featureInfoBox',
            level: 'High',
            message: 'Expected layers, layer, or feature.',
            toString: function() {
              return this.name + ': ' + this.message;
            }
          });
        }
      }

      if (type === 'feature') {
        state_ = 'feature';
        selectedItem_ = item;
      } else if (type === 'layer') {
        if (item.features.length === 1) {
          state_ = 'feature';
          selectedItem_ = item.features[0];
        } else {
          state_ = 'layer';
          selectedItem_ = item;
        }
      } else if (type === 'layers') {
        if (item.length === 1) {
          if (item[0].features.length === 1) {
            state_ = 'feature';
            selectedItem_ = item[0].features[0];
          } else {
            state_ = 'layer';
            selectedItem_ = item[0];
          }
        } else {
          state_ = 'layers';
          selectedItem_ = item;
        }
      } else {
        throw ({
          name: 'featureInfoBox',
          level: 'High',
          message: 'Invalid item passed in. Expected layers, layer, or feature.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      //---- if selected item changed
      if (selectedItem_ !== selectedItemOld || forceUpdate) {

        // -- select the geometry if it is a feature, clear otherwise
        // -- store the selected layer of the feature
        if (getItemType(selectedItem_) === 'feature') {
          selectedLayer_ = this.getSelectedItemLayer().layer;
          // note that another service may make a fake feature selection on a layer not in mapservice.
          // checking to make sure it had a geometry before making assumptions about edit layer etc
          if (goog.isDefAndNotNull(selectedItem_.geometry)) {
            mapService_.addToEditLayer(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
            position = getNewPositionFromGeometry(mapService_.editLayer.getSource().getFeatures()[0].getGeometry(),
                clickPosition_);
          }
        } else {
          mapService_.clearEditLayer();
        }


        // -- update the selectedItemProperties_
        var tempProps = {};
        var props = [];

        if (getItemType(selectedItem_) === 'feature') {
          goog.object.forEach(selectedItem_.properties, function(v, k) {
            if (service_.isMediaPropertyName(k)) {
              if (goog.isDefAndNotNull(v)) {
                var jsonValue = null;
                if (goog.isArray(v)) {
                  jsonValue = v;
                } else {
                  try {
                    jsonValue = JSON.parse(v);
                  } catch (e) {
                    // was not able to parse it. field might unintentionally have a name that fits the media
                    // property name in maploom. tread it as a string.
                    console.log('----[ Warning: media property field ' + k + ' has invalid value of: ' + v);
                    jsonValue = '\"' + v + '\"';
                  }
                }
                var arrayValue = jsonValue;
                if (!goog.isArray(arrayValue)) {
                  arrayValue = [arrayValue];
                }
                tempProps[k] = [k, arrayValue];
              } else {
                tempProps[k] = [k, []];
              }
            } else {
              tempProps[k] = [k, v];
            }
          });
        }

        var propName = null;
        if (goog.isDefAndNotNull(selectedLayer_) && goog.isDefAndNotNull(selectedLayer_.get('metadata').schema)) {
          for (propName in selectedLayer_.get('metadata').schema) {
            if (tempProps.hasOwnProperty(propName)) {
              props.push(tempProps[propName]);
            }
          }
        } else {
          for (propName in tempProps) {
            if (tempProps.hasOwnProperty(propName)) {
              props.push(tempProps[propName]);
            }
          }
        }

        selectedItemProperties_ = props;
        console.log('---- selectedItemProperties_: ', selectedItemProperties_);

        // -- update the selectedItemMedia_
        selectedItemMedia_ = service_.getSelectedItemMediaByProp(null);
        console.log('---- selectedItemMedia_: ', selectedItemMedia_);

      }

      if (goog.isDefAndNotNull(position)) {
        position_ = position;
        mapService_.map.getOverlays().array_[0].setPosition(position);
      }
    };

    this.getSelectedItemLayer = function() {
      for (var i = 0; i < featureInfoPerLayer_.length; i++) {
        for (var j = 0; j < featureInfoPerLayer_[i].features.length; j++) {
          if (featureInfoPerLayer_[i].features[j] === selectedItem_) {
            return featureInfoPerLayer_[i];
          }
        }
      }
      return null;
    };

    this.showPreviousState = function() {
      //Note: might want to get position and pass it in again
      service_.show(service_.getPreviousState().item);
    };

    this.getPreviousState = function() {
      //console.log('---- getPreviousState.begin, state: ', state, ', item: ' , item);

      var state = null;
      var item = null;

      if (state_ === 'feature') {
        var layer = this.getSelectedItemLayer();
        if (layer) {
          if (layer.features.length > 1) {
            state = 'layer';
            item = layer;
          } else if (layer.features.length === 1 && featureInfoPerLayer_.length > 1) {
            item = featureInfoPerLayer_;
            state = 'layers';
          }
        } else {
          console.log('=====[ Error feature not found! selectedItem: ', selectedItem_);
          throw ({
            name: 'featureInfoBox',
            level: 'High',
            message: 'Could not find feature!',
            toString: function() {
              return this.name + ': ' + this.message;
            }
          });
        }
      } else if (state_ === 'layer') {
        if (featureInfoPerLayer_.length > 1) {
          state = 'layers';
          item = featureInfoPerLayer_;
        }
      }

      //console.log('---- getPreviousState, state: ', state, ', item: ' , item);

      if (item !== null) {
        return {
          state: state,
          item: item
        };
      }

      return '';
    };

    this.showMedia = function(prop, activeIndex) {
      var media = service_.getSelectedItemMediaByProp(prop);

      if (goog.isDefAndNotNull(media)) {
        // use the gallery controls
        $('#blueimp-gallery').toggleClass('blueimp-gallery-controls', true);

        var options = {
          useBootstrapModal: false
        };

        if (goog.isDefAndNotNull(activeIndex)) {
          options.index = activeIndex;
        }

        //clone media array and modify to prepare for media player's preferred format
        //var media = goog.array.clone(media);

        // if the media item is a video, we need to construct the item differently
        for (var i = 0; i < media.length; i++) {
          var fileTokens = media[i].split('.');
          var ext = fileTokens.pop();
          var filename = fileTokens.pop();
          if (supportedVideoFormats_.indexOf(ext) >= 0) {
            media[i] = {
              title: filename,
              href: media[i] = service_.getMediaUrl(media[i]),
              type: 'video/' + ext,
              poster: media[i] = service_.getMediaUrlThumbnail(media[i])
            };
          } else {
            media[i] = service_.getMediaUrl(media[i]);
          }
        }

        blueimp.Gallery(media, options);
      }
    };

    this.startFeatureInsert = function(layer) {
      // TODO: Find a better way to handle this
      service_.hide();
      enabled_ = false;
      var props = [];
      var geometryType = '';
      var geometryName = '';

      // Disable DoubleClickZoom
      //array[1] of interactions is doubleClickZoom
      mapService_.map.interactions_.array_[1].values_.active = false;

      goog.object.forEach(layer.get('metadata').schema, function(v, k) {
        if (!service_.isMediaPropertyName(k)) {
          if (v._type.search('gml:') == -1) {
            props.push([k, null]);
          } else {
            if (geometryType === '') {
              geometryName = k;
              geometryType = v._type;
            }
          }
        }
      });
      geometryType = geometryType.split(':')[1].replace('PropertyType', '');
      if (settings.WFSVersion == '1.1.0') {
        geometryType = geometryType.replace('Curve', 'Geometry');
      } else if (settings.WFSVersion == '2.0.0') {
        geometryType = geometryType.replace('Curve', 'LineString');
      }
      geometryType = geometryType.replace('Surface', 'Polygon');

      exclusiveModeService_.startExclusiveMode(translate_.instant('drawing_geometry'),
          geometryType,
          exclusiveModeService_.button(translate_.instant('accept_feature'), function() {
            if (mapService_.editLayer.getSource().getFeatures().length < 1) {
              dialogService_.warn(translate_.instant('adding_feature'), translate_.instant('must_create_feature'),
                  [translate_.instant('btn_ok')], false);
            } else {
              exclusiveModeService_.addMode = false;
              exclusiveModeService_.endExclusiveMode();
              mapService_.removeDraw();
              mapService_.removeSelect();
              mapService_.removeModify();
              var feature;
              var index;
              if (geometryType.search(/^Multi/g) > -1) {
                feature = new ol.Feature();
                var geometries = [];
                for (index = 0; index < mapService_.editLayer.getSource().getFeatures().length; index++) {
                  var geom = mapService_.editLayer.getSource().getFeatures()[index].getGeometry();
                  if (geometryType.toLowerCase() == 'multigeometry') {
                    geometries.push(geom);
                  } else {
                    geometries.push(geom.getCoordinates()[0]);
                  }
                }
                var geometry = transformGeometry({type: geometryType, coordinates: geometries});
                feature.setGeometry(geometry);
                mapService_.editLayer.getSource().clear();
                mapService_.editLayer.getSource().addFeature(feature);
              } else {
                feature = mapService_.editLayer.getSource().getFeatures()[0];
              }
              var newGeom;
              if (geometryType.toLowerCase() != 'multigeometry') {
                selectedItem_.geometry.type = feature.getGeometry().getType();
                selectedItem_.geometry.coordinates = feature.getGeometry().getCoordinates();
                newGeom = transformGeometry(selectedItem_.geometry,
                    mapService_.map.getView().getProjection(), selectedLayer_.get('metadata').projection);
                selectedItem_.geometry.coordinates = newGeom.getCoordinates();
              } else {
                selectedItem_.geometry.type = 'GeometryCollection';
                var setupGeometryArray = function(geom) {
                  selectedItem_.geometry.geometries = [];
                  for (index = 0; index < geom.getGeometries().length; index++) {
                    var tempGeom = geom.getGeometries()[index];
                    selectedItem_.geometry.geometries.push({coordinates: tempGeom.getCoordinates(),
                      type: tempGeom.getType()});
                  }
                };
                setupGeometryArray(feature.getGeometry());
                newGeom = transformGeometry(selectedItem_.geometry,
                    mapService_.map.getView().getProjection(), selectedLayer_.get('metadata').projection);
                setupGeometryArray(newGeom);
              }
              service_.startAttributeEditing(true);
            }
          }), exclusiveModeService_.button(translate_.instant('cancel_feature'), function() {
            exclusiveModeService_.addMode = false;
            exclusiveModeService_.endExclusiveMode();
            mapService_.removeDraw();
            mapService_.removeSelect();
            mapService_.removeModify();
            service_.endFeatureInsert(false);
          }), geometryType);
      exclusiveModeService_.addMode = true;
      selectedItemProperties_ = props;
      selectedLayer_ = layer;
      selectedItem_ = {geometry: {type: geometryType}, geometry_name: geometryName, properties: {}};
      mapService_.map.addLayer(mapService_.editLayer);
      if (geometryType.toLowerCase().search('geometry') > -1) {
        $('#drawSelectDialog').modal('toggle');
      } else {
        mapService_.addDraw(geometryType);
      }
      rootScope_.$broadcast('startFeatureInsert');
    };

    this.endFeatureInsert = function(save, properties, coords) {
      var deferredResponse = q_.defer();

      // Enable DoubleClickZoom
      //array[1] of interactions is doubleClickZoom
      mapService_.map.interactions_.array_[1].values_.active = true;

      if (save) {
        var propertyXmlPartial = '';
        var featureGML = '';
        var newPos;
        var feature = mapService_.editLayer.getSource().getFeatures()[0];
        if (goog.isDefAndNotNull(coords)) {
          // Check if either of the coordinates we changed in the attribute editing process
          if ((coords[0] !== selectedItem_.geometry.coordinates[0]) ||
              (coords[1] !== selectedItem_.geometry.coordinates[1])) {
            // Transform the geometry so we can get the new place on the map to show the info-box
            var newGeom = transformGeometry({type: 'point', coordinates: coords},
                selectedLayer_.get('metadata').projection, mapService_.map.getView().getProjection());
            // We also need to update the vector feature so that it is in the new position
            feature.setGeometry(newGeom);
            newPos = newGeom.getCoordinates();
            // Construct the property change to put in the partial to send in the post request
            featureGML = '<gml:Point xmlns:gml="http://www.opengis.net/gml" srsName="' +
                mapService_.map.getView().getProjection().getCode() + '">' +
                '<gml:coordinates decimal="." cs="," ts=" ">' +
                newPos[0] + ',' + newPos[1] +
                '</gml:coordinates></gml:Point>';
            var pan = ol.animation.pan({source: mapService_.map.getView().getCenter()});
            mapService_.map.beforeRender(pan);
            mapService_.map.getView().setCenter(newPos);
          } else {
            featureGML = getGeometryGMLFromFeature(feature);
            newPos = feature.getGeometry().getCoordinates();
            mapService_.addToEditLayer(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
          }
        } else {
          featureGML = getGeometryGMLFromFeature(feature);
          newPos = getNewPositionFromGeometry(feature.getGeometry());
          mapService_.addToEditLayer(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
        }
        propertyXmlPartial += '<feature:' + selectedItem_.geometry_name + '>' + featureGML + '</feature:' +
            selectedItem_.geometry_name + '>';

        goog.array.forEach(properties, function(property, index) {
          if (property[1] === '') {
            property[1] = null;
          }
          if (properties[index][1] !== selectedItemProperties_[index][1]) {
            propertyXmlPartial += '<feature:' + property[0] + '>' + (property[1] === null ? '' : property[1]) +
                '</feature:' + property[0] + '>';
          }
        });
        issueWFSPost(wfsPostTypes_.INSERT, propertyXmlPartial, properties, coords, newPos).then(function(resolve) {
          deferredResponse.resolve(resolve);
        }, function(reject) {
          deferredResponse.reject(reject);
        });
      } else {
        service_.hide();
        deferredResponse.resolve();
      }
      var returnResponse = q_.defer();
      deferredResponse.promise.then(function(resolve) {
        enabled_ = true;
        rootScope_.$broadcast('endFeatureInsert', save);
        returnResponse.resolve(resolve);
      }, function(reject) {
        returnResponse.reject(reject);
      });
      return returnResponse.promise;
    };

    this.startGeometryEditing = function() {
      rootScope_.$broadcast('startGeometryEdit');
      var geometryType = selectedItem_.geometry.type;
      var index;
      var feature;
      var coords;
      var geometry;
      if (geometryType.search(/^Multi/g) > -1) {
        var originalCoords = mapService_.editLayer.getSource().getFeatures()[0].getGeometry().getCoordinates();
        mapService_.editLayer.getSource().clear();
        for (index = 0; index < originalCoords.length; index++) {
          feature = new ol.Feature();
          coords = [originalCoords[index]];
          geometry = transformGeometry({type: geometryType, coordinates: coords});
          feature.setGeometry(geometry);
          mapService_.editLayer.getSource().addFeature(feature);
        }
      } else if (geometryType.toLowerCase() == 'geometrycollection') {
        var geometries = mapService_.editLayer.getSource().getFeatures()[0].getGeometry().getGeometries();
        mapService_.editLayer.getSource().clear();
        for (index = 0; index < geometries.length; index++) {
          feature = new ol.Feature();
          geometry = transformGeometry({type: geometries[index].getType(),
            coordinates: geometries[index].getCoordinates()});
          feature.setGeometry(geometry);
          mapService_.editLayer.getSource().addFeature(feature);
        }
      }
      exclusiveModeService_.startExclusiveMode(translate_.instant('editing_geometry'),
          geometryType,
          exclusiveModeService_.button(translate_.instant('accept_feature'), function() {
            if (mapService_.editLayer.getSource().getFeatures().length < 1) {
              dialogService_.warn(translate_.instant('adding_feature'), translate_.instant('must_create_feature'),
                  [translate_.instant('btn_ok')], false);
            } else {
              exclusiveModeService_.isSaving = true;
              service_.endGeometryEditing(true).then(function(resolve) {
                exclusiveModeService_.endExclusiveMode();
                exclusiveModeService_.isSaving = false;
              }, function(reject) {
                exclusiveModeService_.isSaving = false;
                dialogService_.error(translate_.instant('error'), translate_.instant('unable_to_save_geometry',
                    {value: reject}), [translate_.instant('btn_ok')], false);
              });
            }
          }), exclusiveModeService_.button(translate_.instant('cancel_feature'), function() {
            service_.endGeometryEditing(false).then(function(resolve) {
              exclusiveModeService_.endExclusiveMode();
            });
          }), geometryType);
      mapService_.addSelect();
      mapService_.addModify();
      mapService_.selectFeature();
      enabled_ = false;
    };

    this.endGeometryEditing = function(save) {
      var deferredResponse = q_.defer();
      if (save) {
        // actually save the geom
        var feature;
        var geometry;
        var index;
        var geometryType = selectedItem_.geometry.type;
        if (geometryType.search(/^Multi/g) > -1) {
          feature = new ol.Feature();
          var coordinates = [];
          for (index = 0; index < mapService_.editLayer.getSource().getFeatures().length; index++) {
            var tempCoords = mapService_.editLayer.getSource().getFeatures()[index].getGeometry().getCoordinates();
            coordinates.push(tempCoords[0]);
          }
          geometry = transformGeometry({type: geometryType, coordinates: coordinates});
          feature.setGeometry(geometry);
          mapService_.editLayer.getSource().clear();
          mapService_.editLayer.getSource().addFeature(feature);
        } else if (geometryType.toLowerCase() == 'geometrycollection') {
          feature = new ol.Feature();
          var geometries = [];
          for (index = 0; index < mapService_.editLayer.getSource().getFeatures().length; index++) {
            geometries.push(mapService_.editLayer.getSource().getFeatures()[index].getGeometry());
          }
          geometry = transformGeometry({type: 'multigeometry', coordinates: geometries});
          feature.setGeometry(geometry);
          mapService_.editLayer.getSource().clear();
          mapService_.editLayer.getSource().addFeature(feature);
        } else {
          feature = mapService_.editLayer.getSource().getFeatures()[0];
        }
        // Feature was modified so we need to save the changes
        var featureGML = getGeometryGMLFromFeature(feature);
        // Finish constructing the partial that will be sent in the post request
        var partial = '<wfs:Property><wfs:Name>' + selectedItem_.geometry_name +
            '</wfs:Name><wfs:Value>' + featureGML + '</wfs:Value></wfs:Property>';
        // Transform the geometry so that we can get the new Decimal Degrees to display in the info-box
        var coords = null;
        var newPos;
        var transformedGeom;
        if (feature.getGeometry().getType().toLowerCase() == 'geometrycollection') {
          coords = feature.getGeometry().getGeometries();
          transformedGeom = transformGeometry({type: 'multigeometry', coordinates: coords},
              mapService_.map.getView().getProjection(), selectedLayer_.get('metadata').projection);
          coords = [];
          for (index = 0; index < transformedGeom.getGeometries().length; index++) {
            coords.push({coordinates: transformedGeom.getGeometries()[index].getCoordinates(),
              type: transformedGeom.getGeometries()[index].getType()});
          }
        } else {
          coords = feature.getGeometry().getCoordinates();
          transformedGeom = transformGeometry({type: feature.getGeometry().getType(), coordinates: coords},
              mapService_.map.getView().getProjection(), selectedLayer_.get('metadata').projection);
          coords = transformedGeom.getCoordinates();
        }
        newPos = getNewPositionFromGeometry(feature.getGeometry());
        // Issue the request
        issueWFSPost(wfsPostTypes_.UPDATE, partial, null, coords, newPos).then(function(resolve) {
          deferredResponse.resolve(resolve);
        }, function(reject) {
          deferredResponse.reject(reject);
        });
      } else {
        // discard changes
        mapService_.clearEditLayer();
        mapService_.addToEditLayer(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
        deferredResponse.resolve();
      }
      var returnResponse = q_.defer();
      deferredResponse.promise.then(function(resolve) {
        rootScope_.$broadcast('endGeometryEdit', save);
        mapService_.removeSelect();
        mapService_.removeModify();
        enabled_ = true;
        returnResponse.resolve(resolve);
      }, function(reject) {
        returnResponse.reject(reject);
      });

      // Enable DoubleClickZoom

      return returnResponse.promise;
    };

    this.startAttributeEditing = function(inserting) {
      rootScope_.$broadcast('startAttributeEdit', selectedItem_.geometry, selectedLayer_.get('metadata').projection,
          selectedItemProperties_, inserting);
    };

    this.endAttributeEditing = function(save, inserting, properties, coords) {
      //console.log('---- editFeatureDirective.saveEdits. feature: ', feature);
      var deferredResponse = q_.defer();
      if (inserting) {
        // create request
        service_.endFeatureInsert(save, properties, coords).then(function(resolve) {
          deferredResponse.resolve(resolve);
        }, function(reject) {
          deferredResponse.reject(reject);
        });
      } else if (save) {
        var propertyXmlPartial = '';
        goog.array.forEach(properties, function(property, index) {
          if (service_.isMediaPropertyName(property[0]) && goog.isObject(property[1])) {
            var newArray = [];
            forEachArrayish(property[1], function(photo) {
              newArray.push(photo);
            });
            var stringy = JSON.stringify(newArray);
            if (stringy !== selectedItemProperties_[index][1]) {
              propertyXmlPartial += '<wfs:Property><wfs:Name>' + property[0] +
                  '</wfs:Name><wfs:Value>' + (stringy === null ? '' : stringy) + '</wfs:Value></wfs:Property>';
            }
          } else {
            if (property[1] === '') {
              property[1] = null;
            }
            if (properties[index][1] !== selectedItemProperties_[index][1]) {
              propertyXmlPartial += '<wfs:Property><wfs:Name>' + property[0] +
                  '</wfs:Name><wfs:Value>' + (property[1] === null ? '' : property[1]) + '</wfs:Value></wfs:Property>';
            }
          }
        });
        var newPos = null;
        if (goog.isDefAndNotNull(coords)) {
          // Check if either of the coordinates we changed in the attribute editing process
          if ((coords[0] !== selectedItem_.geometry.coordinates[0]) ||
              (coords[1] !== selectedItem_.geometry.coordinates[1])) {
            // Transform the geometry so we can get the new place on the map to show the info-box
            var newGeom = transformGeometry({type: 'point', coordinates: coords},
                selectedLayer_.get('metadata').projection, mapService_.map.getView().getProjection());
            // We also need to update the vector feature so that it is in the new position
            var feature = mapService_.editLayer.getSource().getFeatures()[0];
            feature.setGeometry(newGeom);
            newPos = newGeom.getCoordinates();
            // Construct the property change to put in the partial to send in the post request
            var featureGML = '<gml:Point xmlns:gml="http://www.opengis.net/gml" srsName="' +
                mapService_.map.getView().getProjection().getCode() + '">' +
                '<gml:coordinates decimal="." cs="," ts=" ">' +
                newPos[0] + ',' + newPos[1] +
                '</gml:coordinates></gml:Point>';
            propertyXmlPartial += '<wfs:Property><wfs:Name>' + selectedItem_.geometry_name +
                '</wfs:Name><wfs:Value>' + featureGML + '</wfs:Value></wfs:Property>';
            var pan = ol.animation.pan({source: mapService_.map.getView().getCenter()});
            mapService_.map.beforeRender(pan);
            mapService_.map.getView().setCenter(newPos);
          }
        }

        if (propertyXmlPartial !== '') {
          issueWFSPost(wfsPostTypes_.UPDATE, propertyXmlPartial, properties, coords, newPos).then(function(resolve) {
            deferredResponse.resolve(resolve);
          }, function(reject) {
            deferredResponse.reject(reject);
          });
        } else {
          deferredResponse.resolve();
        }
      }
      var returnResponse = q_.defer();
      deferredResponse.promise.then(function(resolve) {
        rootScope_.$broadcast('endAttributeEdit', save);
        returnResponse.resolve(resolve);
      }, function(reject) {
        returnResponse.reject(reject);
      });
      return returnResponse.promise;
    };

    this.deleteFeature = function() {
      var deferredResponse = q_.defer();
      issueWFSPost(wfsPostTypes_.DELETE).then(function(resolve) {
        rootScope_.$broadcast('featureDeleted');
        deferredResponse.resolve(resolve);
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.getGeometryGML3FromFeature = getGeometryGML3FromFeature;
  });

  //-- Private functions

  function registerOnMapClick($rootScope, $compile) {
    mapService_.map.on('singleclick', function(evt) {
      if (enabled_) {
        //console.log('loomFeatureInfoBox.map.onclick. event ', evt);

        // Overlay clones the element so we need to compile it after it is cloned so that ng knows about it
        if (!goog.isDefAndNotNull(containerInstance_)) {
          containerInstance_ = mapService_.map.getOverlays().array_[0].getElement();
          $compile(containerInstance_)($rootScope);
        }

        service_.hide();

        var view = mapService_.map.getView();
        var layers = mapService_.getLayers(false, true);
        var validRequestCount = 0;
        var completedRequestCount = 0;

        var infoPerLayer = [];

        //we need to count the number of layers that support GetFeatureInfo
        //that way when the requests are processed we can keep track of when
        //all features are returned
        goog.array.forEach(layers, function(layer, index) {
          var source = layer.getSource();
          if (goog.isDefAndNotNull(source.getGetFeatureInfoUrl)) {
            validRequestCount++;
          }
        });

        //This function is called each time a get feature info request returns (call is made below).
        //when the completedRequestCount == validRequestCount, we can display the popup
        var getFeatureInfoCompleted = function() {
          completedRequestCount++;

          if (completedRequestCount === validRequestCount) {
            if (infoPerLayer.length > 0) {
              clickPosition_ = evt.coordinate;
              service_.show(infoPerLayer, evt.coordinate);
            }
          } else {
            service_.hide();
          }
        };


        //Get the feature info for each layer that supports it
        goog.array.forEach(layers, function(layer, index) {
          var source = layer.getSource();
          if (!goog.isDefAndNotNull(source.getGetFeatureInfoUrl)) {
            return;
          }
          var url = source.getGetFeatureInfoUrl(evt.coordinate, view.getResolution(), view.getProjection(),
              {
                'INFO_FORMAT': 'application/json',
                'FEATURE_COUNT': 5
              });

          httpService_.get(url).then(function(response) {
            var layerInfo = {};
            layerInfo.features = response.data.features;

            if (layerInfo.features && layerInfo.features.length > 0 && goog.isDefAndNotNull(layers[index])) {
              layerInfo.layer = layers[index];
              goog.array.insert(infoPerLayer, layerInfo);
            }

            //console.log('-- infoPerLayer: ', infoPerLayer);
            getFeatureInfoCompleted();
          }, function(reject) {
            getFeatureInfoCompleted();
            console.log('getFeatureInfo failed for layer: ', layer, ', reject response: ', reject);
          });
        });
      }
    });
  }

  function getItemType(item) {
    var type = '';

    if (goog.isDefAndNotNull(item)) {
      if (item.properties) {
        type = 'feature';
      } else if (item.features) {
        type = 'layer';
      } else if (item.length && item[0].features) {
        type = 'layers';
      }
    }

    return type;
  }

  function issueWFSPost(postType, partial, properties, coords, newPos) {
    var deferredResponse = q_.defer();
    var wfsRequestTypePartial;
    var commitMsg;
    if (postType === wfsPostTypes_.INSERT) {
      var featureType = selectedLayer_.get('metadata').name.split(':')[1];
      commitMsg = translate_.instant('added_1_feature', {'layer': selectedLayer_.get('metadata').nativeName});
      wfsRequestTypePartial = '<wfs:Insert handle="' + commitMsg +
          '"><feature:' + featureType + ' xmlns:feature="' + selectedLayer_.get('metadata').workspaceURL + '">' +
          partial + '</feature:' + featureType + '></wfs:Insert>';
      goog.array.forEach(properties, function(obj) {
        if (service_.isMediaPropertyName(obj[0]) && goog.isArray(obj[1])) {
          var newArray = [];
          forEachArrayish(obj[1], function(photo) {
            newArray.push(photo);
          });
          selectedItem_.properties[obj[0]] = JSON.stringify(newArray);
        } else {
          selectedItem_.properties[obj[0]] = obj[1];
        }
      });
    } else {
      var filter = '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
          '<ogc:FeatureId fid="' + selectedItem_.id + '" />' +
          '</ogc:Filter>';
      if (postType === wfsPostTypes_.DELETE) {
        commitMsg = translate_.instant('removed_1_feature', {'layer': selectedLayer_.get('metadata').nativeName});
        wfsRequestTypePartial = '<wfs:Delete handle="' + commitMsg +
            '" xmlns:feature="' + selectedLayer_.get('metadata').workspaceURL + '" typeName="' +
            selectedLayer_.get('metadata').name + '">' +
            filter + '</wfs:Delete>';
      } else if (postType === wfsPostTypes_.UPDATE) {
        commitMsg = translate_.instant('modified_1_feature', {'layer': selectedLayer_.get('metadata').nativeName});
        wfsRequestTypePartial = '<wfs:Update handle="' + commitMsg +
            '" xmlns:feature="' + selectedLayer_.get('metadata').workspaceURL + '" typeName="' +
            selectedLayer_.get('metadata').name + '">' +
            partial + filter +
            '</wfs:Update>';
        //properties will be null in the case of a geometry edit, so this needs to be handled
        if (goog.isDefAndNotNull(properties)) {
          goog.array.forEach(properties, function(obj) {
            if (service_.isMediaPropertyName(obj[0]) && goog.isArray(obj[1])) {
              var newArray = [];
              forEachArrayish(obj[1], function(photo) {
                newArray.push(photo);
              });
              selectedItem_.properties[obj[0]] = JSON.stringify(newArray);
            } else {
              selectedItem_.properties[obj[0]] = obj[1];
            }
          });
        }
      }
    }

    var wfsRequestData = '<?xml version="1.0" encoding="UTF-8"?> ' +
        '<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'service="WFS" version="1.0.0" ' +
        'handle="' + commitMsg + '" ' +
        'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/wfs.xsd"> ' +
        wfsRequestTypePartial +
        '</wfs:Transaction>';

    var url = selectedLayer_.get('metadata').url + '/wfs/WfsDispatcher';
    var layerName = selectedLayer_.get('metadata').uniqueID;
    httpService_.post(url, wfsRequestData).success(function(data, status, headers, config) {
      //console.log('====[ great success. ', data, status, headers, config);
      var x2js = new X2JS();
      var json = x2js.xml_str2json(data);
      if (goog.isDefAndNotNull(json.WFS_TransactionResponse) &&
          goog.isDefAndNotNull(json.WFS_TransactionResponse.TransactionResult.Status.SUCCESS)) {
        if (postType === wfsPostTypes_.INSERT) {
          selectedItem_.id = json.WFS_TransactionResponse.InsertResult.FeatureId._fid;
          //Does this really need to be set? it doesn't seemed to be used anywhere.
          selectedItem_.type = 'Feature';
        }
        if (goog.isDefAndNotNull(coords)) {
          if (selectedItem_.geometry.type.toLowerCase() == 'geometrycollection') {
            selectedItem_.geometry.geometries = coords;
          } else {
            selectedItem_.geometry.coordinates = coords;
          }
        }
        if (goog.isDefAndNotNull(newPos)) {
          service_.show(selectedItem_, newPos, true);
        } else {
          service_.show(selectedItem_, position_, true);
        }
        if (postType === wfsPostTypes_.DELETE) {
          service_.hide();
        }
        historyService_.refreshHistory(layerName);
        mapService_.dumpTileCache(layerName);
        deferredResponse.resolve();
      } else if (goog.isDefAndNotNull(json.ExceptionReport) &&
          goog.isDefAndNotNull(json.ExceptionReport.Exception) &&
          goog.isDefAndNotNull(json.ExceptionReport.Exception.ExceptionText)) {
        deferredResponse.reject(json.ExceptionReport.Exception.ExceptionText);
      } else if (goog.isDefAndNotNull(json.ServiceExceptionReport) &&
          goog.isDefAndNotNull(json.ServiceExceptionReport.ServiceException)) {
        deferredResponse.reject(json.ServiceExceptionReport.ServiceException);
      } else {
        console.log(json);
        deferredResponse.reject(translate_.instant('unknown_error'));
      }
    }).error(function(data, status, headers, config) {
      console.log('----[ ERROR: wfs-t post failed! ', data, status, headers, config);
      deferredResponse.reject(status);
    });
    return deferredResponse.promise;
  }

  function getNewPositionFromGeometry(geometry, clickPos) {
    if (!goog.isDefAndNotNull(clickPos)) {
      clickPos = ol.extent.getCenter(geometry.getExtent());
    }
    if (geometry.containsCoordinate(clickPos)) {
      return clickPos;
    }
    return geometry.getClosestPoint(clickPos);
  }

  function getGeometryGMLFromFeature(feature) {
    // TODO: Find a better way to write geometry to GML or a better way to parse it
    // Write the feature to GML
    /*var writer = new ol.parser.ogc.GML_v3({featureNS: selectedLayer_.get('metadata').workspace,
     featureType: selectedLayer_.get('metadata').nativeName});
     var featureGML = writer.write({features: [feature]},
     {srsName: mapService_.map.getView().getProjection().getCode()});
     // Parse out only the geometry
     var startIndex = featureGML.indexOf('<feature:geometry>');
     var endIndex = featureGML.indexOf('</feature:geometry');
     featureGML = featureGML.substring((startIndex + 18), endIndex);
     // Its missing the namespace for the gml geometry so we need to add that
     startIndex = featureGML.indexOf(' srsName=');
     var originalString = featureGML.substring(0, startIndex);
     var newString = originalString + ' xmlns:gml="http://www.opengis.net/gml"';
     featureGML = featureGML.replace(originalString, newString);
     return featureGML;*/
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
          mapService_.map.getView().getProjection().getCode() + '">';
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
            mapService_.map.getView().getProjection().getCode() + '">' +
            '<gml:coordinates decimal="." cs="," ts=" ">' +
            geometry.getCoordinates().toString() +
            '</gml:coordinates></gml:Point>';
      } else if (geometryType == 'linestring') {
        featureGML += '<gml:LineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">' +
            '<gml:coordinates decimal="." cs="," ts=" ">' + buildCoordString(geometry.getCoordinates().toString()) +
            '</gml:coordinates></gml:LineString>';
      } else if (geometryType == 'polygon') {
        featureGML += '<gml:Polygon xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">' +
            '<gml:outerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
            buildCoordString(geometry.getCoordinates()[0].toString()) + '</gml:coordinates>' +
            '</gml:LinearRing></gml:outerBoundaryIs>';
        for (index = 1; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:innerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[index].toString()) + '</gml:coordinates>' +
              '</gml:LinearRing></gml:innerBoundaryIs>';
        }
        featureGML += '</gml:Polygon>';
      } else if (geometryType == 'multipoint') {
        featureGML += '<gml:MultiPoint xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:pointMember><gml:Point><gml:coordinates decimal="." cs="," ts=" ">' +
              geometry.getCoordinates()[index].toString() +
              '</gml:coordinates></gml:Point></gml:pointMember>';
        }
        featureGML += '</gml:MultiPoint>';
      } else if (geometryType == 'multilinestring') {
        featureGML += '<gml:MultiLineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:lineMember><gml:LineString><gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[index].toString()) +
              '</gml:coordinates></gml:LineString></gml:lineMember>';
        }
        featureGML += '</gml:MultiLineString>';
      } else if (geometryType == 'multipolygon') {
        featureGML += '<gml:MultiPolygon xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:polygonMember><gml:Polygon>' +
              '<gml:outerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[index][0].toString()) + '</gml:coordinates>' +
              '</gml:LinearRing></gml:outerBoundaryIs>';
          for (var innerIndex = 1; innerIndex < geometry.getCoordinates()[index].length; innerIndex++) {
            featureGML += '<gml:innerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
                buildCoordString(geometry.getCoordinates()[index][innerIndex].toString()) + '</gml:coordinates>' +
                '</gml:LinearRing></gml:innerBoundaryIs>';
          }
          featureGML += '</gml:Polygon></gml:polygonMember>';
        }
        featureGML += '</gml:MultiPolygon>';
      }
      if (isGeometryCollection) {
        featureGML += '</gml:geometryMember>';
      }
    }
    if (isGeometryCollection) {
      featureGML += '</gml:MultiGeometry>';
    }
    return featureGML;
  }

  function getGeometryGML3FromFeature(feature) {
    // TODO: Copied from the above method, changing Polygon to Surface.
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
          mapService_.map.getView().getProjection().getCode() + '">';
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
            mapService_.map.getView().getProjection().getCode() + '">' +
            '<gml:coordinates decimal="." cs="," ts=" ">' +
            geometry.getCoordinates().toString() +
            '</gml:coordinates></gml:Point>';
      } else if (geometryType == 'linestring') {
        featureGML += '<gml:LineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">' +
            '<gml:coordinates decimal="." cs="," ts=" ">' + buildCoordString(geometry.getCoordinates().toString()) +
            '</gml:coordinates></gml:LineString>';
      } else if (geometryType == 'polygon') {
        featureGML += '<gml:Polygon xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">' +
            '<gml:outerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
            buildCoordString(geometry.getCoordinates()[0].toString()) + '</gml:coordinates>' +
            '</gml:LinearRing></gml:outerBoundaryIs>';
        for (index = 1; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:innerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[index].toString()) + '</gml:coordinates>' +
              '</gml:LinearRing></gml:innerBoundaryIs>';
        }
        featureGML += '</gml:Polygon>';
      } else if (geometryType == 'multipoint') {
        featureGML += '<gml:MultiPoint xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:pointMember><gml:Point><gml:coordinates decimal="." cs="," ts=" ">' +
              geometry.getCoordinates()[index].toString() +
              '</gml:coordinates></gml:Point></gml:pointMember>';
        }
        featureGML += '</gml:MultiPoint>';
      } else if (geometryType == 'multilinestring') {
        featureGML += '<gml:MultiLineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:lineMember><gml:LineString><gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[index].toString()) +
              '</gml:coordinates></gml:LineString></gml:lineMember>';
        }
        featureGML += '</gml:MultiLineString>';
      } else if (geometryType == 'multipolygon') {
        featureGML += '<gml:MultiSurface xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getProjection().getCode() + '">';
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
  }

}());
