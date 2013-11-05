(function() {
  var module = angular.module('loom_feature_info_box_service', []);

  //-- Private Variables
  var service_ = null;
  var mapService_ = null;
  var rootScope_ = null;
  var state_ = '';                 // valid values: 'layers', 'layer', 'feature', or ''
  var selectedItem_ = null;
  var selectedItemPics_ = null;
  var selectedItemProperties_ = null;
  var featureInfoPerLayer_ = [];
  var containerInstance_ = null;
  var overlay_ = null;
  var position_ = null;

  module.provider('featureInfoBoxService', function() {

    this.$get = function($rootScope, mapService, $compile) {
      //console.log('---- featureInfoBoxService.get');
      rootScope_ = $rootScope;
      service_ = this;
      mapService_ = mapService;
      registerOnMapClick($rootScope, $compile);

      overlay_ = new ol.Overlay({
        element: document.getElementById('info-box'),
        stopEvent: true
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

    this.getPosition = function() {
      return position_;
    };

    this.hide = function() {
      selectedItem_ = null;
      selectedItemPics_ = null;
      selectedItemProperties_ = null;
      state_ = null;
      featureInfoPerLayer_ = [];
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

        selectedItemProperties_ = props;
        //console.log('---- selectedItemProperties_: ', selectedItemProperties_);
      }

      if (goog.isDefAndNotNull(position)) {
        position_ = position;
        mapService_.map.getOverlays().array_[0].setPosition(position);
      }
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
        var layer = null;

        for (var i = 0; i < featureInfoPerLayer_.length; i++) {
          for (var j = 0; j < featureInfoPerLayer_[i].features.length; j++) {
            if (featureInfoPerLayer_[i].features[j] === selectedItem_) {
              layer = featureInfoPerLayer_[i];
              break;
            }
          }

          if (layer !== null) {
            break;
          }
        }

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

  });

  //-- Private functions

  function registerOnMapClick($rootScope, $compile) {
    mapService_.map.on('click', function(evt) {
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
}());
