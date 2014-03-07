(function() {
  angular.module('loom_diff', [
    'loom_diff_list_directive',
    'loom_diff_service',
    'loom_diff_panel_directive',
    'loom_feature_diff_directive',
    'loom_feature_diff_service',
    'loom_feature_diff_controller',
    'loom_feature_panel_directive',
    'loom_panel_separator_directive',
    'loom_feature_blame_service'
  ]);
}());
