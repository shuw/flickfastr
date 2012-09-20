//  flickfastr.js (https://github.com/shuw/flickfastr) may be freely distributed under the MIT license.
//  (c) 2012 Shu Wu

jQuery.fn.flickfastr = function(identifier, api_key, options) {
  options = $.extend({
    photo_size: 'b',                  // Sizes defined here: http://www.flickr.com/services/api/misc.urls.html
    identifier_type: 'user_name'      // ['user_id', 'user_name'] supported
  }, options)

  var FLICKR_IMG_URL = 'http://farm9.staticflickr.com/{server}/{id}_{secret}_{size}.jpg'
  var FLICKR_PHOTO_URL = 'http://www.flickr.com/photos/{user_id}/{id}'
  var FLICKR_API_URL = 'http://api.flickr.com/services/rest/?format=json'
  var PHOTO_HTML = '<a id="photo/{id}" class="photo" target="_blank" href="{href}"><img title="{title}" src="{src}"></img><div class="title">{title}</div></a>'

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

  load_photos = function() {
    if (!loading_photos && !(max_pages !== null && current_page > max_pages)) {
      loading_photos = true

      flickr_get('flickr.people.getPublicPhotos', {
        user_id: user_id,
        page: current_page++
      }, function(data) {
        max_pages = data.photos.pages

        $(data.photos.photo).each(function(i, photo) {
          $(substitute(PHOTO_HTML, {
            id: photo.id,
            href: substitute(FLICKR_PHOTO_URL, {user_id: user_id, id: photo.id}),
            title: (photo.title.indexOf('IMG_') !== 0) ? photo.title : '',
            src: substitute(FLICKR_IMG_URL, {
              id: photo.id,
              secret: photo.secret,
              server: photo.server,
              size: options.photo_size
            })
          })).appendTo($el)
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