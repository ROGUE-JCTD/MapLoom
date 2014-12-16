(function() {
  var module = angular.module('loom_feature_diff_service', []);

  // Private Variables
  var service_ = null;
  var rootScope_ = null;
  var mapService_ = null;
  var geogigService_ = null;
  var dialogService_ = null;
  var translate_ = null;

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
      style: featureStyle
    });
  }

  module.provider('featureDiffService', function() {
    this.title = 'Diffs';
    this.feature = null;
    this.left = new FeaturePanel();
    this.right = new FeaturePanel();
    this.merged = new FeaturePanel();
    this.change = null;
    this.leftName = null;
    this.rightName = null;
    this.schema = null;
    this.undoable = false;
    this.layer = null;
    this.combinedExtent = [0, 0, 0, 0];

    this.$get = function($rootScope, mapService, geogigService, dialogService, $translate) {
      service_ = this;
      rootScope_ = $rootScope;
      mapService_ = mapService;
      geogigService_ = geogigService;
      dialogService_ = dialogService;
      translate_ = $translate;
      ol.extent.empty(this.combinedExtent);
      var createMap = function(panel) {
        panel.map = new ol.Map({
          //renderer: ol.RendererHint.CANVAS,
          ol3Logo: false,
          view: new ol.View({
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
      service_.schema = null;
      service_.layer = null;
      service_.undoable = false;
    };

    this.chooseGeometry = function(panel) {
      this.merged.geometry = panel.geometry;
      this.merged.bounds = panel.bounds;
      this.merged.olFeature.setGeometry(panel.olFeature.getGeometry());
      this.merged.olFeature.set('MapLoomChange', panel.olFeature.get('MapLoomChange'));
      if (this.left.geometry.changetype === 'REMOVED' || this.right.geometry.changetype === 'REMOVED') {
        this.merged.attributes = $.extend(true, [], panel.attributes);
      }
      rootScope_.$broadcast('merge-feature-modified');
    };

    this.chooseAttribute = function(index, panel) {
      if (goog.isDefAndNotNull(service_.merged.geometry)) {
        if (goog.isDefAndNotNull(service_.merged.geometry.changetype)) {
          if (service_.merged.geometry.changetype === 'REMOVED') {
            return;
          }
        }
      }

      var type = this.merged.attributes[index].type;
      this.merged.attributes[index] = $.extend(true, {}, panel.attributes[index]);
      this.merged.attributes[index].type = type;
      assignAttributeTypes(this.merged.attributes, true);
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
          if (attribute.type === 'xsd:dateTime') {
            if ((new Date(attribute.oldvalue)).toISOString() !== (new Date(attribute.newvalue)).toISOString()) {
              attribute.changetype = 'MODIFIED';
            } else {
              attribute.changetype = 'NO_CHANGE';
            }
          } else {
            if (attribute.oldvalue !== attribute.newvalue) {
              attribute.changetype = 'MODIFIED';
            } else {
              attribute.changetype = 'NO_CHANGE';
            }
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

    this.getOursId = function() {
      return ours_;
    };

    this.getTheirsId = function() {
      return theirs_;
    };

    this.getAncestorId = function() {
      return ancestor_;
    };

    this.getMergedId = function() {
      return merged_;
    };

    this.getRepoId = function() {
      return repoId_;
    };

    this.getMerges = function() {
      var merges = {};
      if (service_.merged.geometry == service_.left.geometry) {
        merges[service_.merged.geometry.attributename] = {ours: true};
      } else if (service_.merged.geometry == service_.right.geometry) {
        merges[service_.merged.geometry.attributename] = {theirs: true};
      } else {
        merges[service_.merged.geometry.attributename] = {value: service_.merged.geometry};
      }

      for (var i = 0; i < service_.merged.attributes.length; i++) {
        if (service_.attributesEqual(service_.merged.attributes[i], service_.left.attributes[i])) {
          merges[service_.merged.attributes[i].attributename] = {ours: true};
        } else if (service_.attributesEqual(service_.merged.attributes[i], service_.right.attributes[i])) {
          merges[service_.merged.attributes[i].attributename] = {theirs: true};
        } else {
          merges[service_.merged.attributes[i].attributename] = {value: service_.merged.attributes[i].newvalue};
          if (service_.schema[service_.merged.attributes[i].attributename]._type === 'xsd:dateTime') {
            merges[service_.merged.attributes[i].attributename].value =
                new Date(service_.merged.attributes[i].newvalue).getTime();
          }
        }
      }

      return merges;
    };

    this.setFeature = function(feature, ours, theirs, ancestor, merged, repoId) {
      service_.change = feature.change;
      service_.left.clearFeature();
      service_.right.clearFeature();
      service_.merged.clearFeature();
      ol.extent.empty(service_.combinedExtent);
      ours_ = ours;
      theirs_ = theirs;
      ancestor_ = ancestor;
      merged_ = merged;
      repoId_ = repoId;
      var layers = mapService_.map.getLayers();
      service_.feature = feature;
      service_.layer = null;
      service_.left.replaceLayers(layers);
      service_.right.replaceLayers(layers);
      service_.merged.replaceLayers(layers);

      crs_ = goog.isDefAndNotNull(feature.crs) ? feature.crs : null;
      var repoName = geogigService_.getRepoById(repoId_).name;
      var splitFeature = feature.id.split('/');
      mapService_.map.getLayers().forEach(function(layer) {
        var metadata = layer.get('metadata');
        if (goog.isDefAndNotNull(metadata)) {
          if (goog.isDefAndNotNull(metadata.geogigStore) && metadata.geogigStore === repoName) {
            if (goog.isDefAndNotNull(metadata.nativeName) && metadata.nativeName === splitFeature[0]) {
              service_.layer = layer;
              if (goog.isDefAndNotNull(layer.get('metadata').schema)) {
                service_.schema = layer.get('metadata').schema;
              }
              if (goog.isDefAndNotNull(metadata.projection)) {
                crs_ = metadata.projection;
              }
            }
          }
        }
      });

      var continueWork = function() {
        var geom = WKT.read(feature.geometry);
        if (goog.isDefAndNotNull(crs_)) {
          geom.transform(crs_, mapService_.map.getView().getProjection());
        }

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
            service_.merged.featureLayer.getSource().addFeature(service_.merged.olFeature);
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
        service_.title = feature.id;
        rootScope_.$broadcast('feature-diff-feature-set');
      };

      if (!goog.isDefAndNotNull(service_.layer)) {
        // try to get the schema from geogig.
        var lsTreeOptions = new GeoGigLsTreeOptions();
        lsTreeOptions.onlyTree = true;
        lsTreeOptions.showTree = true;
        lsTreeOptions.verbose = true;
        geogigService_.command(repoId_, 'ls-tree', lsTreeOptions).then(function(response) {
          // get featuretype
          var layerFound = false;
          forEachArrayish(response.node, function(node) {
            if (node.path === splitFeature[0]) {
              layerFound = true;
              var catOptions = new GeoGigCatOptions();
              catOptions.objectid = node.metadataId;
              geogigService_.command(repoId_, 'cat', catOptions).then(function(response) {
                // create schema and get projection from crs
                service_.schema = {};
                if (goog.isDefAndNotNull(response.featuretype) &&
                    goog.isDefAndNotNull(response.featuretype.attribute)) {
                  forEachArrayish(response.featuretype.attribute, function(attribute) {
                    var attrType = convertAttributeType(attribute.type);
                    service_.schema[attribute.name] = {_type: attrType};
                    if (attrType.search('gml:') > -1) {
                      crs_ = attribute.crs;
                    }
                  });
                }
                continueWork();
              }, function(error) {
                continueWork();
              });
            }
          });
          if (layerFound === false) {
            continueWork();
          }
        }, function(error) {
          continueWork();
        });
      } else {
        continueWork();
      }
    };

    this.performFeatureDiff = function(feature, newCommit, oldCommit, panel) {
      var diffOptions = new GeoGigFeatureDiffOptions();
      diffOptions.all = true;
      diffOptions.newTreeish = newCommit;
      diffOptions.oldTreeish = oldCommit;
      diffOptions.path = feature.id;
      panel.active = true;
      geogigService_.command(repoId_, 'featurediff', diffOptions).then(function(response) {
        forEachArrayish(response.diff, function(item) {
          if (item.geometry !== true) {
            if (!goog.isDefAndNotNull(item.newvalue)) {
              item.newvalue = item.oldvalue;
              if (item.changetype === 'REMOVED' && feature.change !== 'REMOVED') {
                item.newvalue = null;
              }
            }
            panel.attributes.push(item);
          } else {
            if (!goog.isDefAndNotNull(panel.geometry) &&
                (goog.isDefAndNotNull(item.newvalue) || goog.isDefAndNotNull(item.oldvalue))) {
              panel.geometry = item;
            }
          }
        });

        var geom = WKT.read(panel.getGeometry());

        var localCrs = crs_;
        if (goog.isDefAndNotNull(panel.geometry.crs)) {
          localCrs = panel.geometry.crs;
        }
        if (goog.isDefAndNotNull(localCrs)) {
          geom.transform(localCrs, panel.map.getView().getProjection());
        }
        var olFeature = new ol.Feature();
        olFeature.set('MapLoomChange', DiffColorMap[panel.geometry.changetype]);
        olFeature.setGeometry(geom);
        panel.featureLayer.getSource().addFeature(olFeature);
        panel.olFeature = olFeature;
        ol.extent.extend(service_.combinedExtent, geom.getExtent());
        diffsNeeded_ -= 1;
        assignAttributeTypes(panel.attributes, false);
        if (diffsNeeded_ === 0) {
          if (diffsInError_ > 0) {
            dialogService_.error(translate_.instant('error'), translate_.instant('feature_diff_error'));
          } else {
            if (feature.change == 'CONFLICT') {
              service_.merged.attributes = $.extend(true, [], service_.left.attributes);
              if (goog.isDefAndNotNull(feature.merges)) {
                var geomattributename = panel.geometry.attributename;
                var geomMergeValue = feature.merges[geomattributename];
                if (geomMergeValue.ours === true) {
                  service_.chooseGeometry(service_.left);
                } else if (geomMergeValue.theirs === true) {
                  service_.chooseGeometry(service_.right);
                }
                for (var i = 0; i < service_.merged.attributes.length; i++) {
                  var attributename = service_.merged.attributes[i].attributename;
                  var mergeValue = feature.merges[attributename];
                  if (mergeValue.ours === true) {
                    // 'ours' is default and already picked.
                  } else if (mergeValue.theirs === true) {
                    service_.chooseAttribute(i, service_.right);
                  } else {
                    if (service_.schema[attributename]._type === 'xsd:dateTime') {
                      service_.merged.attributes[i].newvalue = new Date(mergeValue.value).toISOString();
                    } else {
                      service_.merged.attributes[i].newvalue = mergeValue.value;
                    }
                    service_.updateChangeType(service_.merged.attributes[i]);
                  }
                }
                assignAttributeTypes(service_.merged.attributes, true);
              } else {
                service_.choose(service_.left);
                assignAttributeTypes(service_.merged.attributes, true);
              }
            }
            rootScope_.$broadcast('feature-diff-performed');
          }
        }
      }, function(reject) {
        diffsNeeded_ -= 1;
        diffsInError_ += 1;
        if (diffsNeeded_ === 0) {
          dialogService_.error(translate_.instant('error'), translate_.instant('feature_diff_error'));
        }
        console.log('Feature diff failed: ', panel, reject);
      });
    };
  });

  function convertAttributeType(type) {
    switch (type) {
      case 'NULL':
        return 'xsd:null';
      case 'BOOLEAN':
        return 'xsd:boolean';
      case 'BYTE':
      case 'SHORT':
      case 'INTEGER':
      case 'BIG_INTEGER':
      case 'LONG':
        return 'xsd:int';
      case 'FLOAT':
      case 'DOUBLE':
      case 'BIG_DECIMAL':
        return 'xsd:double';
      case 'DATETIME':
        return 'xsd:dateTime';
      case 'DATE':
        return 'xsd:date';
      case 'TIME':
        return 'xsd:time';
      case 'TIMESTAMP':
        return 'xsd:dateTime';
      case 'POINT':
        return 'gml:Point';
      case 'LINESTRING':
        return 'gml:LineString';
      case 'POLYGON':
        return 'gml:Polygon';
      case 'MULTIPOINT':
        return 'gml:MultiPoint';
      case 'MULTILINESTRING':
        return 'gml:MultiLineString';
      case 'MULTIPOLYGON':
        return 'gml:MultiPolygon';
      case 'GEOMETRYCOLLECTION':
        return 'gml:MultiGeometry';
      case 'GEOMETRY':
        return 'gml:Geometry';
      case 'UUID':
      case 'STRING':
      case 'BOOLEAN_ARRAY':
      case 'BYTE_ARRAY':
      case 'SHORT_ARRAY':
      case 'INTEGER_ARRAY':
      case 'LONG_ARRAY':
      case 'FLOAT_ARRAY':
      case 'DOUBLE_ARRAY':
      case 'STRING_ARRAY':
        return 'xsd:string';
    }
    return 'xsd:string';
  }

  function assignAttributeTypes(properties, editable) {
    if (goog.isDefAndNotNull(service_.schema)) {
      for (var propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
        properties[propertyIndex].type = service_.schema[properties[propertyIndex].attributename]._type;
        if (properties[propertyIndex].type === 'simpleType') {
          properties[propertyIndex].enum =
              service_.schema[properties[propertyIndex].attributename].simpleType.restriction.enumeration;
        }
        if (properties[propertyIndex].type === 'xsd:boolean') {
          properties[propertyIndex].enum = [
            {_value: 'true'},
            {_value: 'false'}
          ];
        }
        if (properties[propertyIndex].type === 'xsd:dateTime') {
          if (goog.isDefAndNotNull(properties[propertyIndex].oldvalue)) {
            if (properties[propertyIndex].oldvalue.search(' ') != -1) {
              properties[propertyIndex].oldvalue = properties[propertyIndex].oldvalue.replace(' ', 'T') + 'Z';
            }
          }
          if (goog.isDefAndNotNull(properties[propertyIndex].newvalue)) {
            if (properties[propertyIndex].newvalue.search(' ') != -1) {
              properties[propertyIndex].newvalue = properties[propertyIndex].newvalue.replace(' ', 'T') + 'Z';
            }
          }
        }
        /*
        There are a lot of problems with the handling of date and time fields, commenting out until we have the time
        to refactor it.
        var date;
        if (properties[propertyIndex].type === 'xsd:date') {
          if (goog.isDefAndNotNull(properties[propertyIndex].oldvalue)) {
            date = properties[propertyIndex].oldvalue;
            if (date.search('T') === -1) {
              date = properties[propertyIndex].oldvalue.replace('Z', '');
            }
            properties[propertyIndex].oldvalue = new Date(date).toISOString();
          }
          if (goog.isDefAndNotNull(properties[propertyIndex].newvalue)) {
            date = properties[propertyIndex].newvalue;
            if (date.search('T') === -1) {
              date = properties[propertyIndex].newvalue.replace('Z', '');
            }
            properties[propertyIndex].newvalue = new Date(date).toISOString();
          }
        }
        if (properties[propertyIndex].type === 'xsd:time') {
          if (goog.isDefAndNotNull(properties[propertyIndex].oldvalue)) {
            date = properties[propertyIndex].oldvalue;
            if ('Invalid Date' == new Date(date)) {
              date = '2014-03-10T' + properties[propertyIndex].oldvalue;
            }
            properties[propertyIndex].oldvalue = new Date(date).toISOString();
          }
          if (goog.isDefAndNotNull(properties[propertyIndex].newvalue)) {
            date = properties[propertyIndex].newvalue;
            if ('Invalid Date' == new Date(date)) {
              date = '2014-03-10T' + properties[propertyIndex].newvalue;
            }
            properties[propertyIndex].newvalue = new Date(date).toISOString();
          }
        }*/
        properties[propertyIndex].valid = true;
        properties[propertyIndex].editable = editable;
      }
    }
  }

}());
