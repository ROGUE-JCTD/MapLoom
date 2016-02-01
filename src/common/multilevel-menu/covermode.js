$(document).ready(function(){
	// HTML markup implementation, cover mode
	$( '#menu' ).multilevelpushmenu({
		containersToPush: [$( '#pushobj' )],
		mode: 'cover',
	});

	$( '#addchapter' ).click(function(){
        var $addTo = $('#menu').multilevelpushmenu('activemenu').first();
        console.log($addTo);
        console.log($addTo.length);
        // Use $addTo's length for position?
        $( '#menu' ).multilevelpushmenu( 'additems' , addChapter , $addTo , 0 );
    });

    // Adding a new default chapter
    // Chapter #
    // Default Title = Untitled Chapter
    var addChapter = [
	    {
	    	name: 'Chapter #',
	    	link: '#',
	    	items: [
		    	{
		    		title: 'Chapter #',
		    		icon: 'fa fa-bookmark',
		    		items: [
			    		{
			    			name: 'Chapter Info',
			    			icon: 'fa fa-info-circle',
			    			link: '#'
			    		},
			    		{
			    			name: 'StoryLayers',
			    			icon: 'fa fa-clone',
			    			link: '#'
			    		},
			    		{
			    			name: 'StoryBoxes',
			    			icon: 'fa fa-object-group',
			    			link: '#'
			    		},
			    		{
			    			name: 'StoryPins',
			    			icon: 'fa fa-neuter',
			    			link: '#'
			    		},
			    		{
			    			name: 'Delete Chapter',
			    			id: 'chapterDelete',
			    			icon: 'fa fa-trash-o',
			    			link: '#'
			    		}
		    		]
		    	}
	    	]
	    }
    ];

    // Spawn chapter delete modal
    $( '.chapterDelete' ).click(function() {
    	$('#chapterDelete').modal('show');
    });

});