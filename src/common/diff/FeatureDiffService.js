(function() {
  var module = angular.module('loom_feature_diff_service', []);

  // Private Variables
  var service_ = null;
  var rootScope_ = null;
  var mapService_ = null;
  var geogitService_ = null;
  var dialogService_ = null;

  var ours_ = null;
  var theirs_ = null;
  var ancestor_ = null;
  var merged_ = null;
  var repoId_ = null;
  var diffsNeeded_ = null;
  var diffsInError_ = 0;
  var crs_ = null;

  var FeaturePanel = function() {
    this.map = null;
    this.featureLayer = null;
    this.attributes = [];
    this.bounds = null;
    this.active = false;
    this.geometry = null;
    this.olFeature = null;

    this.clearFeature = function() {
      this.attributes = [];
      this.bounds = null;
      this.active = false;
      this.geometry = null;
      this.olFeature = null;
      this.featureLayer.clear();
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
        if (layer.get('metadata').label !== 'Differences') {
          featurePanel.map.addLayer(layer);
        }
      });
      this.map.addLayer(this.featureLayer);
    };
  };

  module.provider('featureDiffService', function() {
    this.title = 'Diffs';
    this.feature = null;
    this.left = new FeaturePanel();
    this.right = new FeaturePanel();
    this.merged = new FeaturePanel();
    this.change = null;
    this.leftName = null;
    this.rightName = null;

    this.$get = function($rootScope, mapService, geogitService, dialogService) {
      service_ = this;
      rootScope_ = $rootScope;
      mapService_ = mapService;
      geogitService_ = geogitService;
      dialogService_ = dialogService;
      var createMap = function(panel) {
        panel.map = new ol.Map({
          renderer: ol.RendererHint.CANVAS,
          view: new ol.View2D({
            center: ol.proj.transform([-87.2011, 14.1], 'EPSG:4326', 'EPSG:3857'),
            zoom: 14,
            maxZoom: 20
          })
        });

        var controls = panel.map.getControls();
        controls.forEach(function(control) {
          if (control instanceof ol.control.Attribution) {
            panel.map.removeControl(control);
          }
        });
        panel.featureLayer = makeFeatureLayer();
      };
      createMap(this.left);
      createMap(this.right);
      createMap(this.merged);
      this.merged.map.bindTo('view', service_.left.map);
      this.right.map.bindTo('view', service_.left.map);

      return this;
    };

    this.setTitle = function(title) {
      service_.title = title;
    };

    this.clear = function() {
      ours_ = null;
      theirs_ = null;
      ancestor_ = null;
      merged_ = null;
      repoId_ = null;
      service_.feature = null;
      service_.change = null;
      service_.left.clearFeature();
      service_.right.clearFeature();
      service_.merged.clearFeature();
      service_.leftName = null;
      service_.rightName = null;
    };

    this.chooseGeometry = function(panel) {
      this.merged.geometry = panel.geometry;
      this.merged.bounds = panel.bounds;
      this.merged.olFeature.setGeometry(panel.olFeature.getGeometry());
      this.merged.olFeature.set('MapLoomChange', panel.olFeature.get('MapLoomChange'));
      rootScope_.$broadcast('merge-feature-modified');
    };

    this.chooseAttribute = function(index, panel) {
      this.merged.attributes[index] = $.extend(true, {}, panel.attributes[index]);
    };

    this.choose = function(panel) {
      for (var i = 0; i < panel.attributes.length; i++) {
        this.chooseAttribute(i, panel);
      }
      this.chooseGeometry(panel);
    };

    this.attributesEqual = function(attr1, attr2) {
      return attr1.attributename == attr2.attributename &&
          attr1.changetype == attr2.changetype &&
          attr1.newvalue == attr2.newvalue &&
          attr1.oldvalue == attr2.oldvalue;
    };

    this.updateChangeType = function(attribute) {
      if (goog.isDefAndNotNull(attribute.oldvalue)) {
        if (goog.isDefAndNotNull(attribute.newvalue)) {
          if (attribute.oldvalue !== attribute.newvalue) {
            attribute.changetype = 'MODIFIED';
          } else {
            attribute.changetype = 'NO_CHANGE';
          }
        } else {
          attribute.changetype = 'REMOVED';
        }
      } else {
        if (goog.isDefAndNotNull(attribute.newvalue)) {
          attribute.changetype = 'ADDED';
        } else {
          attribute.changetype = 'NO_CHANGE';
        }
      }
    };

    this.getMerges = function() {
      var merges = {};
      if (service_.merged.geometry == service_.left.geometry) {
        merges[service_.merged.geometry.attributename] = '__OURS__';
      } else if (service_.merged.geometry == service_.right.geometry) {
        merges[service_.merged.geometry.attributename] = '__THEIRS__';
      } else {
        merges[service_.merged.geometry.attributename] = service_.merged.geometry;
      }

      for (var i = 0; i < service_.merged.attributes.length; i++) {
        if (service_.attributesEqual(service_.merged.attributes[i], service_.left.attributes[i])) {
          merges[service_.merged.attributes[i].attributename] = '__OURS__';
        } else if (service_.attributesEqual(service_.merged.attributes[i], service_.right.attributes[i])) {
          merges[service_.merged.attributes[i].attributename] = '__THEIRS__';
        } else {
          merges[service_.merged.attributes[i].attributename] = service_.merged.attributes[i].newvalue;
        }
      }

      return merges;
    };

    this.setFeature = function(feature, ours, theirs, ancestor, merged, repoId) {
      service_.change = feature.change;
      service_.left.clearFeature();
      service_.right.clearFeature();
      service_.merged.clearFeature();
      ours_ = ours;
      theirs_ = theirs;
      ancestor_ = ancestor;
      merged_ = merged;
      repoId_ = repoId;
      var layers = mapService_.map.getLayers();
      service_.feature = feature;
      service_.left.replaceLayers(layers);
      service_.right.replaceLayers(layers);
      service_.merged.replaceLayers(layers);

      crs_ = goog.isDefAndNotNull(feature.crs) ? feature.crs : null;
      var repoName = geogitService_.getRepoById(repoId_).name;
      mapService_.map.getLayers().forEach(function(layer) {
        var metadata = layer.get('metadata');
        if (goog.isDefAndNotNull(metadata)) {
          if (goog.isDefAndNotNull(metadata.geogitStore) && metadata.geogitStore === repoName) {
            var splitFeature = feature.id.split('/');
            if (goog.isDefAndNotNull(metadata.nativeName) && metadata.nativeName === splitFeature[0]) {
              if (goog.isDefAndNotNull(metadata.projection)) {
                crs_ = metadata.projection;
              }
            }
          }
        }
      });

      var geom = ol.parser.WKT.read(feature.geometry);
      if (goog.isDefAndNotNull(crs_)) {
        var transform = ol.proj.getTransform(crs_, mapService_.map.getView().getView2D().getProjection());
        geom.transform(transform);
      }
      var newBounds = geom.getBounds();
      var x = newBounds[2] - newBounds[0];
      var y = newBounds[3] - newBounds[1];
      x *= 0.5;
      y *= 0.5;
      newBounds[0] -= x;
      newBounds[2] += x;
      newBounds[1] -= y;
      newBounds[3] += y;

      diffsInError_ = 0;
      switch (feature.change) {
        case 'ADDED':
          diffsNeeded_ = 1;
          service_.performFeatureDiff(feature, theirs_, ancestor_, service_.right);
          break;
        case 'REMOVED':
          diffsNeeded_ = 1;
          service_.performFeatureDiff(feature, theirs_, ancestor_, service_.right);
          break;
        case 'MODIFIED':
          diffsNeeded_ = 2;
          service_.performFeatureDiff(feature, ours_, ancestor_, service_.left);
          service_.performFeatureDiff(feature, theirs_, ancestor_, service_.right);
          break;
        case 'CONFLICT':
          diffsNeeded_ = 2;
          service_.merged.active = true;
          service_.merged.olFeature = new ol.Feature();
          service_.merged.olFeature.set('MapLoomChange', DiffColorMap[feature.change]);
          service_.merged.olFeature.setGeometry(geom);
          service_.merged.featureLayer.addFeatures([service_.merged.olFeature]);
          service_.performFeatureDiff(feature, ours_, ancestor_, service_.left);
          service_.performFeatureDiff(feature, theirs_, ancestor_, service_.right);
          break;
        case 'MERGED':
          diffsNeeded_ = 3;
          service_.performFeatureDiff(feature, ours_, ancestor_, service_.left);
          service_.performFeatureDiff(feature, theirs_, ancestor_, service_.right);
          service_.performFeatureDiff(feature, merged_, ancestor_, service_.merged);
          break;
      }
      mapService_.zoomToExtent(newBounds);
      service_.title = feature.id;
      rootScope_.$broadcast('feature-diff-feature-set');
    };

    this.performFeatureDiff = function(feature, newCommit, oldCommit, panel) {
      var diffOptions = new GeoGitFeatureDiffOptions();
      diffOptions.all = true;
      diffOptions.newTreeish = newCommit;
      diffOptions.oldTreeish = oldCommit;
      diffOptions.path = feature.id;
      panel.active = true;
      geogitService_.command(repoId_, 'featurediff', diffOptions).then(function(response) {
        forEachArrayish(response.diff, function(item) {
          if (item.geometry !== true) {
            if (!goog.isDefAndNotNull(item.newvalue)) {
              item.newvalue = item.oldvalue;
            }
            panel.attributes.push(item);
          } else {
            panel.geometry = item;
          }
        });

        panel.attributes = panel.attributes.sort(function(a, b) {
          if (a.attributename > b.attributename) {
            return 1;
          }
          if (a.attributename < b.attributename) {
            return -1;
          }
          return 0;
        });

        var geom = ol.parser.WKT.read(panel.getGeometry());

        var localCrs = crs_;
        if (goog.isDefAndNotNull(panel.geometry.crs)) {
          localCrs = panel.geometry.crs;
        }
        if (goog.isDefAndNotNull(localCrs)) {
          var transform = ol.proj.getTransform(localCrs, panel.map.getView().getView2D().getProjection());
          geom.transform(transform);
        }
        var olFeature = new ol.Feature();
        olFeature.set('MapLoomChange', DiffColorMap[panel.geometry.changetype]);
        olFeature.setGeometry(geom);
        panel.featureLayer.addFeatures([olFeature]);
        panel.olFeature = olFeature;
        var newBounds = geom.getBounds();
        var x = newBounds[2] - newBounds[0];
        var y = newBounds[3] - newBounds[1];
        x *= 0.1;
        y *= 0.1;
        newBounds[0] -= x;
        newBounds[2] += x;
        newBounds[1] -= y;
        newBounds[3] += y;
        panel.bounds = newBounds;
        diffsNeeded_ -= 1;
        if (diffsNeeded_ === 0) {
          if (diffsInError_ > 0) {
            dialogService_.error('Error',
                'Unable to retrieve all the differences for the feature.  Check network connection and try again.');
          } else {
            if (feature.change == 'CONFLICT') {
              service_.merged.attributes = $.extend(true, [], service_.left.attributes);
              if (goog.isDefAndNotNull(feature.merges)) {
                var geomattributename = panel.geometry.attributename;
                var geomMergeValue = feature.merges[geomattributename];
                if (geomMergeValue === '__OURS__') {
                  service_.chooseGeometry(service_.left);
                } else if (geomMergeValue === '__THEIRS__') {
                  service_.chooseGeometry(service_.right);
                }
                for (var i = 0; i < service_.merged.attributes.length; i++) {
                  var attributename = service_.merged.attributes[i].attributename;
                  var mergeValue = feature.merges[attributename];
                  if (mergeValue === '__OURS__') {
                    // 'ours' is default and already picked.
                  } else if (mergeValue === '__THEIRS__') {
                    service_.chooseAttribute(i, service_.right);
                  } else {
                    service_.merged.attributes[i].newvalue = mergeValue;
                    service_.updateChangeType(service_.merged.attributes[i]);
                  }
                }
              } else {
                service_.choose(service_.left);
              }
            }
            rootScope_.$broadcast('feature-diff-performed');
          }
        }
      }, function(reject) {
        diffsNeeded_ -= 1;
        diffsInError_ += 1;
        if (diffsNeeded_ === 0) {
          dialogService_.error('Error',
              'Unable to retrieve all the differences for the feature.  Check network connection and try again.');
        }
        console.log('Feature diff failed: ', panel, reject);
      });
    };
  });

  function makeFeatureLayer() {
    return new ol.layer.Vector({
      source: new ol.source.Vector({
        parser: null
      }),
      style: new ol.style.Style({rules: [
        new ol.style.Rule({
          filter: '(geometryType("polygon") || geometryType("multipolygon"))',
          symbolizers: [
            new ol.style.Fill({color: ol.expr.parse('MapLoomChange.fill'), opacity: 1.0}),
            new ol.style.Stroke({color: ol.expr.parse('MapLoomChange.stroke')})
          ]
        }),
        new ol.style.Rule({
          filter: '(geometryType("point") || geometryType("multipoint"))',
          symbolizers: [
            new ol.style.Shape({size: 20,
              fill: new ol.style.Fill({color: ol.expr.parse('MapLoomChange.fill'), opacity: 1.0}),
              stroke: new ol.style.Stroke({color: ol.expr.parse('MapLoomChange.stroke')})
            })
          ]
        })
      ]})
    });
  }

}());
