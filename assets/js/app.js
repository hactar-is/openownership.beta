// 1. Foundation
// --------------------

Foundation.Interchange.SPECIAL_QUERIES['medium-retina'] = 'only screen and (min-width: 40em), (min-width: 40em) and (-webkit-min-device-pixel-ratio: 2), (min-width: 40em) and (min--moz-device-pixel-ratio: 2), (min-width: 40em) and (-o-min-device-pixel-ratio: 2/1), (min-width: 40em) and (min-device-pixel-ratio: 2), (min-width: 40em) and (min-resolution: 192dpi), (min-width: 40em) and (min-resolution: 2dppx)';
Foundation.Interchange.SPECIAL_QUERIES['large-retina'] = 'only screen and (min-width: 64em), (min-width: 64em) and (-webkit-min-device-pixel-ratio: 2), (min-width: 64em) and (min--moz-device-pixel-ratio: 2), (min-width: 64em) and (-o-min-device-pixel-ratio: 2/1), (min-width: 64em) and (min-device-pixel-ratio: 2), (min-width: 64em) and (min-resolution: 192dpi), (min-width: 64em) and (min-resolution: 2dppx)';
Foundation.Interchange.SPECIAL_QUERIES['xlarge-retina'] = 'only screen and (min-width: 75em), (min-width: 75em) and (-webkit-min-device-pixel-ratio: 2), (min-width: 75em) and (min--moz-device-pixel-ratio: 2), (min-width: 75em) and (-o-min-device-pixel-ratio: 2/1), (min-width: 75em) and (min-device-pixel-ratio: 2), (min-width: 75em) and (min-resolution: 192dpi), (min-width: 75em) and (min-resolution: 2dppx)';
Foundation.Interchange.SPECIAL_QUERIES['xxlarge-retina'] = 'only screen and (min-width: 90em), (min-width: 75em) and (-webkit-min-device-pixel-ratio: 2), (min-width: 75em) and (min--moz-device-pixel-ratio: 2), (min-width: 75em) and (-o-min-device-pixel-ratio: 2/1), (min-width: 75em) and (min-device-pixel-ratio: 2), (min-width: 75em) and (min-resolution: 192dpi), (min-width: 75em) and (min-resolution: 2dppx)';

$(document).foundation();

// 3. Map page
// --------------------

