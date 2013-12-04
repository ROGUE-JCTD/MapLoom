(function() {
  var module = angular.module('loom_feature_manager_service', []);

  //-- Private Variables
  var service_ = null;
  var mapService_ = null;
  var rootScope_ = null;
  var http_ = null;
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
  var enabled_ = true;

  module.provider('featureManagerService', function() {

    this.$get = function($rootScope, mapService, $compile, $http) {
      //console.log('---- featureInfoBoxService.get');
      rootScope_ = $rootScope;
      service_ = this;
      mapService_ = mapService;
      http_ = $http;
      registerOnMapClick($rootScope, $compile);

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
          mapService_.selectFeature(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
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

    this.startGeometryEditing = function() {
      $('#info-box').hide();
      rootScope_.$broadcast('startGeometryEdit');
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
          // Finish constructing the partial that will be sent in the post request
          var partial = '<wfs:Property><wfs:Name>' + selectedItem_.geometry_name +
              '</wfs:Name><wfs:Value>' + featureGML + '</wfs:Value></wfs:Property>';
          // Transform the geometry so that we can get the new Decimal Degrees to display in the info-box
          var transformedGeom = transformPoint(feature.getGeometry().getCoordinates(),
              mapService_.map.getView().getView2D().getProjection(), selectedLayer_.get('metadata').projection);
          // Issue the request
          issueWFSPost(partial, null, transformedGeom.getCoordinates(), feature.getGeometry().getCoordinates());
        }
      } else {
        // discard changes
        // TODO: Figure out how to use the original feature stored on a modified feature to reset
        mapService_.clearSelectedFeature();
        mapService_.selectFeature(selectedItem_.geometry, selectedLayer_.get('metadata').projection);
      }
      $('#info-box').show();
      rootScope_.$broadcast('endGeometryEdit', save);
      mapService_.map.removeInteraction(modify_);
      enabled_ = true;
    };

    this.startAttributeEditing = function() {
      rootScope_.$broadcast('startAttributeEdit', selectedItem_,
          selectedItemProperties_);
    };

    this.endAttributeEditing = function(properties, coords) {
      //console.log('---- editFeatureDirective.saveEdits. feature: ', feature);

      var propertyXmlPartial = '';
      goog.array.forEach(properties, function(property, index) {
        if (properties[index][1] !== selectedItemProperties_[index][1]) {
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
          var newGeom = transformPoint(coords, selectedLayer_.get('metadata').projection,
              mapService_.map.getView().getView2D().getProjection());
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
        }
      }

      if (propertyXmlPartial !== '') {
        issueWFSPost(propertyXmlPartial, properties, coords, newPos);
      }
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
              var layerInfo = JSON.parse(elm);

              if (layerInfo.features && layerInfo.features.length > 0) {
                layerInfo.layer = layers[index];
                goog.array.insert(infoPerLayer, layerInfo);
              }
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

  function issueWFSPost(partial, properties, coords, newPos) {
    var wfsRequestData = '<?xml version="1.0" encoding="UTF-8"?> ' +
        '<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'service="WFS" version="1.1.0" ' +
        'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd"> ' +
        '<wfs:Update xmlns:feature="http://www.geonode.org/" typeName="' +
        selectedLayer_.get('metadata').name + '">' +
        partial +
        '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
        '<ogc:FeatureId fid="' + selectedItem_.id + '" />' +
        '</ogc:Filter>' +
        '</wfs:Update>' +
        '</wfs:Transaction>';

    http_({
      url: '/geoserver/wfs/WfsDispatcher',
      method: 'POST',
      data: wfsRequestData
    }).success(function(data, status, headers, config) {
      //console.log('====[ great success. ', data, status, headers, config);
      if (goog.isDefAndNotNull(properties)) {
        selectedItemProperties_ = properties;
      }
      if (goog.isDefAndNotNull(coords)) {
        selectedItem_.geometry.coordinates = coords;
        if (goog.isDefAndNotNull(newPos)) {
          service_.show(selectedItem_, newPos);
        }
      }
      mapService_.dumpTileCache();
    }).error(function(data, status, headers, config) {
      console.log('----[ ERROR: wfs-t post failed! ', data, status, headers, config);
    });
  }

  function transformPoint(coords, crsFrom, crsTo) {
    var newGeom = new ol.geom.Point(goog.array.clone(coords));
    var transform = ol.proj.getTransform(crsFrom, crsTo);
    newGeom.transform(transform);
    return newGeom;
  }
}());
