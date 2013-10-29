(function() {
  var module = angular.module('loom_pulldown_service', []);

  // Private Variables
  var rootScope_ = null;
  var timeout_ = null;

  var PulldownPanel = function(visible, enabled) {
    this.visible = visible;
    this.enabled = enabled;

    this.getVisible = function() {
      return this.visible && this.enabled;
    };
  };

  module.provider('pulldownService', function() {

    this.diffPanel = new PulldownPanel(false, false);
    this.notificationsPanel = new PulldownPanel(true, true);
    this.layersPanel = new PulldownPanel(true, true);
    this.syncPanel = new PulldownPanel(true, false);

    this.$get = function($rootScope, $timeout) {
      rootScope_ = $rootScope;
      timeout_ = $timeout;
      return this;
    };

    this.apply = function() {
      rootScope_.$broadcast('refresh-pulldown');
    };

    this.conflictsMode = function() {
      this.diffPanel.visible = true;
      this.notificationsPanel.visible = false;
      this.layersPanel.visible = true;
      this.syncPanel.visible = false;
      this.apply();
      timeout_(function() {
        $('#diff-panel').collapse('show');
      }, 1);
    };

    this.defaultMode = function() {
      this.diffPanel.visible = true;
      this.notificationsPanel.visible = true;
      this.layersPanel.visible = true;
      this.syncPanel.visible = true;
      this.apply();
      timeout_(function() {
        $('#layer-manager-panel').collapse('show');
      }, 1);
    };
  });

}());