$(function(){
  // Jquery object for the map container
  var $map = $('.world-map');

  // Don't run on pages without a map
  if($map.length == 0) {
    return
  }

  // Object for the jvectormap map object
  var map;
  // Jquery object for the country dom nodes where our initial data lives
  var $countries = $('.country');
  // Object for our parsed country data, will be indexed by ISO2 code
  var countries = {};
  var $allCountriesButton = $('.see-all-countries-button');
  var $filters = $('.map-filters select');

  // Parse the countries data from the given dom nodes (as a JQuery selection)
  function parseCountries($countries) {
    var parsed = {};

    $countries.each(function(index, country) {
      var $country = $(country);
      var data = $country.data();
      var $tooltip = $($country.find('.callout').first()[0].outerHTML)
      $tooltip.removeClass('large shadow');
      $tooltip.find('.links').remove();
      $tooltip.find('.commitments').remove();
      $tooltip.find('.news').remove();
      $tooltip.find('.country-footer').remove();
      parsed[data.iso2] = Object.assign(data, {tooltipContent: $tooltip[0].outerHTML});
    });

    return parsed;
  };

  // Build jvector map marker data for every country given
  function countryMarkers(countries) {
    return Object.keys(countries)
      .filter(function(iso2) { return countries[iso2].involved })
      .map(function(iso2) {
        return {
          latLng: [countries[iso2].capitalLat, countries[iso2].capitalLon],
          name: countries[iso2].name,
          iso2: iso2
        };
      });
  };

  // Build jvector map series data for each country to control region colouring
  // based on commitment level
  function countryCommitmentLevels(countries) {
    levels = {};
    $.each(countries, function(index, country) {
      levels[country.iso2] = country.commitmentLevel;
    });
    return levels;
  };

  // Build baseline jvector map series data for each country, i.e. to set
  // everything to zero
  function baselineCountryCommitmentLevels() {
    levels = {};
    $.each(countries, function(index, country) {
      levels[country.iso2] = 0;
    });
    return levels;
  };

  function filterCountries(filter) {
    // Work out what we're showing
    var $filteredCountries = $countries;
    if(filter) {
      $filteredCountries = $filteredCountries.filter(filter);
    }
    var filteredCountries = {};
    $filteredCountries.each(function(index, country) {
      var iso2 = $(country).data('iso2');
      filteredCountries[iso2] = countries[iso2];
    });

    // Clear the map and grid out
    destroyTooltips(countries);
    map.series.regions[0].setValues(baselineCountryCommitmentLevels());
    map.removeAllMarkers();
    $countries.hide();

    // Rebuild it
    map.series.regions[0].setValues(countryCommitmentLevels(filteredCountries));
    map.addMarkers(countryMarkers(filteredCountries));
    buildTooltips(filteredCountries);
    $filteredCountries.show();
  }

  function indexMarkers() {
    indexed = {};
    // Markers are not indexed by country code, so build our own index of
    // iso code -> dom node for ease of initialising tooltips
    $.each(map.markers, function(index, marker) {
      indexed[marker.config.iso2] = marker.element.shape.node;
    });
    return indexed;
  }

  function destroyTooltips() {
    $.each(countries, function(index, country) {
      if(country.tooltip) {
        country.tooltip.destroy();
      }
    });
  }

  function buildTooltips(countries) {
    markers = indexMarkers();
    $.each(countries, function(index, country) {
      var region = map.regions[country.iso2];
      var marker = markers[country.iso2];
      var targets = []
      if(marker) {
        targets.push(marker)
      }
      if(region) {
        // In older jvectormap versions, the region held a direct reference to
        // DOM node we could attach an event to, but now it wraps that in an
        // invisible path which has a margin, to allow better UX, which isn't
        // stored in the region, so we have to find the DOM node ourself
        targets.push($('.jvectormap-region[data-code="' + country.iso2 + '"]')[0]);
      }
      if(targets.length === 0) {
        return;
      }
      options = {
        theme: 'light',
        content: country.tooltipContent,
        allowHTML: true,
        triggerTarget: targets,
        touch: false,
        appendTo: function() { return document.body; },
        delay: 0,
        duration: 0,
        maxWidth: 450
      };
      // We put the tooltip on the marker if we have both, so that it always
      // appears in the same place and we don't get duplicates
      country.tooltip = tippy(targets[0], options);
    });
  }

  function filterValues() {
    var values = {};
    $filters.each(function(index, select) {
      var value = $(select).val();
      if(value !== '') {
        values[$(select).attr('name')] = value;
      }
    });
    return values;
  }

  function filterBySelections() {
    var values = Object.values(filterValues());
    if(values.length === 0) {
      filterCountries();
    } else {
      // We AND together multiple filters so join them into one string:
      // https://api.jquery.com/multiple-attribute-selector/
      var filters = values.map(function(value) {
        return '[data-'+ value + '=true]';
      }).join('');
      filterCountries(filters);
    }
  }

  function filterByCountry(iso2) {
    filterCountries('[data-iso2="' + iso2 + '"]');
  }

  function selectCountry(iso2) {
    if(countries[iso2]) {
      window.location.hash = iso2;
      $filters.prop('disabled', 'disabled');
      filterByCountry(iso2);
      $allCountriesButton.show();
    }
  }

  function clearSelectedCountry() {
    window.location.hash = '#map';
    $filters.prop('disabled', false);
    $allCountriesButton.hide();
    filterBySelections();
  }

  function regionClick(e, iso2) {
    selectCountry(iso2);
  }

  function markerClick(e, index) {
    var iso2 = map.markers[index].config.iso2;
    selectCountry(iso2);
  }

  function setFiltersFromURL() {
    var urlParams = new URLSearchParams(location.search.substr(1));
    var commitment = urlParams.get('commitment');
    var register = urlParams.get('register');
    if(commitment) {
      $filters
        .filter('[name="commitment"]')
        .find('option[value="' + commitment + '"]')
        .prop('selected', true);
    }
    if(register) {
      $filters
        .filter('[name="register"]')
        .find('option[value="' + register + '"]')
        .prop('selected', true);
    }
    if(commitment || register) {
      $filters.trigger('change');
    }
  }

  function saveFiltersToURL() {
    var values = filterValues();
    var queryString = new URLSearchParams(values);
    var url = location.pathname;
    if(Object.keys(values).length > 0) {
      url = url + '?' + queryString.toString();
    }
    url = url + location.hash;
    history.replaceState({}, "", url)
  }

  // Parse the data from the DOM
  countries = parseCountries($countries);

  // Initialise the jvector map
  $map.vectorMap({
    map: 'world_merc',
    zoomOnScroll: false,
    panOnDrag: true,
    backgroundColor: '#fefefe',
    regionStyle: {
      initial: {
        fill: '#DCDCDC',
        stroke: '#fefefe',
        'stroke-width': 1
      }
    },
    markerStyle: {
      initial: {
        fill: '#B20F47',
        stroke: '#fefefe',
        'stroke-width': 1
      }
    },
    markers: countryMarkers(countries),
    series: {
      regions: [
        {
          values: countryCommitmentLevels(countries),
          attribute: 'fill',
          scale: ['#DCDCDC', '#3596f2', '#31408c'],
          min: 0,
          max: 2
        }
      ],
    },
    // Disable jvectormap tooltips, we'll use our own library for them
    onRegionTipShow: function(e) { e.preventDefault(); },
    onMarkerTipShow: function(e) { e.preventDefault(); },
    onRegionClick: regionClick,
    onMarkerClick: markerClick
  });

  map = $map.vectorMap('get', 'mapObject');

  // Wire up tooltips
  buildTooltips(countries);

  // Wire up filters to hide/show map countries and cards
  $filters.on('change', function() {
    filterBySelections();
    saveFiltersToURL();
  });

  // Hide the see all countries button and wire up clicks on it for future use
  $allCountriesButton.click(function(e) {
    e.preventDefault();
    clearSelectedCountry();
    return false;
  });

  // Wire up clicks on the map to clear selected countries
  $map.find('svg').on('click', function(e) {
    // We only want clicks on the svg, not on things (e.g. paths) inside it, as
    // those will be regions/markers whose clicks are handled separately
    if(e.target === e.currentTarget) {
      clearSelectedCountry();
    }
  });

  // Add a 'back-to-map' link to each country
  $countries.each(function(index, country) {
    $(country)
      .find('.country-footer')
      .append('<a class="button primary" href="#map">Back to map</a>')
  });

  // Have we got an initial selection or filters? We process both, even if we're
  // going to overwrite filters with a hash, so that we can set up the map for
  // if/when the user removes the country selection
  if(location.search) {
    setFiltersFromURL();
  }

  if(location.hash) {
    var iso2 = location.hash.substr(1);
    selectCountry(iso2);
  }
});

