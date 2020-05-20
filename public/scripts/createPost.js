
//Remove the default text display on input field
if ($('#addFile').val() === "") {
    $('#addFile').css('color', 'transparent');
}

/**
 *
 * @param fileList the list of files selected by the user
 */
function addAttachment(fileList) {
    if (fileList.files) {
        let length = fileList.files.length;
        //Check to ee how many images already attached to enforce 4 image limit
        const child = $('#previewArea').children('img').length;
        if((length + child) > 3) {
            $('#tooManyImage').show();
            length = 3 - child;
        }
        //If the list are valid files then iterate over the list...
        for (let i = 0; i < length; i++) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                //Create new preview for each image in the list and append it to the preview area
                $('<img />', {
                    src: evt.target.result,
                    alt: 'Images selected by user',
                    width: '32%',
                    height: '100%',
                    id: ('image' + i),
                    class: 'uploadImages',
                    name: ('image' + i),
                    click: function(e) {
                        showImagePreview(('image' + i))
                    },
                    css: {
                        paddingBottom: '25px',
                        paddingLeft: '3%'
                    }

                }).appendTo('#previewArea');
            };
            reader.readAsDataURL(fileList.files[i]);
        }
    }
}

$('#addFile').change(function() {
    addAttachment(this);
    addImgPreview();
});


/**
 *
 * @param imageID the id of the image to be previewed
 */
function addImgPreview(imageID) {
    //Remove any previous images from content area
    $('#previewBody').empty();
    var source =  $('#' + imageID).attr('src');
    $('<img />', {
        src: source,
        width: '100%',
        height: '100%',
        id: ('rm' + imageID)
    }).appendTo($('#previewBody'));
}


/**
 *
 * @param source the id of the image to be previewed
 */
function showImagePreview(source) {
    addImgPreview(source);
    var img = $('#imagePreview');
    //Show modal with the image preview
    img.modal({
        backdrop: true
    });
    img.on('shown.bs.modal', function () {
        $('#imagePreview').trigger('focus')
    });
}

/**
 * Remove the picture displayed in the modal from attachment list
 */
function removePicture() {
    let toRemove = undefined;
    $('#previewBody').children('img').each(function (){
        toRemove = $(this).attr('id');
    });
    //Remove the first part of id to get actual image ref
    toRemove = toRemove.substring(2);
    $('#' + toRemove).remove();
    $('#imagePreview').modal('hide');

}

/**
 *
 * @returns {[]} An array of images uploaded by the user (maximum 4)
 */
function getImages() {
    var images = [];
    let i = 0;
    //Iterate over first 4 images, break when the element id does not exist (i.e. no image to get)
    $('#previewArea').children('img').each(function (){
        images[i] = $(this).attr('src');
        i++;
    });
    return images;
}

/**
 * Function for submitting the post
 */
$('#submitPost').click(function() {
    var text = $('#storyContent').val();
    const images = getImages();
    //If no text and images, throw error, if no text but images then confirm submission with user
    if(text === '' && images.length === 0) {
        $('#postError').show();
    }else if(text === '') {
        $('#postWarning').show();
    }else {
        //Trigger form submission
        $('#submitStory').trigger('click');
        $('#success').show();
    }
});

function hasGetUserMedia() {
    return !!(navigator.mediaDevices.getUserMedia ||
      navigator.mediaDevices.webkitGetUserMedia ||
      navigator.mediaDevices.mozGetUserMedia ||
      navigator.mediaDevices.msGetUserMedia);}

if (hasGetUserMedia()) {
    // Good to go!
    console.log("CLEARCLEARLCREARRGOADNOAG");
} else {
    alert('getUserMedia() is not supported in your browser');
}

function prepareVideo(camid) {
    // MediaStreamTrack.getSources(getSources);
    var session = {
        audio: false,
        video: {
            // if camera id not null, use it, otherwise select any
            deviceId: camid ? {exact: camid} : true,
            // to choose the back camera use:
            // facingMode: 'environment',
            // needs a minimum frame rate or it will not work
            //https://github.com/webrtc/samples/issues/922
            frameRate: {
                min: 10 },},};
    navigator.mediaDevices.getUserMedia(session)
      .then(async mediaStream => {
          // Chrome crbug.com/711524 requires await sleep
          new Promise(res => setTimeout(res, 1000))
          gotStream(mediaStream);})
      .catch(function (e) {
          alert('Not supported on this device. Update your browser: ' + e.message);
      });
    var video = document.querySelector('video');
    var canvas = document.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var localMediaStream = null;
    video.addEventListener('click', snapshot, false);

    function errorCallback() {
        console.log("error");
    }

    navigator.mediaDevices.getUserMedia({video: true}, function(stream) {
        video.src = window.URL.createObjectURL(stream);
        localMediaStream = stream;
    }, errorCallback);
    function snapshot() {
        if (localMediaStream) {
            ctx.drawImage(video, 0, 0);
            document.querySelector('img').src
              = canvas.toDataURL('image/png');
        }
    }
}

prepareVideo(null)
