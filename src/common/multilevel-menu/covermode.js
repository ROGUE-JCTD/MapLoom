$(document).ready(function() {
  // HTML markup implementation, cover mode
  $('#menu').multilevelpushmenu({
    containersToPush: [$('pushobj')],
    mode: 'cover',
    onItemClick: function() {
      // TODO: Check if "delete" was clicked, maybe add as well?
    }
  });

  // Create chapter to add
  // TODO: Use actual number
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
              icon: 'fa fa-trash-o',
              link: '#'
            }
          ]
        }
      ]
    }
  ];

  $('#addchapter').click(function() {
    var $addTo = $('#menu').multilevelpushmenu('activemenu').first();
    // Check what the 0 does
    $('#menu').multilevelpushmenu('additems', addChapter, $addTo, 0);
  });

  // Spawn chapter delete modal
  $('#deleteChapter').click(function() {
    $('#chapterDelete').modal('show');
  });
});
