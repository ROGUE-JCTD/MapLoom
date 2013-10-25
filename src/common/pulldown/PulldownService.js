(function() {
  var module = angular.module('loom_pulldown_service', []);

  // Private Variables
  var rootScope_ = null;
  var timeout_ = null;

  module.provider('pulldownService', function() {

    this.diffPanel = false;
    this.notificationsPanel = true;
    this.layersPanel = true;

    this.$get = function($rootScope, $timeout) {
      rootScope_ = $rootScope;
      timeout_ = $timeout;
      return this;
    };

    this.apply = function() {
      rootScope_.$broadcast('refresh-pulldown');
    };

    this.conflictsMode = function() {
      this.diffPanel = true;
      this.notificationsPanel = false;
      this.layersPanel = true;
      this.apply();
      timeout_(function() {
        $('#diff-panel').collapse('show');
      }, 1);
    };

    this.defaultMode = function() {
      this.diffPanel = false;
      this.notificationsPanel = true;
      this.layersPanel = true;
      this.apply();
      timeout_(function() {
        $('#layer-manager-panel').collapse('show');
      }, 1);
    };
  });

}());
