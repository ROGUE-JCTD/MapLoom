(function() {
  var translations = {
    'new_map': 'Nuevo Mapa',
    'notifications_tab': 'Notificaciones',
    'no_notifications': 'Ninguna notificación',
    'map_layers': 'Capas de Mapa',
    'add_layer_btn': 'Añadir Capa',
    'add_layers': 'Añadir Capas',
    'remove_layer': 'Retirar la Capa',
    'local_geoserver': 'Geoserver Locales',
    'filter_layers': 'Capas Filtrantes',
    'add_new_server': 'Añadir Servidor Nuevo',
    'add_server': 'Añadir Servidor',
    'server_type': 'Tipo',
    'server_name': 'Nombre',
    'server_url': 'URL',
    'close_btn': 'Cerrar',
    'add_btn': 'Añadir',
    'merge_results': 'Combinar los Resultados',
    'cancel_btn': 'Cancelar',
    'done_btn': 'Terminado',
    'remove_btn': 'Eliminar',
    'conflict': 'CONFLICTO',
    'synchronization': 'Sincronización',
    'add_sync': 'Añadir Sinc',
    'merge': 'Unir',
    'config': 'Configuración',
    'repo': 'Repo',
    'remote': 'Remoto',
    'new_remote': 'Nuevo Remoto',
    'add_remote': 'Añadir Remoto',
    'repo_name': 'Nombre',
    'repo_url': 'URL',
    'repo_username': 'Nombre de Usuario',
    'repo_password': 'Contraseña',
    'toggle_menu': 'Menú Palanca',
    'single': 'Una Vez',
    'continuous': 'Continuo',
    'into': 'a'
  };

  var module = angular.module('loom_translations_es', ['pascalprecht.translate']);

  module.config(function($translateProvider) {
    $translateProvider.translations('es', translations);
  });

}());
