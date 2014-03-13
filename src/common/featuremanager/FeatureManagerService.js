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
  var state_ = '';                 // valid values: 'layers', 'layer', 'feature', or ''
  var selectedItem_ = null;
  var selectedItemPics_ = null;
  var selectedItemProperties_ = null;
  var selectedLayer_ = null;
  var featureInfoPerLayer_ = [];
  var containerInstance_ = null;
  var overlay_ = null;
  var position_ = null;
  var clickPosition_ = null;
  var enabled_ = true;
  var wfsPostTypes_ = { UPDATE: 0, INSERT: 1, DELETE: 2 };

  module.provider('featureManagerService', function() {

    this.$get = function($rootScope, $translate, mapService, $compile, $http, exclusiveModeService, dialogService,
                         historyService) {
      //console.log('---- featureInfoBoxService.get');
      rootScope_ = $rootScope;
      service_ = this;
      mapService_ = mapService;
      historyService_ = historyService;
      translate_ = $translate;
      httpService_ = $http;
      exclusiveModeService_ = exclusiveModeService;
      dialogService_ = dialogService;
      registerOnMapClick($rootScope, $compile);

      mapService_.editLayer.getSource().on(ol.source.VectorEventType.ADDFEATURE, function(event) {
        if (exclusiveModeService_.isEnabled()) {
          exclusiveModeService_.addMode = false;
          mapService_.removeDraw();
          mapService_.addSelect();
          mapService_.addModify();
        }
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

    this.getSelectedItemPics = function() {
      return selectedItemPics_;
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
      selectedItemPics_ = null;
      selectedItemProperties_ = null;
      state_ = null;
      featureInfoPerLayer_ = [];
      mapService_.clearEditLayer();
    };

    /**
     * item: can be a feature, a layer containing features, or a collection of layers
     */
    // layers, layer, feature
    this.show = function(item, position) {
      //console.log('---- show: ', item);

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
          featureInfoPerLayer_.push({features: [item]});
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
      if (selectedItem_ !== selectedItemOld) {

        // -- update the selectedItemPics_
        var pics = null;

        if (getItemType(selectedItem_) === 'feature' &&
            goog.isDefAndNotNull(selectedItem_) &&
            goog.isDefAndNotNull(selectedItem_.properties) &&
            goog.isDefAndNotNull(selectedItem_.properties.fotos) &&
            selectedItem_.properties.fotos !== '') {

          pics = JSON.parse(selectedItem_.properties.fotos);

          if (goog.isDefAndNotNull(pics) &&
              pics.length === 0) {
            pics = null;
          }
        }

        selectedItemPics_ = pics;

        if (selectedItemPics_ !== null) {
          goog.array.forEach(selectedItemPics_, function(item, index) {
            selectedItemPics_[index] = '/file-service/' + item;
          });

          //console.log('selectedItemPics_: ', selectedItemPics_);
        }


        // -- update the selectedItemProperties_
        var props = null;

        if (getItemType(selectedItem_) === 'feature') {
          props = [];
          goog.object.forEach(selectedItem_.properties, function(v, k) {
            if (k !== 'fotos' && k !== 'photos') {
              props.push([k, v]);
            }
          });
        }

        // -- select the geometry if it is a feature, clear otherwise
        // -- store the selected layer of the feature
        if (getItemType(selectedItem_) === 'feature') {
          selectedLayer_ = this.getSelectedItemLayer().layer;
          mapService_.addToEditLayer(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
          position = getNewPositionFromGeometry(mapService_.editLayer.getSource().getFeatures()[0].getGeometry(),
              clickPosition_);
        } else {
          mapService_.clearEditLayer();
        }

        selectedItemProperties_ = props;
        //console.log('---- selectedItemProperties_: ', selectedItemProperties_);
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

    this.showPics = function(activeIndex) {
      if (goog.isDefAndNotNull(selectedItemPics_)) {
        // use the gallery controls
        $('#blueimp-gallery').toggleClass('blueimp-gallery-controls', true);

        var options = {
          useBootstrapModal: false
        };

        if (goog.isDefAndNotNull(activeIndex)) {
          options.index = activeIndex;
        }

        blueimp.Gallery(selectedItemPics_, options);
      }
    };

    this.startFeatureInsert = function(layer) {
      // TODO: Find a better way to handle this
      service_.hide();
      enabled_ = false;
      var props = [];
      var geometryType = '';
      var geometryName = '';
      goog.object.forEach(layer.get('metadata').schema, function(v, k) {
        if (k !== 'fotos' && k !== 'photos') {
          if (v._type.search('gml:') == -1) {
            props.push([k, null]);
          } else {
            geometryName = k;
            geometryType = v._type;
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
      exclusiveModeService_.startExclusiveMode(translate_('drawing_geometry'),
          exclusiveModeService_.button(translate_('accept_feature'), function() {
            if (mapService_.editLayer.getSource().getFeatures().length < 1) {
              dialogService_.warn(translate_('adding_feature'), translate_('must_create_feature'),
                  [translate_('btn_ok')], false);
            } else {
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
                    mapService_.map.getView().getView2D().getProjection(), selectedLayer_.get('metadata').projection);
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
                    mapService_.map.getView().getView2D().getProjection(), selectedLayer_.get('metadata').projection);
                setupGeometryArray(newGeom);
              }
              service_.startAttributeEditing(true);
            }
          }), exclusiveModeService_.button(translate_('cancel_feature'), function() {
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
        console.log(geometryType);
        mapService_.addDraw(geometryType);
      }
      rootScope_.$broadcast('startFeatureInsert');
    };

    this.endFeatureInsert = function(save, properties, coords) {
      exclusiveModeService_.endExclusiveMode();
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
                selectedLayer_.get('metadata').projection, mapService_.map.getView().getView2D().getProjection());
            // We also need to update the vector feature so that it is in the new position
            feature.setGeometry(newGeom);
            newPos = newGeom.getCoordinates();
            // Construct the property change to put in the partial to send in the post request
            featureGML = '<gml:Point xmlns:gml="http://www.opengis.net/gml" srsName="' +
                mapService_.map.getView().getView2D().getProjection().getCode() + '"><gml:pos>' +
                newPos[0] + ' ' + newPos[1] + '</gml:pos></gml:Point>';
            var pan = ol.animation.pan({source: mapService_.map.getView().getView2D().getCenter()});
            mapService_.map.beforeRender(pan);
            mapService_.map.getView().getView2D().setCenter(newPos);
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
        issueWFSPost(wfsPostTypes_.INSERT, propertyXmlPartial, properties, coords, newPos);
      } else {
        service_.hide();
      }
      enabled_ = true;
      rootScope_.$broadcast('endFeatureInsert', save);
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
      exclusiveModeService_.startExclusiveMode(translate_('editing_geometry'),
          exclusiveModeService_.button(translate_('accept_feature'), function() {
            if (mapService_.editLayer.getSource().getFeatures().length < 1) {
              dialogService_.warn(translate_('adding_feature'), translate_('must_create_feature'),
                  [translate_('btn_ok')], false);
            } else {
              exclusiveModeService_.endExclusiveMode();
              service_.endGeometryEditing(true);
            }
          }), exclusiveModeService_.button(translate_('cancel_feature'), function() {
            exclusiveModeService_.endExclusiveMode();
            service_.endGeometryEditing(false);
          }), geometryType);
      mapService_.addSelect();
      mapService_.addModify();
      enabled_ = false;
    };

    this.endGeometryEditing = function(save) {
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
        if (feature.getGeometry().getType().toLowerCase() == 'point') {
          coords = feature.getGeometry().getCoordinates();
          var transformedGeom = transformGeometry({type: 'point', coordinates: coords},
              mapService_.map.getView().getView2D().getProjection(), selectedLayer_.get('metadata').projection);
          coords = transformedGeom.getCoordinates();
        }
        newPos = getNewPositionFromGeometry(feature.getGeometry());
        // Issue the request
        issueWFSPost(wfsPostTypes_.UPDATE, partial, null, coords, newPos);
      } else {
        // discard changes
        mapService_.clearEditLayer();
        mapService_.addToEditLayer(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
      }
      rootScope_.$broadcast('endGeometryEdit', save);
      mapService_.removeSelect();
      mapService_.removeModify();
      enabled_ = true;
    };

    this.startAttributeEditing = function(inserting) {
      rootScope_.$broadcast('startAttributeEdit', selectedItem_.geometry, selectedLayer_.get('metadata').projection,
          selectedItemProperties_, inserting);
    };

    this.endAttributeEditing = function(save, inserting, properties, coords) {
      //console.log('---- editFeatureDirective.saveEdits. feature: ', feature);
      if (inserting) {
        // create request
        service_.endFeatureInsert(save, properties, coords);
      } else if (save) {
        var propertyXmlPartial = '';
        goog.array.forEach(properties, function(property, index) {
          if (property[1] === '') {
            property[1] = null;
          }
          if (properties[index][1] !== selectedItemProperties_[index][1]) {
            propertyXmlPartial += '<wfs:Property><wfs:Name>' + property[0] +
                '</wfs:Name><wfs:Value>' + (property[1] === null ? '' : property[1]) + '</wfs:Value></wfs:Property>';
          }
        });
        var newPos = null;
        if (goog.isDefAndNotNull(coords)) {
          // Check if either of the coordinates we changed in the attribute editing process
          if ((coords[0] !== selectedItem_.geometry.coordinates[0]) ||
              (coords[1] !== selectedItem_.geometry.coordinates[1])) {
            // Transform the geometry so we can get the new place on the map to show the info-box
            var newGeom = transformGeometry({type: 'point', coordinates: coords},
                selectedLayer_.get('metadata').projection, mapService_.map.getView().getView2D().getProjection());
            // We also need to update the vector feature so that it is in the new position
            var feature = mapService_.editLayer.getSource().getFeatures()[0];
            feature.setGeometry(newGeom);
            newPos = newGeom.getCoordinates();
            // Construct the property change to put in the partial to send in the post request
            var featureGML = '<gml:Point xmlns:gml="http://www.opengis.net/gml" srsName="' +
                mapService_.map.getView().getView2D().getProjection().getCode() + '"><gml:pos>' +
                newPos[0] + ' ' + newPos[1] + '</gml:pos></gml:Point>';
            propertyXmlPartial += '<wfs:Property><wfs:Name>' + selectedItem_.geometry_name +
                '</wfs:Name><wfs:Value>' + featureGML + '</wfs:Value></wfs:Property>';
            var pan = ol.animation.pan({source: mapService_.map.getView().getView2D().getCenter()});
            mapService_.map.beforeRender(pan);
            mapService_.map.getView().getView2D().setCenter(newPos);
          }
        }

        if (propertyXmlPartial !== '') {
          issueWFSPost(wfsPostTypes_.UPDATE, propertyXmlPartial, properties, coords, newPos);
        }
      }
      rootScope_.$broadcast('endAttributeEdit', save);
    };

    this.deleteFeature = function() {
      issueWFSPost(wfsPostTypes_.DELETE);
      rootScope_.$broadcast('featureDeleted');
    };
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

        var view = mapService_.map.getView().getView2D();
        var layers = mapService_.getLayers();
        var completed = 0;

        var infoPerLayer = [];

        // wait for all get feature infos to retun before proceeding.
        var getFeatureInfoCompleted = function() {
          completed += 1;

          if (completed === layers.length) {
            if (infoPerLayer.length > 0) {
              clickPosition_ = evt.coordinate;
              service_.show(infoPerLayer, evt.coordinate);
            }
          } else {
            service_.hide();
          }
        };

        goog.array.forEach(layers, function(layer, index) {
          var source = layer.getSource();
          var url = source.getGetFeatureInfoUrl(evt.coordinate, view.getResolution(), view.getProjection(),
              {
                'INFO_FORMAT': 'application/json',
                'FEATURE_COUNT': 5
              });

          //console.log('___ url: ', url);

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
    var wfsRequestTypePartial;
    var commitMsg;
    if (postType === wfsPostTypes_.INSERT) {
      var featureType = selectedLayer_.get('metadata').name.split(':')[1];
      commitMsg = translate_('added_1_feature', {'layer': selectedLayer_.get('metadata').nativeName});
      wfsRequestTypePartial = '<wfs:Insert handle="' + commitMsg +
          '"><feature:' + featureType + ' xmlns:feature="http://www.geonode.org/">' +
          partial + '</feature:' + featureType + '></wfs:Insert>';
      goog.array.forEach(properties, function(obj) {
        if (obj[0] !== 'fotos' && obj[0] !== 'photos') {
          selectedItem_.properties[obj[0]] = obj[1];
        }
      });
    } else {
      var filter = '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
          '<ogc:FeatureId fid="' + selectedItem_.id + '" />' +
          '</ogc:Filter>';
      if (postType === wfsPostTypes_.DELETE) {
        commitMsg = translate_('removed_1_feature', {'layer': selectedLayer_.get('metadata').nativeName});
        wfsRequestTypePartial = '<wfs:Delete handle="' + commitMsg +
            '" xmlns:feature="http://www.geonode.org/" typeName="' +
            selectedLayer_.get('metadata').name + '">' +
            filter + '</wfs:Delete>';
      } else if (postType === wfsPostTypes_.UPDATE) {
        commitMsg = translate_('modified_1_feature', {'layer': selectedLayer_.get('metadata').nativeName});
        wfsRequestTypePartial = '<wfs:Update handle="' + commitMsg +
            '" xmlns:feature="http://www.geonode.org/" typeName="' +
            selectedLayer_.get('metadata').name + '">' +
            partial + filter +
            '</wfs:Update>';
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
      if (postType === wfsPostTypes_.INSERT) {
        var x2js = new X2JS();
        var json = x2js.xml_str2json(data);
        selectedItem_.id = json.WFS_TransactionResponse.InsertResult.FeatureId._fid;
        selectedItem_.type = 'Feature';
      }
      if (goog.isDefAndNotNull(properties)) {
        selectedItemProperties_ = properties;
      }
      if (goog.isDefAndNotNull(coords)) {
        selectedItem_.geometry.coordinates = coords;
      }
      if (goog.isDefAndNotNull(newPos)) {
        service_.show(selectedItem_, newPos);
      }
      if (postType === wfsPostTypes_.DELETE) {
        service_.hide();
      }
      historyService_.refreshHistory(layerName);
      mapService_.dumpTileCache(layerName);
    }).error(function(data, status, headers, config) {
      console.log('----[ ERROR: wfs-t post failed! ', data, status, headers, config);
    });
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
     {srsName: mapService_.map.getView().getView2D().getProjection().getCode()});
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
          mapService_.map.getView().getView2D().getProjection().getCode() + '">';
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
            mapService_.map.getView().getView2D().getProjection().getCode() + '">' +
            '<gml:coordinates decimal="." cs="," ts=" ">' +
            geometry.getCoordinates().toString() +
            '</gml:coordinates></gml:Point>';
      } else if (geometryType == 'linestring') {
        featureGML += '<gml:LineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getView2D().getProjection().getCode() + '">' +
            '<gml:coordinates decimal="." cs="," ts=" ">' + buildCoordString(geometry.getCoordinates().toString()) +
            '</gml:coordinates></gml:LineString>';
      } else if (geometryType == 'polygon') {
        for (var coordIndex = 0; coordIndex < geometry.getCoordinates().length; coordIndex++) {}
        featureGML += '<gml:Polygon xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getView2D().getProjection().getCode() + '">' +
            '<gml:outerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
            buildCoordString(geometry.getCoordinates().toString()) + '</gml:coordinates>' +
            '</gml:LinearRing></gml:outerBoundaryIs></gml:Polygon>';
      } else if (geometryType == 'multipoint') {
        featureGML += '<gml:MultiPoint xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getView2D().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:pointMember><gml:Point><gml:coordinates decimal="." cs="," ts=" ">' +
              geometry.getCoordinates()[index].toString() +
              '</gml:coordinates></gml:Point></gml:pointMember>';
        }
        featureGML += '</gml:MultiPoint>';
      } else if (geometryType == 'multilinestring') {
        featureGML += '<gml:MultiLineString xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getView2D().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:lineMember><gml:LineString>' + '<gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[index].toString()) +
              '</gml:coordinates></gml:LineString></gml:lineMember>';
        }
        featureGML += '</gml:MultiLineString>';
      } else if (geometryType == 'multipolygon') {
        featureGML += '<gml:MultiPolygon xmlns:gml="http://www.opengis.net/gml" srsName="' +
            mapService_.map.getView().getView2D().getProjection().getCode() + '">';
        for (index = 0; index < geometry.getCoordinates().length; index++) {
          featureGML += '<gml:polygonMember><gml:Polygon>' +
              '<gml:outerBoundaryIs><gml:LinearRing><gml:coordinates decimal="." cs="," ts=" ">' +
              buildCoordString(geometry.getCoordinates()[index].toString()) + '</gml:coordinates>' +
              '</gml:LinearRing></gml:outerBoundaryIs></gml:Polygon></gml:polygonMember>';
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

}());