// 4. Resources page
// TODO - this is copy-pasted from the map filters
// with some improvements - make it generic and use the same code for both
// filters if we do any more work on this
$(function(){
  var $resources = $('.resource');
  if($resources.length == 0) {
    return;
  }

  var $filters = $('.resource-filters select');

  function selectedFilters() {
    var values = {};
    $filters.each(function(index, select) {
      var value = $(select).val();
      if(value !== '') {
        fType = $(select).attr('name');
        values[fType] = value;
      }
    });
    return values;
  }

  function filterBySelections() {
    var selected = selectedFilters();
    if(Object.values(selected).length === 0) {
      filterResources();
    } else {
      filterResources(selected);
    }
  }

  function filterResources(filter) {
    // Work out what we're showing
    var $filteredResources = $resources;
    if(filter) {
      // We AND together multiple filters so join them into one string:
      // https://api.jquery.com/multiple-attribute-selector/
      var filters = '';
      for (var filterType in filter) {
        filters = filters + '.resource-' + filterType + '-' + filter[filterType];
      }
      console.log('Filtering resources: ' + filters);
      $filteredResources = $filteredResources.filter(filters);
    }
    $resources.hide();
    $filteredResources.show();
  }

  function setFiltersFromURL() {
    var urlParams = new URLSearchParams(location.search.substr(1));
    urlParams.forEach(function(value, key) {
      $filters
        .filter('[name="' + key + '"]')
        .find('option[value="' + value + '"]')
        .prop('selected', true)
        .trigger('change');
    });

    // If a topic has been selected, display notice
    var selectedTopic = $('#topics-filter');
    if (selectedTopic.val() != "") {
      $('#topics-filter-selected').text(selectedTopic.find('option[value="' + selectedTopic.val() + '"]').text());
      $('#topics-filter-selected-notice').removeClass('hide').show();
    }
    
  }

  function saveFiltersToURL() {
    var values = selectedFilters();
    var queryString = new URLSearchParams(values);
    var url = location.pathname;
    if(Object.keys(values).length > 0) {
      url = url + '?' + queryString.toString();
    }
    url = url + location.hash;
    history.replaceState({}, "", url)
  }

  function toggleNoDataMessages() {
    $('.no-resources-message').hide();
    if($('.resources .resource:visible').length === 0) {
      $('.resources .no-resources-message').show();
    }
  }

  // Wire up filters to hide/show map countries and cards
  $filters.on('change', function() {
    filterBySelections();
    toggleNoDataMessages();
    saveFiltersToURL();
  });

  // Have we got an initial selection or filters? We process both, even if we're
  // going to overwrite filters with a hash, so that we can set up the map for
  // if/when the user removes the country selection
  if(location.search) {
    setFiltersFromURL();
  }
});



