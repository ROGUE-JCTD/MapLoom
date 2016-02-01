$(document).ready(function(){
	// HTML markup implementation, cover mode
	$( '#menu' ).multilevelpushmenu({
		//containersToPush: [$( '#pushobj' )],
		mode: 'cover',
	});

	$( '#addchapter' ).click(function(){
		// Grab title from angular?
        //var $addTo = $( '#menu' ).multilevelpushmenu( 'findmenusbytitle' , 'New MapStory' ).first();
        var $addTo = $('#menu').multilevelpushmenu('activemenu');
        console.log($addTo);
        console.log($addTo.length);
        // Use $addTo's length?
        $( '#menu' ).multilevelpushmenu( 'additems' , addChapter , $addTo , 0 );
    });

    // Adding a new default chapter
    // Chapter #
    // Default Title = Untitled Chapter
    var addChapter = [
    ];

    // Spawn chapter delete modal
    $( '.chapterDelete' ).click(function() {
    	$('#chapterDelete').modal('show');
    });

});