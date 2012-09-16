(function() {

  window.fastphoto = function(el, user_name, api_key, options) {
    // Sizes defined [here](http://www.flickr.com/services/api/misc.urls.html)
    options = $.extend({ photo_size: 'b'}, options)
    photo_url_format = "http://farm9.staticflickr.com/{server}/{id}_{secret}_" + options.photo_size + ".jpg"

    $el = $(el)
    user_id = null, current_page = 1, max_pages = null, loading_photos = false

    resolve_user_name = function() {
      url = flickr_get('flickr.people.findByUsername', {
        username: user_name
      }, function(data) {
        if (data.user.id) {
          start_for_user(data.user.id)
        } else {
          $el.text("could not find user name: " + user_name)
        }
      })
    }

    start_for_user = function(id) {
      user_id = id
      $(window).scroll(maintain_runway)
      // Also periodically check in case load_photos didn't get enough
      // or we we tried to load_photos while a previous load was already in progress
      setInterval(maintain_runway, 500)
      load_photos()
    }

    maintain_runway = function() {
      runway = $(document).height() - ($(window).scrollTop() + $(window).height())
      if (runway < ($(window).height() * 2)) {
        load_photos()
      }
    }

    load_photos = function() {
      if (loading_photos || (max_pages != null && current_page > max_pages)) return
      loading_photos = true

      flickr_get('flickr.people.getPublicPhotos', {
        user_id: user_id,
        page: current_page++
      }, function(data) {
        if (max_pages == null) max_pages = data.photos.pages

        for (var i = 0; i < data.photos.photo.length; i++) {
          photo = data.photos.photo[i]
          photo_src = substitute(photo_url_format, {
            id: photo.id,
            secret: photo.secret,
            server: photo.server
          })

          // Clean up titles
          if (photo.title.indexOf('IMG_') == 0) photo.title = ''

          html = substitute(PHOTO_TEMPLATE, {
            id: photo.id,
            href: substitute(FLICKR_PHOTO_URL, {user_id: user_id, id: photo.id}),
            src: photo_src,
            title: photo.title
          })

          $(html).appendTo($el)
        }
        loading_photos = false
      })

    }

    flickr_get = function(method, params, callback) {
      params = $.extend({
        "api_key": api_key,
        "method": method,
        "per_page": 10
      }, params)

      $.ajax(FLICKR_API_URL + "&" + $.param(params), {
        dataType: "jsonp",
        cache: true,
        jsonpCallback: "jsonFlickrApi",
        success: function(data, status) {
          callback(data, status)
        }
      })
    }

    resolve_user_name()
  }


  FLICKR_PHOTO_URL = 'http://www.flickr.com/photos/{user_id}/{id}'
  FLICKR_API_URL = 'http://api.flickr.com/services/rest/?format=json'
  PHOTO_TEMPLATE =
    '<a id="photo/{id}" class="photo" target="_blank" href="{href}">\
      <img title="{title}" src="{src}"></img>\
      <div class="label">{title}</div>\
    </a>'


  substitute = function(str, sub) {
    return str.replace(/\{(.+?)\}/g, function($0, $1) {
      return $1 in sub ? sub[$1] : $0;
    });
  };

})()