// 3. Mailchimp signup modal
// -------------------------
var mc_modal_debug = false; // MUST BE FALSE IN PRODUCTION!

var mc_modal_delay;
var mc_modal_expiry;

var mc_modal_enabled = true;

var mc_modal_stopped;
var mc_modal_asked;
var mc_modal_subscribed;

// Global pointer to modal element
var mc_modal;

$(function(){
  // Define here only after document is ready to ensure element exists in DOM
  mc_modal = $('#mc_embed_signup');
  
  // Check to see if there is an #mc_embed_signup element
  // If not, stop here
  if (!mc_modal.length) { return; }
  
  // Expire stored settings
  store.removeExpiredKeys();

  // Check to see if active settings are stored
  store.defaults({
    mc_modal_asked: false,
    mc_modal_subscribed: false,
    mc_modal_stopped: false
  });
  mc_modal_stopped = store.get('mc_modal_stopped');
  console.log('Has user said "Don\'t ask again"? ' + mc_modal_stopped);

  // Add close buttons to the modal
  mc_modal.prepend('<div id="mc_modal_closegroup"><button class="close-button" data-close aria-label="Close modal" type="button"><span aria-hidden="true">&times;</span></button><label for="mc_modal_stop" id="mc_modal_stop_label"><input id="mc_modal_stop" type="checkbox" /> Don\'t show again</label></div>');
  // "Don't show again" checkbox
  $('#mc_modal_stop').prop('checked', mc_modal_stopped);
  $('#mc_modal_stop').change(function() {
    store.set('mc_modal_stopped', this.checked);
  });

  // Make the manual open button open the modal
  $('#mc_modal_open').click(function(event) {
    event.preventDefault();
    mc_modal_open(true);
    return false;
  });

  // Capture subscription event
  $('#mc-embedded-subscribe-form').submit(function(event) {
    // Now the user has subscribed, don't popup ever again
    store.set('mc_modal_subscribed', true); // No expiry
    // Close the modal
    mc_modal.foundation('close');
    // Ensure the form actually submits
    return true;
  });

  // Modal setup function below actually fired by GTM (so controllable outside of this script)
  console.log('Awaiting GTM to trigger modal setup...');
  dataLayer.push({'event': 'mc_embed_signup_popup_ready'});

});

