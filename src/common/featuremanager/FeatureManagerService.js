(function() {
  var module = angular.module('loom_feature_manager_service', []);

  //-- Private Variables
  var service_ = null;
  var mapService_ = null;
  var rootScope_ = null;
  var translate_ = null;
  var http_ = null;
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
  var modify_ = null;
  var draw_ = null;
  var enabled_ = true;
  var wfsPostTypes_ = { UPDATE: 0, INSERT: 1, DELETE: 2 };

  module.provider('featureManagerService', function() {

    this.$get = function($rootScope, $translate, mapService, $compile, $http, exclusiveModeService, dialogService) {
      //console.log('---- featureInfoBoxService.get');
      rootScope_ = $rootScope;
      service_ = this;
      mapService_ = mapService;
      translate_ = $translate;
      http_ = $http;
      exclusiveModeService_ = exclusiveModeService;
      dialogService_ = dialogService;
      registerOnMapClick($rootScope, $compile);

      mapService_.editLayer.on(ol.layer.VectorEventType.ADD, function() {
        if (exclusiveModeService_.isEnabled()) {
          mapService_.map.removeInteraction(draw_);
          mapService_.selectFeature(mapService_.editLayer.getFeatures()[0]);
          modify_ = new ol.interaction.Modify();
          mapService_.map.addInteraction(modify_);
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
      mapService_.clearSelectedFeature();
    };

    /**
     * item: can be a feature, a layer containing fe
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
            goog.isDefAndNotNull(selectedItem_.properties.fotos)) {

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
          mapService_.selectFromGeom(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
        } else {
          mapService_.clearSelectedFeature();
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
      exclusiveModeService_.startExclusiveMode(translate_('drawing_geometry'),
          exclusiveModeService_.button(translate_('done_btn'), function() {
            if (mapService_.editLayer.getFeatures().length < 1) {
              dialogService_.warn(translate_('adding_feature'), translate_('must_create_feature'),
                  [translate_('ok_btn')], false).then(function(button) {
                switch (button) {
                  case 0:
                    break;
                }
              });
            } else {
              var feature = mapService_.editLayer.getFeatures()[0];
              selectedItem_.geometry.coordinates = feature.getGeometry().getCoordinates();
              var newGeom = transformGeometry(selectedItem_.geometry,
                  mapService_.map.getView().getView2D().getProjection(), selectedLayer_.get('metadata').projection);
              selectedItem_.geometry.coordinates = newGeom.getCoordinates();
              service_.startAttributeEditing(true);
            }
          }), exclusiveModeService_.button(translate_('cancel_btn'), function() {
            service_.endFeatureInsert(false);
          }));
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
      selectedItemProperties_ = props;
      selectedLayer_ = layer;
      geometryType = geometryType.split(':')[1].replace('PropertyType', '').toLowerCase();
      selectedItem_ = {geometry: {type: geometryType}, geometry_name: geometryName, properties: {}};
      mapService_.map.addLayer(mapService_.editLayer);
      draw_ = new ol.interaction.Draw({layer: mapService_.editLayer, type: geometryType});
      mapService_.map.addInteraction(draw_);
      rootScope_.$broadcast('startFeatureInsert');
    };

    this.endFeatureInsert = function(save, properties, coords) {
      exclusiveModeService_.endExclusiveMode();
      if (save) {
        var propertyXmlPartial = '';
        var featureGML = '';
        var newPos;
        var feature = mapService_.editLayer.getFeatures()[0];
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
            mapService_.selectFromGeom(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
          }
        } else {
          featureGML = getGeometryGMLFromFeature(feature);
          if (feature.getGeometry().getType() == 'multilinestring') {
            newPos = feature.getGeometry().getComponents()[0].getCoordinates();
            newPos = newPos[Math.floor(newPos.length / 2)];
          } else if (feature.getGeometry().getType() == 'multipolygon') {
            newPos = feature.getGeometry().getComponents()[0].getRings()[0].getCoordinates()[0];
          }
          mapService_.selectFromGeom(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
        }
        propertyXmlPartial += '<feature:' + selectedItem_.geometry_name + '>' + featureGML + '</feature:' +
            selectedItem_.geometry_name + '>';

        goog.array.forEach(properties, function(property, index) {
          if (properties[index][1] !== selectedItemProperties_[index][1] && property[1] !== '') {
            propertyXmlPartial += '<feature:' + property[0] + '>' + property[1] + '</feature:' + property[0] + '>';
          }
        });
        issueWFSPost(wfsPostTypes_.INSERT, propertyXmlPartial, properties, coords, newPos);
      } else {
        mapService_.map.removeInteraction(draw_);
        service_.hide();
      }
      mapService_.map.removeInteraction(modify_);
      enabled_ = true;
      rootScope_.$broadcast('endFeatureInsert', save);
    };

    this.startGeometryEditing = function() {
      rootScope_.$broadcast('startGeometryEdit');
      exclusiveModeService_.startExclusiveMode(translate_('editing_geometry'),
          exclusiveModeService_.button(translate_('save_btn'), function() {
            exclusiveModeService_.endExclusiveMode();
            service_.endGeometryEditing(true);
          }), exclusiveModeService_.button(translate_('cancel_btn'), function() {
            exclusiveModeService_.endExclusiveMode();
            service_.endGeometryEditing(false);
          }));
      modify_ = new ol.interaction.Modify();
      mapService_.map.addInteraction(modify_);
      enabled_ = false;
    };

    this.endGeometryEditing = function(save) {
      if (save) {
        // actually save the geom
        var feature = mapService_.editLayer.getFeatures()[0];
        if (feature.original_) {
          // Feature was modified so we need to save the changes
          var featureGML = getGeometryGMLFromFeature(feature);
          // Finish constructing the partial that will be sent in the post request
          var partial = '<wfs:Property><wfs:Name>' + selectedItem_.geometry_name +
              '</wfs:Name><wfs:Value>' + featureGML + '</wfs:Value></wfs:Property>';
          // Transform the geometry so that we can get the new Decimal Degrees to display in the info-box
          var coords = null;
          var newPos = null;
          if (feature.getGeometry().getType() == 'point') {
            coords = feature.getGeometry().getCoordinates();
            var transformedGeom = transformGeometry({type: 'point', coordinates: coords},
                mapService_.map.getView().getView2D().getProjection(), selectedLayer_.get('metadata').projection);
            coords = transformedGeom.getCoordinates();
            newPos = feature.getGeometry().getCoordinates();
          } else if (feature.getGeometry().getType() == 'multilinestring') {
            newPos = feature.getGeometry().getComponents()[0].getCoordinates();
            newPos = newPos[Math.floor(newPos.length / 2)];
          } else if (feature.getGeometry().getType() == 'multipolygon') {
            newPos = feature.getGeometry().getComponents()[0].getRings()[0].getCoordinates()[0];
          }
          // Issue the request
          issueWFSPost(wfsPostTypes_.UPDATE, partial, null, coords, newPos);
        }
      } else {
        // discard changes
        // TODO: Figure out how to use the original feature stored on a modified feature to reset
        mapService_.clearSelectedFeature();
        mapService_.selectFromGeom(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
      }
      rootScope_.$broadcast('endGeometryEdit', save);
      mapService_.map.removeInteraction(modify_);
      enabled_ = true;
    };

    this.startAttributeEditing = function(inserting) {
      rootScope_.$broadcast('startAttributeEdit', selectedItem_.geometry,
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
          if (properties[index][1] !== selectedItemProperties_[index][1] && property[1] !== '') {
            propertyXmlPartial += '<wfs:Property><wfs:Name>' + property[0] +
                '</wfs:Name><wfs:Value>' + property[1] + '</wfs:Value></wfs:Property>';
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
            var feature = mapService_.editLayer.getFeatures()[0];
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

        var layers = mapService_.getFeatureLayers();

        mapService_.map.getFeatureInfo({
          pixel: evt.getPixel(),
          layers: layers,
          success: function(featureInfoByLayer) {
            //console.log('loomFeatureInfoBox.map.getFeatureInfo.success', featureInfoByLayer);

            var infoPerLayer = [];

            featureInfoByLayer.forEach(function(elm, index) {
              try {
                var layerInfo = JSON.parse(elm);

                if (layerInfo.features && layerInfo.features.length > 0 && goog.isDefAndNotNull(layers[index])) {
                  layerInfo.layer = layers[index];
                  goog.array.insert(infoPerLayer, layerInfo);
                }
              } catch (e) {}
            });
            //console.log('-- infoPerLayer: ', infoPerLayer);

            if (infoPerLayer.length > 0) {
              service_.show(infoPerLayer, evt.getCoordinate());
            } else {
              service_.hide();
            }

            // since setMode changes variables in service potentially used by directives,
            // trigger any watches so that they can update
            rootScope_.$broadcast('feature-info-click');
          },
          error: function() {
            console.log('====[ ERROR: loomFeatureInfoBox.map.getFeatureInfo.error');
            throw ({
              name: 'featureInfoBox',
              level: 'High',
              message: 'map.getFeatureInfo failed!',
              toString: function() {
                return this.name + ': ' + this.message;
              }
            });
          }
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
      commitMsg = '{&quot;' + selectedLayer_.get('metadata').nativeName + '&quot;:{&quot;added&quot;:1}}';
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
        commitMsg = '{&quot;' + selectedLayer_.get('metadata').nativeName + '&quot;:{&quot;removed&quot;:1}}';
        wfsRequestTypePartial = '<wfs:Delete handle="' + commitMsg +
            '" xmlns:feature="http://www.geonode.org/" typeName="' +
            selectedLayer_.get('metadata').name + '">' +
            filter + '</wfs:Delete>';
      } else if (postType === wfsPostTypes_.UPDATE) {
        commitMsg = '{&quot;' + selectedLayer_.get('metadata').nativeName + '&quot;:{&quot;modified&quot;:1}}';
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
        'service="WFS" version="1.1.0" ' +
        'handle="' + commitMsg + '" ' +
        'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd"> ' +
        wfsRequestTypePartial +
        '</wfs:Transaction>';

    var url = selectedLayer_.get('metadata').url + '/wfs/WfsDispatcher';
    http_.post(url, wfsRequestData).success(function(data, status, headers, config) {
      //console.log('====[ great success. ', data, status, headers, config);
      if (postType === wfsPostTypes_.INSERT) {
        var x2js = new X2JS();
        var json = x2js.xml_str2json(data);
        selectedItem_.id = json.TransactionResponse.InsertResults.Feature.FeatureId._fid;
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
      mapService_.dumpTileCache();
    }).error(function(data, status, headers, config) {
      console.log('----[ ERROR: wfs-t post failed! ', data, status, headers, config);
    });
  }

  function getGeometryGMLFromFeature(feature) {
    // TODO: Find a better way to write geometry to GML or a better way to parse it
    // Write the feature to GML
    var writer = new ol.parser.ogc.GML_v3({featureNS: selectedLayer_.get('metadata').workspace,
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
    return featureGML;
  }

}());
