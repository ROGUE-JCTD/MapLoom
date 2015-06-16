
(function() {
  var module = angular.module('loom_timeline_service', []);

  service_ = null;

  module.provider('timelineService', function() {
    this.$get = function() {
      service_ = this;
      return service_;
    };

    this.isTimeDimensionEnabled = function(layer) {
      if (goog.isDefAndNotNull(layer)) {
        var metadata = layer.get('metadata');
        metadata.timeDimensionEnabled = false;

        if (goog.isDefAndNotNull(metadata) && goog.isDefAndNotNull(metadata.dimensions)) {
          for (var index = 0; index < metadata.dimensions.length; index++) {
            var dimension = metadata.dimensions[index];
            if (dimension.name === 'time') {
              metadata.timeDimensionEnabled = true;
            }
          }
        }
        return metadata.timeDimensionEnabled;
      }
      return false;
    };
  });

}());
