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

    this.diffPanel = new PulldownPanel(true, false);
    this.notificationsPanel = new PulldownPanel(true, true);
    this.layersPanel = new PulldownPanel(true, true);
    this.storyboxPanel = new PulldownPanel(true, true);
    this.syncPanel = new PulldownPanel(true, false);
    this.historyPanel = new PulldownPanel(true, false);
    this.toggleEnabled = true;
    this.addLayers = true;
    this.serversLoading = false;
    this.addStorybox = true;

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
      this.historyPanel.visible = false;
      this.addLayers = false;
      this.storyboxPanel.visible = false;
      this.addStorybox = false;
      rootScope_.$broadcast('conflict_mode');
      this.apply();
      this.showDiffPanel();
    };

    this.defaultMode = function() {
      this.diffPanel.visible = true;
      this.notificationsPanel.visible = true;
      this.layersPanel.visible = true;
      this.syncPanel.visible = true;
      this.historyPanel.visible = true;
      this.addLayers = true;
      this.storyboxPanel.visible = true;
      this.addStorybox = true;
      rootScope_.$broadcast('default_mode');
      this.apply();
      this.showLayerPanel();
      this.showStoryboxPanel();
    };

    this.showHistoryPanel = function() {
      timeout_(function() {
        $('#history-panel').collapse('show');
      }, 1);
    };

    this.showDiffPanel = function() {
      timeout_(function() {
        $('#diff-panel').collapse('show');
      }, 1);
    };

    this.showLayerPanel = function() {
      timeout_(function() {
        $('#layer-manager-panel').collapse('show');
      }, 1);
    };

    this.showStoryboxPanel = function() {
      timeout_(function() {
        $('#storybox-manager-panel').collapse('show');
      }, 1);
    };


  });

}());
