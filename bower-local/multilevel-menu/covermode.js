$(document).ready(function(){
	// HTML markup implementation, cover mode
	$( '#menu' ).multilevelpushmenu({
		//containersToPush: [$( '#pushobj' )],
		mode: 'cover',
		/*
		onCollapseMenuEnd: function() {
			$( '#map-container' ).css('width', '94%')
		},
		onExpandMenuStart: function() {
			$( '#map-container' ).css('width', '74%')
		}*/
	});
	// Make the map max size
	var canvasheight=$('#map').parent().css('height');
    var canvaswidth=$('#map').parent().css('width');

    $( '#map' ).css('height', canvasheight);
    $( '#map' ).css('width', canvaswidth);
/*
	// Making title editable
	$( '#map-title' ).bind('dblclick', function() {
		$(this).attr('contentEditable', true);
	}).blur(function() {
		$(this).attr('contentEditable', false);
		// This needs to be fixed
		mapService.title = $(this).val();
	});*/
});