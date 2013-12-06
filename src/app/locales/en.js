(function() {
  var translations = {
    'new_map': 'New Map',
    'notifications_tab': 'Notifications',
    'no_notifications': 'No notifications',
    'map_layers': 'Map Layers',
    'add_layer_btn': 'Add Layer',
    'add_layers': 'Add Layers',
    'remove_layer': 'Remove Layer',
    'local_geoserver': 'Local Geoserver',
    'filter_layers': 'Filter Layers',
    'add_new_server': 'Add New Server',
    'add_server': 'Add Server',
    'server_type': 'Type',
    'server_name': 'Name',
    'server_url': 'URL',
    'close_btn': 'Close',
    'add_btn': 'Add',
    'merge_results': 'Merge Results',
    'cancel_btn': 'Cancel',
    'done_btn': 'Done',
    'remove_btn': 'Remove',
    'conflict': 'CONFLICT',
    'synchronization': 'Synchronization',
    'add_sync': 'Add Sync',
    'merge': 'Merge',
    'config': 'Config',
    'repo': 'Repo',
    'remote': 'Remote',
    'new_remote': 'New Remote',
    'add_remote': 'Add Remote',
    'repo_name': 'Repo Name',
    'repo_url': 'URL',
    'repo_username': 'Username',
    'repo_password': 'Password',
    'toggle_menu': 'Toggle Menu',
    'single': 'Single',
    'continuous': 'Continuous',
    'into': 'into'
  };

  var module = angular.module('loom_translations_en', ['pascalprecht.translate']);

  module.config(function($translateProvider) {
    $translateProvider.translations('en', translations);
  });

}());
