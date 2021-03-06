//  flickfastr.js (https://github.com/shuw/flickfastr) may be freely distributed under the MIT license.
//  (c) 2012 Shu Wu

/* global $, window, document, setInterval */

$.fn.flickfastr = function(identifier, api_key, options) {
  "use strict";

  // special case iPhone as non-retina so we don't download big images over slow connections
  var devicePixelRatio = (!window.navigator.userAgent.match(/iPhone/i) && window.devicePixelRatio) || 1;
  var retina = devicePixelRatio >= 2;

  options = $.extend({
    viewer_width: 1024,
    photo_size: retina ? 'k' : 'b',     // Sizes defined here: https://www.flickr.com/services/api/misc.urls.html
    identifier_type: 'user_name',       // ['user_id', 'user_name'] supported
    lightbox: true                      // Whether to open photos using the panorama-enabled lightbox
  }, options);

  var FLICKR_IMG_URL = 'https://farm{farm}.staticflickr.com/{server}/{id}_{secret}_{size}.{format}';
  var FLICKR_PHOTO_URL = 'https://www.flickr.com/photos/{user_id}/{id}';
  var FLICKR_API_URL = 'https://api.flickr.com/services/rest/?format=json';

  var $el = this, $window = $(window), $document = $(document);
  var user_id = null;
  var current_page = 1;
  var max_pages = null;
  var loading_photos = false;
  var all_photos = [];

  var substitute = function(str, sub) {
    return str.replace(/\{(.+?)\}/g, function($0, $1) { return $1 in sub ? sub[$1] : $0; });
  };

  var flickr_get = function(method, params, callback) {
    var url = FLICKR_API_URL + "&" + $.param($.extend({ api_key: api_key, method: method, per_page: 10 }, params));
    $.ajax(url, {dataType: "jsonp", jsonpCallback: "jsonFlickrApi", cache: true, success: callback});
  };

  var create_photo_el = function(photo, size) {
    var url;
    if (size === 'k') {
      if (photo.url_k) {
        url = photo.url_k;
      } else {
        size = 'b'; // no k (2048px) size available
      }
    }

    if (!url) {
      url = substitute(FLICKR_IMG_URL, {
        farm: photo.farm || 1,
        id: photo.id,
        server: photo.server,
        size: size,
        secret: size === 'o' ? photo.originalsecret : photo.secret,
        format: size === 'o' ? photo.originalformat : 'jpg'
      });
    }
 
    var title =  (photo.title.match(/DSC[0-9]+/) || photo.title.match(/IMG_.*/)) ? '' : photo.title;

    return $(substitute('<a id="photo_{id}" class="photo" target="_blank" href="{href}"><img title="{title}" src="{src}"></img><div class="title">{title}</div></a>', {
      id: photo.id,
      href: substitute(FLICKR_PHOTO_URL, {user_id: user_id, id: photo.id}) +
            (photo.media == 'video' ? '/lightbox' : ''),
      title: title,
      src: url
    }));
  };

  var show_lightbox = function(photo) {
    // Create lightbox
    var $lightbox = $('#flickfastr-lightbox');
    if (!$lightbox.length) {
      $lightbox = $('<div id="flickfastr-lightbox"></div>').
        css({
          position: 'fixed',
          'overflow-x': 'scroll',
          'background-color': 'black',
          'text-align': 'center',
          'overflow-y': 'hidden',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0
        }).
        appendTo('body').
        click(function(e) {
          if (e.target.nodeName !== 'A') {
            escape_lightbox();
            return false;
          }
        });
    }

    // Disable body scrolling since lightbox is modal
    var original_body_overflow = $('body').css('overflow');
    $('body').css('overflow', 'hidden');

    var escape_lightbox = function() {
      $lightbox.hide().stop(true).empty();
      $(document).off('keyup', on_key_up);
      $('body').css('overflow', original_body_overflow);
    };
    $lightbox.empty().show();

    var on_key_up = function(e) {
      var increment;
      switch (e.keyCode) {
        case 27:
          // Escape key
          escape_lightbox();
          return;
        case 37:
        case 38:
        case 75:
          // If left or up arrow key or k then we are moving to previous photo
          increment = -1;
          break;
        case 34:
        case 39:
        case 74:
          // If right or down arrow key or j then we are moving to next photo
          increment = 1;
          break;
        default:
          return;
      }

      var index = all_photos.indexOf(photo);
      if (index < 0) return;
      index += increment;
      if (index >= 0 && index < all_photos.length) {
        escape_lightbox();
        var photo_next = all_photos[index];
        show_lightbox(photo_next);
        var $photo = $el.find('.photo#photo_' + photo_next.id);
        document.body.scrollTop = $photo.offset().top - Math.floor($(window).height() * 0.05);
      }
    };
    $(document).on('keyup', on_key_up);

    // Scale image to fill height
    var scale = $(window).height() / photo.height;
    var height = Math.floor(scale * photo.height);
    var width = Math.floor(scale * photo.width, 10);
    var required_resolution = Math.max(width, height) * devicePixelRatio;

    // Calculate lowest image size that will be decent to display
    // allow some upscaling (hence the multiplier)
    var size;
    if (required_resolution <= 1024 * 1.3) {
      size = 'b';
    } else if (required_resolution <= 2048 * 1.6) {
      size = 'k';
    } else {
      size = 'o';
    }

    // Create photo
    var $photo = create_photo_el(photo, size);
    var $img = $photo.find('img').
      appendTo($lightbox).focus();
    $img.css({width: width + 'px', height: height + 'px'});

    $('<a class="view_on_flickr" target="_blank">open in flickr</a>').
      attr('href', $photo.attr('href')).
      appendTo($lightbox).
      css({
        position: 'fixed',
        top: '10px',
        right: '20px'
      });

    // Animate panning for Panoramas
    var overflow_x = width - $(window).width();
    if (overflow_x > 0) {
      $img.load(function() {
        // TODO: this should use CSS transitions where possible
        $lightbox.
          animate({ scrollLeft: overflow_x }, Math.max((overflow_x / 100) * 1000, 2000)). // scroll to left 100 px / second
          animate({ scrollLeft: overflow_x / 2 }, Math.max((overflow_x / 200) * 1000, 1000)); // scroll back to center 200 px / second

        // Stop panning when user tries to scroll
        $lightbox.on('scroll mousedown DOMMouseScroll mousewheel keydown touchstart', function(e) {
          if (e.which > 0 || e.type === "mousedown" || e.type === "mousewheel" || e.type == "touchstart") {
            $lightbox.stop(true);
          }
        });
      });
    }
  };

  var load_photos = function() {
    if (!loading_photos && !(max_pages !== null && current_page > max_pages)) {
      loading_photos = true;

      // loading url_z yields the dimensions for big photos
      // and url_z for videos
      var extras = ['media', 'url_k', 'url_z', 'original_format'];
      flickr_get('flickr.people.getPublicPhotos', {
        user_id: user_id,
        page: current_page,
        extras: extras.join(', ')
      }, function(data) {
        max_pages = data.photos.pages;

        $(data.photos.photo).each(function(i, photo) {
          all_photos.push(photo);
          var $photo = create_photo_el(photo, options.photo_size).appendTo($el);

          // scale to fit in box
          photo.width = parseInt(photo.width_k || photo.width_z, 10);
          photo.height = parseInt(photo.height_k || photo.height_z, 10);
          var scale = Math.min(options.viewer_width / photo.width, options.viewer_width / photo.height);
          if (scale) {
            $photo.find('img').css({
              width: Math.floor(scale * photo.width) + 'px',
              height: Math.floor(scale * photo.height) + 'px'
            });
          } else {
            $photo.find('img').css({
              width: options.viewer_width + 'px',
            });
          }

          if (options.lightbox && photo.media != 'video') {
            $photo.click(function() { show_lightbox(photo); return false; });
          }
        });
        loading_photos = false;
      });

      current_page++;
    }
  };

  var start_for_user_id = function(id) {
    user_id = id;
    var maintain_runway = function() {
      var runway = $document.height() - $window.scrollTop() - $window.height();
      if (runway < $window.height() * 2) {
        load_photos();
      }
    };
    $(window).scroll(maintain_runway);
    setInterval(maintain_runway, 500); // Also periodically check in case load_photos didn't get enough
    load_photos();
  };

  switch (options.identifier_type) {
    case 'user_id':
      start_for_user_id(identifier);
      break;
    case 'user_name':
      flickr_get('flickr.people.findByUsername', {
        username: identifier
      }, function(data) {
        if (data.user.id) {
          start_for_user_id(data.user.id);
        } else {
          $el.text("could not find user name: " + identifier);
        }
      });
      break;
    default:
      throw "Unsupported identifier type: " + options.identifier_type;
  }
  return this;
};
