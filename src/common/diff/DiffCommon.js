var DiffColorMap = {
  ADDED: {
    fill: [0, 255, 0],
    stroke: [0, 102, 0]
  },
  REMOVED: {
    fill: [255, 0, 0],
    stroke: [102, 0, 0]
  },
  MODIFIED: {
    fill: [255, 255, 0],
    stroke: [102, 102, 0]
  },
  CONFLICT: {
    fill: [248, 117, 49],
    stroke: [150, 69, 20]
  },
  MERGED: {
    fill: [0, 0, 255],
    stroke: [0, 0, 102]
  },
  NO_CHANGE: {
    fill: [255, 255, 255],
    stroke: [102, 102, 102]
  }
};

var FeaturePanel = function() {
  this.map = null;
  this.featureLayer = null;
  this.attributes = [];
  this.bounds = null;
  this.active = false;
  this.geometry = null;
  this.olFeature = null;
  this.showAuthors = false;

  this.clearFeature = function() {
    this.attributes = [];
    this.bounds = null;
    this.active = false;
    this.geometry = null;
    this.olFeature = null;
    this.featureLayer.getSource().clear();
  };

  this.getGeometry = function() {
    if (goog.isDefAndNotNull(this.geometry)) {
      return goog.isDefAndNotNull(this.geometry.newvalue) ? this.geometry.newvalue : this.geometry.oldvalue;
    }
    return null;
  };

  this.replaceLayers = function(newLayers) {
    var featurePanel = this;
    var layers = this.map.getLayers();
    layers.forEach(function(layer) {
      featurePanel.map.removeLayer(layer);
    });
    newLayers.forEach(function(layer) {
      if (!goog.isDefAndNotNull(layer.get('metadata').internalLayer) || !layer.get('metadata').internalLayer) {
        featurePanel.map.addLayer(layer);
      }
    });
    this.map.addLayer(this.featureLayer);
  };
};

function makeFeatureLayer() {
  var featureStyle = (function() {
    return function(feature) {
      var styles = {};
      var change = $.extend(true, [], feature.get('MapLoomChange'));
      change.fill.push(1);
      change.stroke.push(1);
      styles['Polygon'] = [
        new ol.style.Style({
          fill: new ol.style.Fill({
            color: change.fill
          })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: change.stroke
          })
        })
      ];
      styles['MultiPolygon'] = styles['Polygon'];

      styles['LineString'] = [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: change.stroke,
            width: 7
          })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: change.fill,
            width: 5
          })
        })
      ];
      styles['MultiLineString'] = styles['LineString'];

      styles['Point'] = [
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: 12,
            fill: new ol.style.Fill({
              color: change.fill
            }),
            stroke: new ol.style.Stroke({
              color: change.stroke
            })
          })
        })
      ];
      styles['MultiPoint'] = styles['Point'];

      styles['GeometryCollection'] = styles['Polygon'].concat(styles['Point']);
      return styles[feature.getGeometry().getType()];
    };
  })();

  return new ol.layer.Vector({
    source: new ol.source.Vector({
      parser: null
    }),
    styleFunction: featureStyle
  });
}
