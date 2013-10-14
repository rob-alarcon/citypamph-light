/**
* Start citypamph Namespace
*
* @class citypamph
*
**/
var citypamph;

if (typeof citypamph === 'undefined') {
    citypamph = { 
    };
}

/**
* Start citypamph index Namespace
*
* @class citypamph.index
* @namespace citypamph
*
* @param $ jQuery framework 
*
**/
citypamph.index = (function($) {

    // ==========================================
    // PRIVATE VARIABLES
    // ==========================================

    /**
    * Holds a reference to the auth object needed by the yelp api to 
    * access their data
    */
    var _auth = { 
        // [TODO]: get the following keys from server
        consumerKey: "_gRJbmQgFEHL7isGhwyj9Q", 
        consumerSecret: "Z3vdLh8EtWPiPXR4T9TdC5AbTb8",
        accessToken: "Yqtsj5UKlHkMUAN8yQNZO1NSdWMaCLGP",
        // [TODO]: fix the following
        // This example is a proof of concept, for how to use the Yelp v2 API with javascript.
        // You wouldn't actually want to expose your access token secret like this in a real application.
        accessTokenSecret: "n8e9mksXg9suWwTg4C5joJplqus",
        serviceProvider: { 
            signatureMethod: "HMAC-SHA1"
        }
    };

    /**
    * Holds an static reference to the categories that the search will return,
    * (right now we're just returning the 'food' category)
    * [TODO]: return more terms (require to modify the UI see mockup)
    */
    var _terms = 'Restaurants';

    /**
    * Holds an static reference to the accessor object needed to create the 
    * yelp OAuth signature 
    */
    var _accessor = {
        consumerSecret: _auth.consumerSecret,
        tokenSecret: _auth.accessTokenSecret
    };

    /**
    * Array that contains the parameters that will be sent to the yelp api
    * 
    */
    var _parameters = [];

    /**
    * Yelp api message
    * 
    */
    var _message = { 
        'action': 'http://api.yelp.com/v2/search',
        'method': 'GET'
    };

    /**
    * Yelp api specialized object, this is the map that will be sent to the
    * yelp api
    * 
    */
    var _parameterMap;

    /**
    * Results limit
    * 
    */
    var _limit = 9;

    /**
    * offset for paging
    * 
    */
    var _offset = 0;

    /**
    * Yelp API Sort (2 === 'Highest Rated')
    * 
    */
    var _resultsSort = 2;

    var _vm;

    var _termToSearch = "";

    /**
    * flag that determines if the search is new for a given city
    * 
    */
    var _isNewSearch = true;
    
    // ==========================================
    // CALLBACKS
    // ==========================================

    // handle the city search button click 
    var __handleSearchCityClick = function(event) {

        if($('#js-txt-location').val() === "") {
            return false;
        }

        if(_termToSearch === "" || _termToSearch !== $('#js-txt-location').val()) {
            _termToSearch = $('#js-txt-location').val();
            _isNewSearch = true;
            // reset offset
            _limit = 9;
            _offset = 0;
        } else {
            // increment the offset
            // add more offset to get more results for the paging
            _offset = _offset + _limit; 

            _isNewSearch = false;
        }
        console.log(_limit)
        console.log(_offset)
        _parameters = [];
        _parameters.push(['term', _terms ]);
        _parameters.push(['location', _termToSearch]);
        _parameters.push(['callback', 'cb']);
        _parameters.push(['limit', _limit]);
        _parameters.push(['sort', _resultsSort])
        _parameters.push(['offset', _offset]);
        _parameters.push(['oauth_consumer_key', _auth.consumerKey]);
        _parameters.push(['oauth_consumer_secret', _auth.consumerSecret]);
        _parameters.push(['oauth_token', _auth.accessToken]);
        _parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

        // add the parameters property to the yelp api message with the 
        // _parameters variable value
        _message['parameters'] = _parameters;

        OAuth.setTimestampAndNonce(_message);
        OAuth.SignatureMethod.sign(_message, _accessor);

        _parameterMap = OAuth.getParameterMap(_message.parameters);
        _parameterMap.oauth_signature = OAuth.percentEncode(_parameterMap.oauth_signature)
        
        citypamph.utils.ajax.get(_message.action, _parameterMap,
            'jsonp', 'cp', __handleYelpRequest, __handleYelpRequestError
        );               
    };

    var __handleYelpRequest = function(data, textStats, XMLHttpRequest) {
        if(_isNewSearch) {
            // clean businesses from a previous search
            _vm.businesses.removeAll();
        }
        // fill businesses
        $.each(data.businesses, function(i, business) {
            _vm.businesses.push(ko.mapping.fromJS(business));
        });
    };

    var __handleYelpRequestError = function(error) {
        console.log('error');
        if(console) {
            console.log(error);
        }            
    };

    var __handleLoadMoreItemsHARDCODED_FOR_SINGLE_CATEGORY = function(event) {
        __handleSearchCityClick();
    };

    var __handleHomeRequest = function(event) {
        // prepare everything for a new search
        _isNewSearch = true;

        _offset = 0;

        // clear search textbox
        $("#js-txt-location").val("");

        // remove previous search results
        _vm.businesses.removeAll();
    };

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    // bind the UI elements events
    var _prepareUI = function() {
        // bind the 'search city' button click event
        $('#js-btn-search').click(__handleSearchCityClick);

        // bind 'keypress' to the main search element to aid the user
        // when they write the city name and press enter (as expected)
        $('#js-txt-location')
            .keypress(function(e) {
                if(e.which === 13) { // on enter key
                    __handleSearchCityClick();
                }
            });

        // bind an event for the load more items button for the only category that we have right now.
        $(document).on("click", "#js-load-more-hardcoded", __handleLoadMoreItemsHARDCODED_FOR_SINGLE_CATEGORY);

        // bind brand logo click, regresh the page to the home 
        $(document).on("click", "#js-brand-logo", __handleHomeRequest);
    };

    // initializes the app
    var _init = function() {

        _prepareUI();
        
        _vm = ko.mapping.fromJS(this);

        ko.applyBindings(_vm);
        
        return this;
    };

    return {
        init: _init,

        businesses: []
    };
}(jQuery));  


/**
* Start citypamph utils Namespace
*
* @class citypamph.utils
* @namespace citypamph
*
* @param $ jQuery framework 
*
**/
citypamph.utils = (function($) {

    // ==========================================
    // PRIVATE VARIABLES
    // ==========================================    

    /**
    * make an ajax call using jQuery (simple call without promisses)
    */
    var _get = function(url, data, dataType, jsonpCallback, handler, errorHandler) {
        
        $.ajax({
            'url': url,
            'data': data,
            'cache': true,
            'dataType': dataType,
            'jsonpCallback': jsonpCallback,
            'success': handler,
            'error': errorHandler
        });
    };

    // initializes the app
    var _init = function() {
        return this;
    };

    // api
    return {
        init: _init,
        ajax: {
            get: _get
        }
    };
}(jQuery)).init(); // auto initialize the singleton  
    
    
$(function() {
    // start the application
    citypamph.index.init();

});