//  flickfastr.js (https://github.com/shuw/flickfastr) may be freely distributed under the MIT license.
//  (c) 2012 Shu Wu

jQuery.fn.flickfastr = function(identifier, api_key, options) {
  options = $.extend({
    photo_size: 'b',                    // Sizes defined here: http://www.flickr.com/services/api/misc.urls.html
    identifier_type: 'user_name',       // ['user_id', 'user_name'] supported
    lightbox: true                      // Whether to open photos using the panorama-enabled lightbox
  }, options)

  var FLICKR_IMG_URL = 'http://farm9.staticflickr.com/{server}/{id}_{secret}_{size}.{format}'
  var FLICKR_PHOTO_URL = 'http://www.flickr.com/photos/{user_id}/{id}'
  var FLICKR_API_URL = 'http://api.flickr.com/services/rest/?format=json'

  var $el = this, $window = $(window), $document = $(document)
  var user_id = null
  var current_page = 1
  var max_pages = null
  var loading_photos = false

  substitute = function(str, sub) {
    return str.replace(/\{(.+?)\}/g, function($0, $1) { return $1 in sub ? sub[$1] : $0; })
  }

  flickr_get = function(method, params, callback) {
    var url = FLICKR_API_URL + "&" + $.param($.extend({ api_key: api_key, method: method, per_page: 10 }, params))
    $.ajax(url, {dataType: "jsonp", jsonpCallback: "jsonFlickrApi", cache: true, success: callback})
  }

  create_photo_el = function(photo, size) {
    return $(substitute('<a id="photo/{id}" class="photo" target="_blank" href="{href}"><img title="{title}" src="{src}"></img><div class="title">{title}</div></a>', {
      id: photo.id,
      href: substitute(FLICKR_PHOTO_URL, {user_id: user_id, id: photo.id}) +
            (photo.media == 'video' ? '/lightbox' : ''),
      title: (photo.title.indexOf('IMG_') !== 0) ? photo.title : '',
      src: substitute(FLICKR_IMG_URL, {
        id: photo.id,
        server: photo.server,
        size: size,
        secret: size == 'o' ? photo.originalsecret : photo.secret,
        format: size == 'o' ? photo.originalformat : 'jpg'
      })
    }))
  }

  show_lightbox = function(photo) {
    // Create lightbox
    $lightbox = $('#flickfastr-lightbox')
    if (!$lightbox.length) {
      $lightbox = $('<div id="flickfastr-lightbox"></div>').css({
        position: 'fixed',
        'overflow-x': 'scroll',
        'background-color': 'black',
        'text-align': 'center',
        width: '100%',
        top: 0,
        left: 0
      }).appendTo('body')
    }

    // Disable body scrolling since lightbox is modal
    original_body_overflow = $('body').css('overflow')
    $('body').css('overflow', 'hidden')

    escape_lightbox = function() {
      $lightbox.stop(true).empty()
      $(document).off('keyup', on_key_up)
      $('body').css('overflow', original_body_overflow)
    }

    // Escape lightbox on 'esc' key
    on_key_up = function(e) { if (e.keyCode == 27) escape_lightbox() }
    $(document).on('keyup', on_key_up)

    // Scale image to fill height
    original_height = parseInt(photo.o_height, 10)
    scale = $(window).height() / original_height
    height = Math.floor(scale * original_height)
    width = Math.floor(scale * parseInt(photo.o_width, 10))

    // Create photo
    // we use the original photo only if we're using > 1300 pixels... otherwise the 1024 scaled image is good enough
    $photo = create_photo_el(photo, width > 1300 ? 'o' : 'b')
      .appendTo($lightbox.empty())
      .click(function() { escape_lightbox(); return false; })
      .focus()
    $img = $photo.find('> img').css({width: width + 'px', height: height + 'px'})

    $('<a class="view_on_flickr" target="_blank">view on flickr</a>')
      .attr('href', $photo.attr('href'))
      .appendTo($lightbox)
      .css({
        position: 'fixed',
        bottom: '5px',
        right: '10px'
      })

    // Animate panning for Panoramas
    overflow_x = width - $(window).width()
    if (overflow_x > 0) {
      $img.load(function() {
        // TODO: this should use CSS transitions where possible
        $lightbox
          .animate({ scrollLeft: overflow_x }, Math.max((overflow_x / 100) * 1000, 2000)) // scroll to left 100 px / second
          .animate({ scrollLeft: overflow_x / 2 }, Math.max((overflow_x / 200) * 1000, 1000)) // scroll back to center 200 px / second

        // Stop panning when user tries to scroll
        $lightbox.on('scroll mousedown DOMMouseScroll mousewheel keydown', function(e) {
          if (e.which > 0 || e.type === "mousedown" || e.type === "mousewheel") {
            $lightbox.stop(true)
          }
        })
      })
    }
  }

  load_photos = function() {
    if (!loading_photos && !(max_pages !== null && current_page > max_pages)) {
      loading_photos = true

      flickr_get('flickr.people.getPublicPhotos', {
        user_id: user_id,
        page: current_page++,
        extras: options.lightbox ? 'original_format, media, o_dims' : ''
      }, function(data) {
        max_pages = data.photos.pages

        $(data.photos.photo).each(function(i, photo) {
          $photo = create_photo_el(photo, options.photo_size).appendTo($el)
          if (options.lightbox && photo.media != 'video') {
            $photo.click(function() { show_lightbox(photo); return false; })
          }
        })
        loading_photos = false
      })
    }
  }

  start_for_user_id = function(id) {
    user_id = id
    maintain_runway = function() {
      runway = $document.height() - $window.scrollTop() - $window.height()
      if (runway < $window.height() * 2) {
        load_photos()
      }
    }
    $(window).scroll(maintain_runway)
    setInterval(maintain_runway, 500) // Also periodically check in case load_photos didn't get enough
    load_photos()
  }

  switch (options.identifier_type) {
    case 'user_id':
      start_for_user_id(identifier)
      break
    case 'user_name':
      flickr_get('flickr.people.findByUsername', {
        username: identifier
      }, function(data) {
        if (data.user.id) {
          start_for_user_id(data.user.id)
        } else {
          $el.text("could not find user name: " + identifier)
        }
      })
      break
    default:
      throw "Unsupported identifier type: " + options.identifier_type
  }
  return this
}