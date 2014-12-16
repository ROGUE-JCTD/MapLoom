(function() {
  var module = angular.module('loom_diff_service', []);

  // Private Variables
  var rootScope = null;
  var service_ = null;
  var difflayer_ = null;
  var mapService_ = null;
  var geogigService_ = null;
  var featureDiffService_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var q_ = null;

  module.provider('diffService', function() {
    this.adds = [];
    this.modifies = [];
    this.deletes = [];
    this.conflicts = [];
    this.merges = [];
    this.features = [];
    this.title = 'Diffs';
    this.clickCallback = null;
    this.oldName = null;
    this.newName = null;
    this.mergeDiff = false;
    this.oldCommitId = null;
    this.newCommitId = null;
    this.repoId = null;

    this.$get = function($rootScope, $q, $translate, mapService, geogigService, featureDiffService, dialogService) {
      rootScope = $rootScope;
      geogigService_ = geogigService;
      featureDiffService_ = featureDiffService;
      translate_ = $translate;
      dialogService_ = dialogService;
      q_ = $q;
      service_ = this;
      var diffStyle = (function() {
        return function(feature, resolution) {
          var styles = {};
          var change = $.extend(true, [], feature.get('change'));
          change.fill.push(0.5);
          change.stroke.push(0.5);
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

      difflayer_ = new ol.layer.Vector({
        metadata: {
          title: translate_.instant('differences'),
          internalLayer: true
        },
        source: new ol.source.Vector({
          parser: null
        }),
        style: diffStyle
      });
      rootScope.$on('translation_change', function() {
        difflayer_.get('metadata').title = translate_.instant('differences');
      });
      mapService_ = mapService;
      return this;
    };

    this.resolveFeature = function(_feature) {
      var splitFeature = _feature.id.split('/');
      for (var i = 0; i < service_.conflicts.length; i++) {
        var obj = service_.conflicts[i];
        if (obj.layer === splitFeature[0] && obj.feature === splitFeature[1]) {
          obj.resolved = _feature.resolved;
          obj.ours = _feature.ours;
        }
      }
    };

    this.populate = function(_changeList, _repo, oldName, newName) {
      service_.adds = [];
      service_.modifies = [];
      service_.deletes = [];
      service_.conflicts = [];
      service_.merges = [];
      service_.oldName = oldName;
      service_.newName = newName;
      service_.features = _changeList;
      difflayer_.getSource().clear();
      mapService_.map.removeLayer(difflayer_);
      mapService_.map.addLayer(difflayer_);
      if (goog.isDefAndNotNull(_changeList)) {
        var numOutside = 0;
        var missingLayers = {};
        forEachArrayish(_changeList, function(change) {
          var crs = goog.isDefAndNotNull(change.crs) ? change.crs : null;
          var layerFound = false;
          var splitFeature = change.id.split('/');
          mapService_.map.getLayers().forEach(function(layer) {
            var metadata = layer.get('metadata');
            if (goog.isDefAndNotNull(metadata)) {
              if (goog.isDefAndNotNull(metadata.geogigStore) && metadata.geogigStore === _repo) {
                if (goog.isDefAndNotNull(metadata.nativeName) && metadata.nativeName === splitFeature[0]) {
                  layerFound = true;
                  if (goog.isDefAndNotNull(metadata.projection)) {
                    crs = metadata.projection;
                  }
                }
              }
            }
          });

          var geom = WKT.read(change.geometry);
          if (goog.isDefAndNotNull(crs)) {
            geom.transform(crs, mapService_.map.getView().getProjection());
          }
          var olFeature = new ol.Feature();
          olFeature.set('change', DiffColorMap[change.change]);
          olFeature.setGeometry(geom);
          difflayer_.getSource().addFeature(olFeature);
          change.olFeature = olFeature;
          var feature = {
            repo: _repo,
            layer: splitFeature[0],
            feature: splitFeature[1],
            extent: geom.getExtent()
          };
          switch (change.change) {
            case 'ADDED':
              service_.adds.push(feature);
              break;
            case 'REMOVED':
              service_.deletes.push(feature);
              break;
            case 'MODIFIED':
              service_.modifies.push(feature);
              break;
            case 'CONFLICT':
              if (layerFound === false) {
                numOutside++;
                missingLayers[splitFeature[0]] = true;
              }
              service_.conflicts.push(feature);
              break;
            case 'MERGED':
              service_.merges.push(feature);
              break;
          }
        });

        if (numOutside > 0) {
          var layerString = '';
          var first = true;
          for (var layer in missingLayers) {
            if (first) {
              first = false;
            } else {
              layerString += ', ';
            }
            layerString += layer;
          }
          dialogService_.warn(translate_.instant('warning'), translate_.instant('missing_layers_merge',
              {count: numOutside}) + layerString, [translate_.instant('btn_ok')], false);
        }
      }
      rootScope.$broadcast('diff_performed', _repo);
    };

    this.performDiff = function(repoId, options) {
      var deferredResponse = q_.defer();
      geogigService_.command(repoId, 'diff', options).then(function(response) {
        service_.clearDiff();
        if (goog.isDefAndNotNull(response.Feature)) {
          service_.mergeDiff = false;
          service_.oldCommitId = options.oldRefSpec;
          service_.newCommitId = options.newRefSpec;
          service_.clickCallback = featureClicked;
          service_.repoId = repoId;
          if (goog.isArray(response.Feature)) {
            service_.populate(response.Feature, geogigService_.getRepoById(repoId).name,
                translate_.instant('from'), translate_.instant('to'));
          } else {
            service_.populate([response.Feature], geogigService_.getRepoById(repoId).name,
                translate_.instant('from'), translate_.instant('to'));
          }
        }
        deferredResponse.resolve(response);
      }, function(reject) {
        //failed to get diff
        console.log(reject);
        deferredResponse.reject();
      });
      return deferredResponse.promise;
    };

    this.clearDiff = function() {
      this.adds = [];
      this.modifies = [];
      this.deletes = [];
      this.conflicts = [];
      this.merges = [];
      this.features = [];
      this.repoId = null;
      this.clickCallback = null;
      mapService_.map.removeLayer(difflayer_);
      rootScope.$broadcast('diff_cleared');
    };

    this.hasDifferences = function() {
      return (
          this.adds.length + this.modifies.length +
          this.deletes.length + this.merges.length +
          this.conflicts.length !== 0
      );
    };

    this.setTitle = function(title) {
      this.title = title;
    };
  });


  function featureClicked(feature) {
    var fid = feature.layer + '/' + feature.feature;
    for (var i = 0; i < service_.features.length; i++) {
      if (fid === service_.features[i].id) {
        featureDiffService_.undoable = true;
        featureDiffService_.leftName = service_.oldName;
        featureDiffService_.rightName = service_.newName;
        featureDiffService_.setFeature(
            service_.features[i], service_.oldCommitId, service_.newCommitId,
            service_.oldCommitId, null, service_.repoId);
        $('#feature-diff-dialog').modal('show');
        service_.currentFeature = service_.features[i];
        break;
      }
    }
  }

}());
