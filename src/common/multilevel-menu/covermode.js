$(document).ready(function() {
  // HTML markup implementation, cover mode
  $('#menu').multilevelpushmenu({
    containersToPush: [$('pushobj')],
    mode: 'cover',
    onItemClick: function() {
      $item = arguments[2];
      var idOfClicked = $item[0].id;
      // If the item has the id 'deleteChapter', then spawn the modal
      if (idOfClicked === 'deleteChapter') {
        $('#chapterDelete').modal('show');
      }
    },
    onCollapseMenuEnd: function() {
      // Only if the entire menu is deactivated, expand map
      var active = $('#menu').multilevelpushmenu('activemenu');
      console.log(active);
      if (active.prevObject.length === 0) {
        $('#pushobj').css('width', '94%');
      }
    },
    onExpandMenuStart: function() {
      $('#pushobj').css('width', '74%');
    }
  });

  // Create chapter to add
  // TODO: Use actual number
  /*
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
              id: 'deleteChapter',
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

  // Fully delete the chapter - wip
  $('#removeChapter').click(function() {
    console.log('Removing chapter');
    var item = $('#menu').multilevelpushmenu('finditemsbyname', 'Chapter #');
    $('#menu').multilevelpushmenu('removeitems', item);
  });*/
});
