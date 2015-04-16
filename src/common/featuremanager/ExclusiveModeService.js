(function() {
  var module = angular.module('loom_exclusive_mode_service', []);

  var title_ = '';
  var buttons_ = [];
  var pulldownService_ = null;
  var enabled_ = false;
  var geometryType_ = null;
  var mapService_ = null;
  var service_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var points = null;

  module.provider('exclusiveModeService', function() {
    this.$get = function(pulldownService, mapService, dialogService, $translate) {
      pulldownService_ = pulldownService;
      mapService_ = mapService;
      dialogService_ = dialogService;
      translate_ = $translate;
      service_ = this;
      this.addMode = false;
      this.isSaving = false;
      return this;
    };

    this.button = function(title, callback) {
      return {title: title, callback: callback};
    };

    this.getTitle = function() {
      return title_;
    };

    this.getType = function() {
      return geometryType_;
    };

    this.getButtonOne = function() {
      return buttons_[0];
    };

    this.getButtonTwo = function() {
      return buttons_[1];
    };

    this.isEnabled = function() {
      return enabled_;
    };

    this.isMultiType = function() {
      if (goog.isDefAndNotNull(geometryType_)) {
        return geometryType_.search(/Multi/g) > -1 ? true : geometryType_.toLowerCase() == 'geometrycollection';
      }
      return false;
    };

    this.isPolygon = function() {
      if (goog.isDefAndNotNull(geometryType_)) {
        return geometryType_.search(/Polygon/g) > -1;
      }
      return false;
    };

    this.startExclusiveMode = function(title, buttonOne, buttonTwo, geometryType) {
      title_ = title;
      buttons_ = [buttonOne, buttonTwo];
      enabled_ = true;
      angular.element('#pulldown-menu').collapse('hide');
      pulldownService_.toggleEnabled = false;
      geometryType_ = geometryType;
      setTimeout(function() {
        angular.element('#exclusive-mode-container').collapse('show');
      }, 350);
    };

    this.endExclusiveMode = function() {
      angular.element('#exclusive-mode-container').collapse('hide');
      pulldownService_.toggleEnabled = true;
      enabled_ = false;
      setTimeout(function() {
        angular.element('#pulldown-menu').collapse('show');
        title_ = '';
        buttons_ = [];
      }, 350);
    };

    this.addToFeature = function() {
      if (!this.addMode) {
        mapService_.removeSelect();
        mapService_.removeModify();
        if (geometryType_.toLowerCase() == 'multigeometry' || geometryType_.toLowerCase() == 'geometrycollection') {
          $('#drawSelectDialog').modal('toggle');
        } else {
          mapService_.addDraw(geometryType_);
        }
        this.addMode = true;
      }
    };

    this.removeFromFeature = function() {
      if (mapService_.getSelectedFeatures().getLength() > 0) {
        mapService_.editLayer.getSource().removeFeature(mapService_.getSelectedFeatures().item(0));
        mapService_.getSelectedFeatures().remove(mapService_.getSelectedFeatures().item(0));
      }
    };

    /* These functions were adapted from openstreetmap's Quadrilateralise.as file located on GitHub at
     * https://github.com/openstreetmap/potlatch2/blob/master/net/systemeD/potlatch2/tools/Quadrilateralise.as
     *
     * The purpose of these functions is to provide a way to take an existing polygon and modify it so that its corners
     * consist of only right angles.
     */

    // helper function to find the magnitude or length of the point
    var magnitude = function(point) {
      return Math.sqrt((point[0] * point[0]) + (point[1] * point[1]));
    };

    // helper function to normalize a Point passed in, returns the new normalized point
    var normalize = function(point) {
      var mag = magnitude(point);
      return [point[0] / mag, point[1] / mag];
    };

    /* returns the score of a corner, this is constructed in a way so that
     * corners that are straight lines or 90 degree angles score closer to
     * zero than other angles. The goal is to minimize the total score of the polygon.
     */
    var scoreOf = function(a, b, c) {
      var p = [a[0] - b[0], a[1] - b[1]];
      var q = [c[0] - b[0], c[1] - b[1]];

      p = normalize(p);
      q = normalize(q);

      var dotp = p[0] * q[0] + p[1] * q[1];

      return 2.0 * Math.min(Math.abs(dotp - 1.0), Math.min(Math.abs(dotp), Math.abs(dotp + 1)));
    };

    // get the sum of the scores of the polygon
    var totalScore = function() {
      var total = 0.0;

      // total all of the corners, except the first and last which are taken care of later
      for (var index = 1; index < points.length - 1; index++) {
        total += scoreOf(points[index - 1], points[index], points[index + 1]);
      }

      // the first corner of the polygon
      var startScore = scoreOf(points[points.length - 1], points[0], points[1]);
      // the last corner of the polygon
      var endScore = scoreOf(points[points.length - 2], points[points.length - 1], points[0]);
      total += startScore;
      total += endScore;

      return total;
    };

    // Moves points towards their adjacent points or away from them depending on the angle of that corner
    var step = function() {
      var funct = function(b, i, array) {
        var a = array[(i - 1 + array.length) % array.length];
        var c = array[(i + 1) % array.length];
        var p = [a[0] - b[0], a[1] - b[1]];
        var q = [c[0] - b[0], c[1] - b[1]];
        var scale = magnitude(p) + magnitude(q);
        p = normalize(p);
        q = normalize(q);
        var dotp = p[0] * q[0] + p[1] * q[1];
        // Copied from Quadrilateralise.as, not sure if there is a better way to handle this
        // nasty hack to deal with almost-straight segments (angle is closer to 180 than to 90/270).
        if (dotp < -0.707106781186547) {
          dotp += 1.0;
        }
        var v = [p[0] + q[0], p[1] + q[1]];
        v = normalize(v);
        v[0] = v[0] * (0.1 * dotp * scale);
        v[1] = v[1] * (0.1 * dotp * scale);
        return v;
      };

      var motions = points.map(funct);
      var newPoints = [];
      for (var index = 0; index < motions.length; ++index) {
        newPoints.push([points[index][0] + motions[index][0], points[index][1] + motions[index][1]]);
      }
      points = newPoints;
    };

    // Updates the polygon with the new points
    var updatePolygon = function(feature) {
      var feat = new ol.Feature();
      feat.setGeometry(new ol.geom.Polygon(points));
      mapService_.getSelectedFeatures().pop();
      mapService_.editLayer.getSource().clear();
      mapService_.editLayer.getSource().addFeature(feat);
    };

    var updateMultiPolygon = function(feature) {
      var feat = new ol.Feature();
      feat.setGeometry(new ol.geom.MultiPolygon([points]));
      service_.removeFromFeature();
      mapService_.editLayer.getSource().addFeature(feat);
    };

    this.orthogonalize = function() {
      if (mapService_.hasSelectedFeature()) {
        var feature = mapService_.getSelectedFeatures().item(0);
        // check for multipolygon or polygon
        var coordinates;
        if (feature.getGeometry().getType().search(/Multi/g) > -1) {
          coordinates = feature.getGeometry().getCoordinates()[0];
        } else {
          coordinates = feature.getGeometry().getCoordinates();
        }

        for (var ringIndex = 0; ringIndex < coordinates.length; ringIndex++) {
          points = coordinates[ringIndex];
          points.pop();

          // number of steps that it will try to get close to orthogonal
          var steps = 1000;
          // threshold for being considered close enough
          var tolerance = 1.0e-8;
          // the inital score of the polygon
          var score = totalScore();

          for (var index = 0; index < steps; index++) {
            step();
            var newScore = totalScore();
            // if the newScore is greater than the old score then we failed
            if (newScore > score) {
              dialogService_.open(translate_.instant('right_angles'), translate_.instant('right_angles_failed'),
                  [translate_.instant('btn_ok')], false);
              return;
            }
            score = newScore;
            // if the score is less than the tolerance then we succeeded
            if (score < tolerance) {
              break;
            }
          }
          points.push(points[0]);
          coordinates[ringIndex] = points;
        }

        points = coordinates;
        if (feature.getGeometry().getType().search(/Multi/g) > -1) {
          updateMultiPolygon(feature);
        } else {
          updatePolygon(feature);
        }
      }
    };
  });
}());