// Setup modal
// This function to be called by GTM, triggered by event above
function mc_modal_setup() {
  // Load settings
  mc_modal_asked = store.get('mc_modal_asked');
  console.log('Has user been asked to subscribe in last ' + mc_modal_expiry + ' days? ' + mc_modal_asked);
  mc_modal_subscribed = store.get('mc_modal_subscribed');
  console.log('Has user subscribed? ' + mc_modal_subscribed);

  // If the user hasn't been asked to subscribe, and isn't in fact subscribed
  // Then popup may be shown
  if (mc_modal_debug || (mc_modal_asked != true && mc_modal_subscribed != true && mc_modal_stopped != true)) {
    if (mc_modal_debug) { console.log('Debug mode.'); }
    console.log('Popup triggers will be enabled after ' + mc_modal_delay + 's delay.');
    // Enable triggers after a delay
    setTimeout(
      function() {
        if (mc_modal_enabled == true) {
          // Enable popup triggers only if it hasn't been explicitly disabled before the delay is over, e.g. because user manually opened it
          mc_modal_enable();
        }
      },
      // Set the delay here
      1000 * mc_modal_delay
    );
  } else {
    console.log('Popup will not be shown.');
  }
}

// Helper functions

// Enable popup triggers (multiple triggers)
function mc_modal_enable() {
  mc_modal_enabled = true; // Should already be true
  $(window).on("scroll", mc_modal_trigger_scroll);
  $.exitIntent('enable');
  $(document).on('exitintent', mc_modal_trigger_exit);
  console.log('Popup triggers enabled.');
}

// Disable popup triggers
function mc_modal_disable() {
  mc_modal_enabled = false; // Once it's been opened, it will never pop open again
  $(window).off("scroll", mc_modal_trigger_scroll);
  $.exitIntent('disable');
  $(document).off('exitintent', mc_modal_trigger_exit);
  console.log('Popup triggers disabled.');
}

// Modal trigger: user scrolls up
var lastScrollTop = 0;
function mc_modal_trigger_scroll() {
  var st = window.pageYOffset || document.documentElement.scrollTop;
  if (st < lastScrollTop) {
    if (st < (lastScrollTop - 100)) {
      // User has just scrolled up by more than 100px
      mc_modal_open();
    }
  } else {
    lastScrollTop = st <= 0 ? 0 : st;
  }
}

// Modal trigger: exit intent
function mc_modal_trigger_exit() {
  mc_modal_open();
}

// Open the modal
function mc_modal_open(manual = false) {
  mc_modal_disable();
  $('#mc_modal_stop_label').toggle(!manual); // Don't show "Don't ask again" if it was opened manually
  mc_modal.foundation('open');
  // Popup has appeared; the user has been asked to subscribe
  var expiration = new Date().getTime() + (1000 * 60 * 60 * 24 * mc_modal_expiry); // Store this for X days
  store.set('mc_modal_asked', true, expiration);
  // Send events to GTM
  if (manual) {
    dataLayer.push({'event': 'mc_embed_signup_popup_click'});
  } else {
    dataLayer.push({'event': 'mc_embed_signup_popup_appear'});
  }
}