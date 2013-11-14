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
  var repoId_ = null;
  var diffsNeeded_ = null;
  var diffsInError_ = 0;

  var FeaturePanel = function() {
    this.map = null;
    this.featureLayer = null;
    this.attributes = [];
    this.bounds = null;
    this.active = false;
    this.geometry = null;
    this.olGeometry = null;

    this.clearFeature = function() {
      this.attributes = [];
      this.bounds = null;
      this.active = false;
      this.geometry = null;
      this.olGeometry = null;
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
        if (layer.get('label') !== 'Differences') {
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
            zoom: 14
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
      repoId_ = null;
      service_.feature = null;
      service_.change = null;
      service_.left.clearFeature();
      service_.right.clearFeature();
      service_.merged.clearFeature();
    };

    this.choose = function(panel) {
      this.merged.geometry = panel.geometry;
      this.merged.attributes = panel.attributes;
      this.merged.bounds = panel.bounds;
      this.merged.olGeometry = panel.olGeometry;
      this.merged.replaceLayers(panel.map.getLayers());
      this.merged.map.removeLayer(this.merged.featureLayer);
    };

    this.setFeature = function(feature, ours, theirs, ancestor, repoId) {
      service_.change = feature.change;
      service_.left.clearFeature();
      service_.right.clearFeature();
      service_.merged.clearFeature();
      ours_ = ours;
      theirs_ = theirs;
      ancestor_ = ancestor;
      repoId_ = repoId;
      var layers = mapService_.map.getLayers();
      service_.feature = feature;
      service_.left.replaceLayers(layers);
      service_.right.replaceLayers(layers);
      service_.merged.replaceLayers(layers);
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
          service_.performFeatureDiff(feature, ours_, ancestor_, service_.left);
          service_.performFeatureDiff(feature, theirs_, ancestor_, service_.right);
          break;
        case 'MERGED':
          diffsNeeded_ = 3;
          service_.performFeatureDiff(feature, ours_, ancestor_, service_.left);
          service_.performFeatureDiff(feature, theirs_, ancestor_, service_.right);
          service_.performFeatureDiff(feature, ours_, ancestor_, service_.merged);
          break;
      }
      var geom = ol.parser.WKT.read(feature.geometry);
      var transform = ol.proj.getTransform('EPSG:4326', mapService_.map.getView().getView2D().getProjection());
      geom.transform(transform);
      var newBounds = geom.getBounds();
      var x = newBounds[2] - newBounds[0];
      var y = newBounds[3] - newBounds[1];
      x *= 0.5;
      y *= 0.5;
      newBounds[0] -= x;
      newBounds[2] += x;
      newBounds[1] -= y;
      newBounds[3] += y;
      mapService_.zoomToExtent(newBounds);
      service_.title = feature.id;
      rootScope_.$broadcast('feature-diff-feature-set');
    };

    this.performFeatureDiff = function(feature, newCommit, oldCommit, panel) {
      var diffOptions = new GeoGitFeatureDiffOptions();
      diffOptions.all = true;
      diffOptions.newCommitId = newCommit;
      diffOptions.oldCommitId = oldCommit;
      diffOptions.path = feature.id;
      panel.active = true;
      geogitService_.command(repoId_, 'featurediff', diffOptions).then(function(response) {
        forEachArrayish(response.diff, function(item) {
          if (item.geometry !== true) {
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

        var geom = ol.parser.WKT.read(
            goog.isDefAndNotNull(panel.geometry.newvalue) ? panel.geometry.newvalue : panel.geometry.oldvalue);
        var transform = ol.proj.getTransform('EPSG:4326', panel.map.getView().getView2D().getProjection());
        geom.transform(transform);
        var olFeature = new ol.Feature();
        olFeature.set('change', panel.geometry.changetype);
        olFeature.setGeometry(geom);
        panel.featureLayer.addFeatures([olFeature]);
        panel.olGeometry = geom;
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
                'Unable to retrieve all the differences for the layer.  Check network connection and try again.');
          } else {
            if (feature.change == 'CONFLICT') {
              if (goog.isDefAndNotNull(feature.ours) && feature.ours === false) {
                service_.choose(service_.right);
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
              'Unable to retrieve all the differences for the layer.  Check network connection and try again.');
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
          filter: 'change == "ADDED"',
          symbolizers: [
            new ol.style.Fill({
              color: '#00FF00',
              opacity: 0.5
            }),
            new ol.style.Stroke({
              color: '#006600'
            })
          ]
        }),
        new ol.style.Rule({
          filter: 'change == "REMOVED"',
          symbolizers: [
            new ol.style.Fill({
              color: '#FF0000',
              opacity: 0.5
            }),
            new ol.style.Stroke({
              color: '#660000'
            })
          ]
        }),
        new ol.style.Rule({
          filter: 'change == "MODIFIED"',
          symbolizers: [
            new ol.style.Fill({
              color: '#FFFF00',
              opacity: 0.5
            }),
            new ol.style.Stroke({
              color: '#666600'
            })
          ]
        }),
        new ol.style.Rule({
          filter: 'change == "NO_CHANGE"',
          symbolizers: [
            new ol.style.Fill({
              color: '#FFFFFF',
              opacity: 0.5
            }),
            new ol.style.Stroke({
              color: '#333333'
            })
          ]
        })
      ]})
    });
  }

}());
