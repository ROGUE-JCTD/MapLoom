$(document).ready(function(){
	// HTML markup implementation, cover mode
	$( '#menu' ).multilevelpushmenu({
		//containersToPush: [$( '#pushobj' )],
		mode: 'cover',
		onCollapseMenuEnd: function() {
			$( '#map-container' ).css('width', '94%')
		},
		onExpandMenuStart: function() {
			$( '#map-container' ).css('width', '74%')
		}
	});
});